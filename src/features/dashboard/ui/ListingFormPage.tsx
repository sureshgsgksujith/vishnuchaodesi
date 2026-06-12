import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createListing, getListing, getListingApiErrorMessage, isListingUpgradeRequired, updateListing, type ListingSummary, type UpsertListingPayload } from "../api/listingsApi";
import { getClassifiedSpecificationFields, getListingCategoryFields, getListingCategoryTree, type ListingCategoryFieldDefinition, type ListingCategoryOption } from "../api/listingCategoriesApi";
import { getMyProfile } from "../api/profileApi";
import { ensureLocationMaster, getLocationCities, getLocationCountries, getLocationStates, type CityOption, type CountryOption, type StateOption } from "../../../shared/api/locationMastersApi";
import { lookupPostalCodeLocation } from "../../../shared/api/postalCodeLookup";
import { getAddressPlaceDetail, searchAddressPredictions } from "../../../shared/api/addressAutocompleteApi";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import DashboardFooter from "../components/DashboardFooter";
import { getMyPlanUsage, getPricingPlans, selectPricingPlan, type PlanUsage, type PricingPlan } from "../../pricing/api/pricingApi";
import { resolveListingImageUrl } from "../utils/listingImages";
import { formatCurrencyAmount, labelWithCountryCurrency } from "../../../shared/utils/currency";
import { fallbackListingCategoryTree, supportedListingCategoryNames } from "../config/listingCategoryTree";
import "../styles/listings.css";

const wizardSteps = [
  { title: "Step 1", label: "Basic Info" },
  { title: "Step 2", label: "Category" },
  { title: "Step 3", label: "Business" },
  { title: "Step 4", label: "Links" },
  { title: "Step 5", label: "Media" },
];

const doneStepIndex = wizardSteps.length;
const supportedListingCategoryNameSet = new Set<string>(supportedListingCategoryNames);
const defaultRealEstatePriceTypeOptions = ["Total Price", "Monthly Rent", "Lease", "Per Sq Ft"];
const saleRealEstatePriceTypeOptions = ["Total Price", "Per Sq Ft"];

const profileImageUploadMarker = "__profileImageFile__";
const coverImageUploadMarker = "__coverImageFile__";
const galleryImageUploadMarkerPrefix = "__galleryFile_";

type ServiceItem = { name: string; imageName: string };
type OfferItem = { name: string; price: string; detail: string; imageName: string; link: string };
type InfoItem = { question: string; answer: string };
type BusinessHour = { day: string; status: string; open: string; close: string; is24Hours: boolean; specialHoursNote: string };
type ContactInfo = { mainPhone: string; alternatePhone: string; tollFree: string; email: string; streetAddress: string; suite: string; zipcode: string; city: string; state: string };
type WebLinks = { mainWebsite: string; displayWebsite: string; iosApp: string; androidApp: string };
type SocialLinks = { facebook: string; instagram: string; twitter: string; linkedin: string; youtube: string };
type PaymentMethods = { creditCard: boolean; cash: boolean; upi: boolean; googlePay: boolean; applePay: boolean; insurance: boolean };
type RestaurantInfo = {
  restaurantName: string;
  businessName: string;
  tagline: string;
  description: string;
  cuisine: string;
  foodTypes: string[];
  foodType: string;
  businessType: string;
  yearEstablished: string;
  staffCount: string;
  serviceTypes: string[];
  serviceRadiusMiles: string;
  averageCostForTwo: string;
  discountsOffers: string;
  couponCodes: string;
  happyHours: string;
  priceRange: string;
  deliveryAvailable: boolean;
  deliveryFee: string;
  minimumOrderValue: string;
  estimatedDeliveryTime: string;
  onlineOrdering: boolean;
  thirdPartyIntegrations: string[];
  amenities: string[];
  foodLicenseNumber: string;
  healthInspectionRating: string;
  alcoholLicenseNumber: string;
  businessRegistrationNumber: string;
  tableBooking: boolean;
  reservationCapacity: string;
  onlineBookingUrl: string;
  orderNow: boolean;
  enableChat: boolean;
  enableCall: boolean;
  cateringType: string;
  minimumGuests: string;
  maximumGuests: string;
  perPlatePricing: string;
  eventTypes: string[];
  mobileLocations: string;
  operatingZones: string;
  bulkOrderNotes: string;
  customOrderOptions: string;
  eventLocationNotes: string;
  ageRestrictedNotice: string;
};
type RestaurantMenuItem = {
  itemName: string;
  menuCategory: string;
  description: string;
  price: string;
  foodType: string;
  spiceLevel: string;
  calories: string;
  imageUrl: string;
  displayOrder: string;
  isAvailable: boolean;
};
type CategoryAttributes = Record<string, string>;
type CategoryAttributeField = {
  key: string;
  label: string;
  isRequired?: boolean;
  sectionName?: string;
  sectionOrder?: number;
  type?: "text" | "number" | "date" | "time" | "checkbox" | "textarea" | "file";
  options?: string[];
};
type CategoryAttributeFieldSet = {
  default: CategoryAttributeField[];
  subCategories?: Record<string, CategoryAttributeField[]>;
  detailedCategories?: Record<string, CategoryAttributeField[]>;
};
type FieldErrors = Record<string, string>;
type GalleryUploadFile = { file: File; marker: string };
type InlineUploadFile = { file: File; marker: string };
type NearbyServices = Record<string, string[]>;
type ListingFormMode = "listing" | "classified";

type ListingDraft = {
  businessHours: BusinessHour[];
  brands: string[];
  categoryAttributes: CategoryAttributes;
  contactInfo: ContactInfo;
  coverImageFile: File | null;
  form: FormState;
  galleryFiles: GalleryUploadFile[];
  infoItems: InfoItem[];
  offers: OfferItem[];
  offerFiles: InlineUploadFile[];
  paymentMethods: PaymentMethods;
  products: string[];
  profileImageFile: File | null;
  restaurantInfo: RestaurantInfo;
  restaurantMenuItems: RestaurantMenuItem[];
  sellerName: string;
  services: ServiceItem[];
  serviceFiles: InlineUploadFile[];
  socialLinks: SocialLinks;
  webLinks: WebLinks;
};

type ListingPricingState = {
  pendingListingDraft?: ListingDraft;
  pricingConfirmed?: boolean;
};

type FormState = {
  title: string;
  mobileNumber: string;
  email: string;
  whatsapp: string;
  website: string;
  address: string;
  countryId: number | null;
  stateId: number | null;
  cityId: number | null;
  country: string;
  state: string;
  city: string;
  pincode: string;
  categoryName: string;
  subCategory: string;
  detailCategory: string;
  description: string;
  businessDescription: string;
  profileImageName: string;
  coverImageName: string;
  serviceLocations: string;
  listingVideo: string;
  galleryMedia: string[];
  propertyType: string;
  bhk: string;
  bathrooms: string;
  balconies: string;
  furnishingType: string;
  superBuiltUpArea: string;
  carpetArea: string;
  floorNumber: string;
  totalFloors: string;
  propertyAge: string;
  availabilityType: string;
  availabilityDate: string;
  plotArea: string;
  length: string;
  breadth: string;
  boundaryWall: string;
  facing: string;
  approvalType: string;
  roadWidth: string;
  area: string;
  washrooms: string;
  parking: string;
  suitableFor: string;
  roomType: string;
  genderPreference: string;
  foodIncluded: string;
  pgAmenities: string;
  price: string;
  priceNegotiable: string;
  maintenanceCharges: string;
  securityDeposit: string;
  pricePerSqFt: string;
  loanEligible: boolean;
  sellerType: string;
  reraNumber: string;
  ownershipType: string;
  latitude: string;
  longitude: string;
  adType: string;
  adDurationDays: string;
  autoRenew: boolean;
  metaTitle: string;
  metaDescription: string;
  amenityParking: boolean;
  amenityLift: boolean;
  amenityPowerBackup: boolean;
  amenitySecurity: boolean;
  amenityGym: boolean;
  amenityCctv: boolean;
  amenitySwimmingPool: boolean;
  amenityGarden: boolean;
  amenityChildrensPlayArea: boolean;
};

type BooleanFormField = {
  [Key in keyof FormState]: FormState[Key] extends boolean ? Key : never;
}[keyof FormState];
type StringFormField = {
  [Key in keyof FormState]: FormState[Key] extends string ? Key : never;
}[keyof FormState];

const initialForm: FormState = {
  title: "",
  mobileNumber: "",
  email: "",
  whatsapp: "",
  website: "",
  address: "",
  countryId: null,
  stateId: null,
  cityId: null,
  country: "",
  state: "",
  city: "",
  pincode: "",
  categoryName: "",
  subCategory: "",
  detailCategory: "",
  description: "",
  businessDescription: "",
  profileImageName: "",
  coverImageName: "",
  serviceLocations: "",
  listingVideo: "",
  galleryMedia: [],
  propertyType: "",
  bhk: "",
  bathrooms: "",
  balconies: "",
  furnishingType: "",
  superBuiltUpArea: "",
  carpetArea: "",
  floorNumber: "",
  totalFloors: "",
  propertyAge: "",
  availabilityType: "",
  availabilityDate: "",
  plotArea: "",
  length: "",
  breadth: "",
  boundaryWall: "",
  facing: "",
  approvalType: "",
  roadWidth: "",
  area: "",
  washrooms: "",
  parking: "",
  suitableFor: "",
  roomType: "",
  genderPreference: "",
  foodIncluded: "",
  pgAmenities: "",
  price: "",
  priceNegotiable: "Negotiable",
  maintenanceCharges: "",
  securityDeposit: "",
  pricePerSqFt: "",
  loanEligible: false,
  sellerType: "Owner",
  reraNumber: "",
  ownershipType: "",
  latitude: "",
  longitude: "",
  adType: "Free",
  adDurationDays: "30",
  autoRenew: false,
  metaTitle: "",
  metaDescription: "",
  amenityParking: false,
  amenityLift: false,
  amenityPowerBackup: false,
  amenitySecurity: false,
  amenityGym: false,
  amenityCctv: false,
  amenitySwimmingPool: false,
  amenityGarden: false,
  amenityChildrensPlayArea: false,
};

const defaultBusinessHours: BusinessHour[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
].map((day) => ({ day, status: "Open", open: "", close: "", is24Hours: false, specialHoursNote: "" }));

const initialContactInfo: ContactInfo = {
  mainPhone: "",
  alternatePhone: "",
  tollFree: "",
  email: "",
  streetAddress: "",
  suite: "",
  zipcode: "",
  city: "",
  state: "",
};

const initialWebLinks: WebLinks = {
  mainWebsite: "",
  displayWebsite: "",
  iosApp: "",
  androidApp: "",
};

const initialSocialLinks: SocialLinks = {
  facebook: "",
  instagram: "",
  twitter: "",
  linkedin: "",
  youtube: "",
};

const initialPaymentMethods: PaymentMethods = {
  creditCard: false,
  cash: false,
  upi: false,
  googlePay: false,
  applePay: false,
  insurance: false,
};

const initialRestaurantInfo: RestaurantInfo = {
  restaurantName: "",
  businessName: "",
  tagline: "",
  description: "",
  cuisine: "",
  foodTypes: [],
  foodType: "",
  businessType: "",
  yearEstablished: "",
  staffCount: "",
  serviceTypes: [],
  serviceRadiusMiles: "",
  averageCostForTwo: "",
  discountsOffers: "",
  couponCodes: "",
  happyHours: "",
  priceRange: "",
  deliveryAvailable: false,
  deliveryFee: "",
  minimumOrderValue: "",
  estimatedDeliveryTime: "",
  onlineOrdering: false,
  thirdPartyIntegrations: [],
  amenities: [],
  foodLicenseNumber: "",
  healthInspectionRating: "",
  alcoholLicenseNumber: "",
  businessRegistrationNumber: "",
  tableBooking: false,
  reservationCapacity: "",
  onlineBookingUrl: "",
  orderNow: false,
  enableChat: true,
  enableCall: true,
  cateringType: "",
  minimumGuests: "",
  maximumGuests: "",
  perPlatePricing: "",
  eventTypes: [],
  mobileLocations: "",
  operatingZones: "",
  bulkOrderNotes: "",
  customOrderOptions: "",
  eventLocationNotes: "",
  ageRestrictedNotice: "",
};

const initialRestaurantMenuItem: RestaurantMenuItem = {
  itemName: "",
  menuCategory: "",
  description: "",
  price: "",
  foodType: "",
  spiceLevel: "",
  calories: "",
  imageUrl: "",
  displayOrder: "1",
  isAvailable: true,
};

const commonConditionOptions = ["New", "Like New", "Good", "Fair", "Needs Repair"];
const yesNoOptions = ["Yes", "No"];
const restaurantServiceTypeOptions = [
  { key: "dine_in", label: "Dine-In" },
  { key: "takeaway", label: "Takeaway" },
  { key: "delivery_available", label: "Delivery" },
  { key: "catering_available", label: "Catering" },
  { key: "reservations_accepted", label: "Reservations Accepted" },
];
const vehicleConditionOptions = ["New", "Used", "Certified Pre-Owned"];
const vehicleFuelOptions = ["Gasoline", "Diesel", "Hybrid", "Electric"];
const vehicleBrandOptions = ["Acura", "Audi", "BMW", "Chevrolet", "Dodge", "Ford", "GMC", "Honda", "Hyundai", "Jeep", "Kia", "Lexus", "Mercedes-Benz", "Nissan", "Subaru", "Tesla", "Toyota", "Volkswagen", "Yamaha", "Harley-Davidson", "Royal Enfield", "Other"];
const transmissionOptions = ["Automatic", "Manual"];
const vehicleDriveTypeOptions = ["FWD", "AWD", "4WD"];
const listingTypeOptions = ["Free", "Featured", "Premium"];
const vehiclePriceNegotiableOptions = ["Yes", "No"];
const nearbyServiceTypes = ["Schools", "Groceries", "Hospitals", "Beauty Salons", "Restaurants", "Lawyers"];
const nearbyServicesAttributeKey = "nearby_services";
const furnitureCategoryNames = ["Furniture & Home", "Furniture & Home Decor"];
const sharedListingLocationCategories = [
  "Vehicles",
  "Care Services",
  "Events & Tickets",
  "Tickets & Events",
  "Roommates & Rentals",
  "Jobs",
  "Electronics & Appliances",
  "Pets & Animals",
  "Furniture & Home",
  "Furniture & Home Decor",
  "Fashion & Lifestyle",
  "Books, Sports & Hobbies",
  "Business & Industrial",
];
const usaDefaultLocationCategories = ["Real Estate", "Restaurants & Food", ...sharedListingLocationCategories];

function isElectronicsCategoryName(categoryName: string) {
  const normalizedCategory = normalizeFieldKey(categoryName);
  return normalizedCategory === "electronicsappliances" ||
    normalizedCategory === "electronicsandappliances" ||
    normalizedCategory === "electronics";
}

const furnitureConditionOptions = ["New", "Like New", "Good", "Fair", "Salvage"];
const furnitureMaterialOptions = ["Wood", "Metal", "Plastic", "Glass", "Fabric", "Leather"];
const furniturePostingCommonFields: CategoryAttributeField[] = [
  { key: "brand", label: "Brand", sectionName: "Item Details", sectionOrder: 2 },
  { key: "product_name_model", label: "Product Name / Model", sectionName: "Item Details", sectionOrder: 2 },
  { key: "condition", label: "Condition", options: furnitureConditionOptions, isRequired: true, sectionName: "Item Details", sectionOrder: 2 },
  { key: "material", label: "Material", options: furnitureMaterialOptions, isRequired: true, sectionName: "Item Details", sectionOrder: 2 },
  { key: "color_finish", label: "Color / Finish", isRequired: true, sectionName: "Item Details", sectionOrder: 2 },
  { key: "age_of_item", label: "Age of Item", options: ["< 6 months", "6-12 months", "1-3 yrs", "3+ yrs"], isRequired: true, sectionName: "Item Details", sectionOrder: 2 },
  { key: "quantity", label: "Quantity", type: "number", isRequired: true, sectionName: "Item Details", sectionOrder: 2 },
  { key: "length_inches", label: "Length (inches)", type: "number", isRequired: true, sectionName: "Dimensions & Specifications", sectionOrder: 3 },
  { key: "width_inches", label: "Width (inches)", type: "number", isRequired: true, sectionName: "Dimensions & Specifications", sectionOrder: 3 },
  { key: "height_inches", label: "Height (inches)", type: "number", isRequired: true, sectionName: "Dimensions & Specifications", sectionOrder: 3 },
  { key: "weight_lbs", label: "Weight (lbs)", type: "number", sectionName: "Dimensions & Specifications", sectionOrder: 3 },
  { key: "assembly_required", label: "Assembly Required", options: yesNoOptions, isRequired: true, sectionName: "Dimensions & Specifications", sectionOrder: 3 },
  { key: "assembly_included", label: "Assembly Included", options: yesNoOptions, sectionName: "Dimensions & Specifications", sectionOrder: 3 },
  { key: "price", label: "Price (USD)", type: "number", isRequired: true, sectionName: "Price & Sale Details", sectionOrder: 5 },
  { key: "price_negotiable", label: "Price Negotiable", options: yesNoOptions, isRequired: true, sectionName: "Price & Sale Details", sectionOrder: 5 },
  { key: "original_price", label: "Original Price", type: "number", sectionName: "Price & Sale Details", sectionOrder: 5 },
  { key: "reason_for_selling", label: "Reason for Selling", type: "textarea", sectionName: "Price & Sale Details", sectionOrder: 5 },
  { key: "pickup_location", label: "Pickup Location (lat-long)", sectionName: "Delivery & Logistics", sectionOrder: 7 },
  { key: "pickup_only", label: "Pickup Only", options: yesNoOptions, isRequired: true, sectionName: "Delivery & Logistics", sectionOrder: 7 },
  { key: "delivery_available", label: "Delivery Available", options: yesNoOptions, isRequired: true, sectionName: "Delivery & Logistics", sectionOrder: 7 },
  { key: "delivery_charges", label: "Delivery Charges", type: "number", sectionName: "Delivery & Logistics", sectionOrder: 7 },
  { key: "shipping_available", label: "Shipping Available", options: yesNoOptions, sectionName: "Delivery & Logistics", sectionOrder: 7 },
  { key: "assembly_service", label: "Assembly Service", options: yesNoOptions, sectionName: "Delivery & Logistics", sectionOrder: 7 },
  { key: "pet_free_home", label: "Pet-Free Home", type: "checkbox", sectionName: "Features / Highlights", sectionOrder: 8 },
  { key: "smoke_free_home", label: "Smoke-Free Home", type: "checkbox", sectionName: "Features / Highlights", sectionOrder: 8 },
  { key: "scratch_free", label: "No Damage / Scratch-Free", type: "checkbox", sectionName: "Features / Highlights", sectionOrder: 8 },
  { key: "recently_purchased", label: "Recently Purchased", type: "checkbox", sectionName: "Features / Highlights", sectionOrder: 8 },
  { key: "custom_made", label: "Custom Made", type: "checkbox", sectionName: "Features / Highlights", sectionOrder: 8 },
  { key: "eco_friendly", label: "Eco-Friendly", type: "checkbox", sectionName: "Features / Highlights", sectionOrder: 8 },
  { key: "video_url", label: "Video URL", sectionName: "Media Upload", sectionOrder: 9 },
  { key: "seller_type", label: "Seller Type", options: ["Owner", "Dealer", "Store"], isRequired: true, sectionName: "Seller Information", sectionOrder: 10 },
  { key: "ad_type", label: "Ad Type", options: listingTypeOptions, sectionName: "Listing Settings", sectionOrder: 11 },
  { key: "ad_duration_days", label: "Ad Duration", options: ["7", "15", "30"], sectionName: "Listing Settings", sectionOrder: 11 },
  { key: "auto_renew", label: "Auto-renew", options: yesNoOptions, sectionName: "Listing Settings", sectionOrder: 11 },
];

const vehicleCoreFields: CategoryAttributeField[] = [
  { key: "listing_title", label: "Listing Title", isRequired: true, sectionName: "Vehicle Information", sectionOrder: 1 },
  { key: "brand", label: "Vehicle Brand / Make", options: vehicleBrandOptions, isRequired: true, sectionName: "Vehicle Information", sectionOrder: 1 },
  { key: "model", label: "Model", isRequired: true, sectionName: "Vehicle Information", sectionOrder: 1 },
  { key: "variant", label: "Variant / Trim", sectionName: "Vehicle Information", sectionOrder: 1 },
  { key: "yearOfManufacture", label: "Year", type: "number", isRequired: true, sectionName: "Vehicle Information", sectionOrder: 1 },
  { key: "description", label: "Description", type: "textarea", isRequired: true, sectionName: "Vehicle Information", sectionOrder: 1 },
  { key: "kilometersDriven", label: "Mileage (miles)", type: "number", isRequired: true, sectionName: "Vehicle Specifications", sectionOrder: 2 },
  { key: "fuelType", label: "Fuel Type", options: vehicleFuelOptions, isRequired: true, sectionName: "Vehicle Specifications", sectionOrder: 2 },
  { key: "transmission", label: "Transmission", options: transmissionOptions, isRequired: true, sectionName: "Vehicle Specifications", sectionOrder: 2 },
  { key: "driveType", label: "Drive Type", options: vehicleDriveTypeOptions, sectionName: "Vehicle Specifications", sectionOrder: 2 },
  { key: "engineCapacity", label: "Engine Capacity", type: "number", sectionName: "Vehicle Specifications", sectionOrder: 2 },
  { key: "horsepower", label: "Horsepower", type: "number", sectionName: "Vehicle Specifications", sectionOrder: 2 },
  { key: "color", label: "Exterior Color", isRequired: true, sectionName: "Vehicle Specifications", sectionOrder: 2 },
  { key: "interiorColor", label: "Interior Color", sectionName: "Vehicle Specifications", sectionOrder: 2 },
  { key: "vehicleCondition", label: "Condition", options: vehicleConditionOptions, isRequired: true, sectionName: "Vehicle Condition & Ownership", sectionOrder: 5 },
  { key: "ownershipTypeVehicle", label: "Ownership Type", options: ["Owner", "Dealer"], sectionName: "Vehicle Condition & Ownership", sectionOrder: 5 },
  { key: "ownerCount", label: "Number of Owners", type: "number", sectionName: "Vehicle Condition & Ownership", sectionOrder: 5 },
  { key: "accidentHistory", label: "Accident History", options: yesNoOptions, sectionName: "Vehicle Condition & Ownership", sectionOrder: 5 },
  { key: "cleanTitle", label: "Clean Title", options: yesNoOptions, sectionName: "Vehicle Condition & Ownership", sectionOrder: 5 },
  { key: "vin", label: "VIN Number (optional/private)", sectionName: "Vehicle Condition & Ownership", sectionOrder: 5 },
  { key: "registrationStatus", label: "Registration Status", sectionName: "Legal & Compliance", sectionOrder: 16 },
  { key: "emissionsTestPassed", label: "Emissions Test Passed", options: yesNoOptions, sectionName: "Legal & Compliance", sectionOrder: 16 },
  { key: "titleStatus", label: "Title Status", options: ["Clean", "Salvage", "Rebuilt"], sectionName: "Legal & Compliance", sectionOrder: 16 },
  { key: "dealerLicenseNumber", label: "Dealer License Number", sectionName: "Legal & Compliance", sectionOrder: 16 },
];

const vehiclePriceFields: CategoryAttributeField[] = [
  { key: "price", label: "Price (USD)", type: "number", isRequired: true, sectionName: "Pricing", sectionOrder: 4 },
  { key: "price_negotiable", label: "Negotiable", options: vehiclePriceNegotiableOptions, sectionName: "Pricing", sectionOrder: 4 },
  { key: "financing_available", label: "Financing Available", options: yesNoOptions, sectionName: "Pricing", sectionOrder: 4 },
  { key: "lease_option", label: "Lease Option", options: yesNoOptions, sectionName: "Pricing", sectionOrder: 4 },
];

const vehicleDocumentFields: CategoryAttributeField[] = [
  { key: "warrantyAvailable", label: "Warranty Available", options: yesNoOptions, sectionName: "Insurance & Warranty", sectionOrder: 6 },
  { key: "insuranceIncluded", label: "Insurance Included", options: yesNoOptions, sectionName: "Insurance & Warranty", sectionOrder: 6 },
  { key: "extendedWarranty", label: "Extended Warranty", sectionName: "Insurance & Warranty", sectionOrder: 6 },
];

const vehicleAvailabilityFields: CategoryAttributeField[] = [
  { key: "availability_status", label: "Availability Status", options: ["Available", "Sold", "Reserved"], sectionName: "Availability & Scheduling", sectionOrder: 14 },
  { key: "schedule_test_drive", label: "Schedule Test Drive", options: yesNoOptions, sectionName: "Availability & Scheduling", sectionOrder: 14 },
  { key: "preferred_contact_time", label: "Preferred Contact Time", sectionName: "Availability & Scheduling", sectionOrder: 14 },
];

const vehicleFeatureFields: CategoryAttributeField[] = [
  { key: "sunroof", label: "Sunroof", type: "checkbox", sectionName: "Features & Amenities", sectionOrder: 7 },
  { key: "leatherSeats", label: "Leather Seats", type: "checkbox", sectionName: "Features & Amenities", sectionOrder: 7 },
  { key: "navigationSystem", label: "Navigation System", type: "checkbox", sectionName: "Features & Amenities", sectionOrder: 7 },
  { key: "bluetooth", label: "Bluetooth", type: "checkbox", sectionName: "Features & Amenities", sectionOrder: 7 },
  { key: "backupCamera", label: "Backup Camera", type: "checkbox", sectionName: "Features & Amenities", sectionOrder: 7 },
  { key: "heatedSeats", label: "Heated Seats", type: "checkbox", sectionName: "Features & Amenities", sectionOrder: 7 },
  { key: "appleCarplayAndroidAuto", label: "Apple CarPlay / Android Auto", type: "checkbox", sectionName: "Features & Amenities", sectionOrder: 7 },
  { key: "parkingSensors", label: "Parking Sensors", type: "checkbox", sectionName: "Features & Amenities", sectionOrder: 7 },
  { key: "remoteStart", label: "Remote Start", type: "checkbox", sectionName: "Features & Amenities", sectionOrder: 7 },
];

const vehiclePostingCommonFields: CategoryAttributeField[] = [
  ...vehicleCoreFields,
  ...vehiclePriceFields,
  ...vehicleDocumentFields,
  ...vehicleFeatureFields,
  ...vehicleAvailabilityFields,
];

const electronicsConditionOptions = ["New", "Open Box", "Refurbished", "Used"];
const electronicsBrandOptions = ["Apple", "Samsung", "LG", "Sony", "Dell", "HP", "Lenovo", "Asus", "Acer", "Canon", "Nikon", "Bose", "JBL", "Nintendo", "Microsoft", "Whirlpool", "GE", "Dyson", "TP-Link", "Netgear", "Other"];

const electronicsPostingCommonFields: CategoryAttributeField[] = [
  { key: "listing_title", label: "Listing Title", isRequired: true, sectionName: "Product Information", sectionOrder: 2 },
  { key: "product_name", label: "Product Name", isRequired: true, sectionName: "Product Information", sectionOrder: 2 },
  { key: "description", label: "Description", type: "textarea", isRequired: true, sectionName: "Product Information", sectionOrder: 2 },
  { key: "condition", label: "Condition", options: electronicsConditionOptions, isRequired: true, sectionName: "Product Condition", sectionOrder: 3 },
  { key: "seller_type", label: "Ownership", options: ["Individual Seller", "Dealer / Retailer"], isRequired: true, sectionName: "Product Condition", sectionOrder: 3 },
  { key: "purchase_date", label: "Purchase Date", type: "date", sectionName: "Product Condition", sectionOrder: 3 },
  { key: "usageDuration", label: "Usage Duration", sectionName: "Product Condition", sectionOrder: 3 },
  { key: "condition_notes", label: "Condition Notes", type: "textarea", sectionName: "Product Condition", sectionOrder: 3 },
  { key: "price", label: "Selling Price (USD)", type: "number", isRequired: true, sectionName: "Pricing Information", sectionOrder: 4 },
  { key: "original_price", label: "Original Price", type: "number", sectionName: "Pricing Information", sectionOrder: 4 },
  { key: "price_negotiable", label: "Negotiable", options: yesNoOptions, sectionName: "Pricing Information", sectionOrder: 4 },
  { key: "warranty", label: "Warranty Available", options: yesNoOptions, isRequired: true, sectionName: "Pricing Information", sectionOrder: 4 },
  { key: "brand", label: "Brand", options: electronicsBrandOptions, isRequired: true, sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "modelNameNumber", label: "Model", isRequired: true, sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "color", label: "Color", sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "dimensions", label: "Dimensions", sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "weight", label: "Weight", sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "area_locality", label: "Pickup Area / Locality", sectionName: "Location Information", sectionOrder: 5 },
  { key: "map_lat_long", label: "Map Location (lat/long)", sectionName: "Location Information", sectionOrder: 5 },
  { key: "pickup_available", label: "Pickup Available", options: yesNoOptions, sectionName: "Location Information", sectionOrder: 5 },
  { key: "shipping_available", label: "Shipping Available", options: yesNoOptions, sectionName: "Location Information", sectionOrder: 5 },
  { key: "manufacturer_warranty", label: "Manufacturer Warranty", options: yesNoOptions, sectionName: "Warranty & Service", sectionOrder: 6 },
  { key: "extended_warranty", label: "Extended Warranty", options: yesNoOptions, sectionName: "Warranty & Service", sectionOrder: 6 },
  { key: "warranty_expiry_date", label: "Warranty Expiry Date", type: "date", sectionName: "Warranty & Service", sectionOrder: 6 },
  { key: "service_history", label: "Service History", type: "textarea", sectionName: "Warranty & Service", sectionOrder: 6 },
  { key: "product_video_url", label: "Product Videos", sectionName: "Media Upload", sectionOrder: 7 },
  { key: "invoice_upload", label: "Invoice Upload", type: "file", sectionName: "Media Upload", sectionOrder: 7 },
  { key: "warranty_card_upload", label: "Warranty Card Upload", type: "file", sectionName: "Media Upload", sectionOrder: 7 },
  { key: "seller_name", label: "Seller Name", isRequired: true, sectionName: "Seller Information", sectionOrder: 8 },
  { key: "phone", label: "Phone", isRequired: true, sectionName: "Seller Information", sectionOrder: 8 },
  { key: "email", label: "Email", isRequired: true, sectionName: "Seller Information", sectionOrder: 8 },
  { key: "store_name", label: "Store Name", sectionName: "Seller Information", sectionOrder: 8 },
  { key: "website", label: "Website", sectionName: "Seller Information", sectionOrder: 8 },
  { key: "local_pickup", label: "Local Pickup", options: yesNoOptions, sectionName: "Delivery & Shipping", sectionOrder: 9 },
  { key: "shipping_available_delivery", label: "Shipping Available", options: yesNoOptions, sectionName: "Delivery & Shipping", sectionOrder: 9 },
  { key: "delivery_charges", label: "Delivery Charges", type: "number", sectionName: "Delivery & Shipping", sectionOrder: 9 },
  { key: "estimated_delivery_time", label: "Estimated Delivery Time", sectionName: "Delivery & Shipping", sectionOrder: 9 },
  { key: "serial_number", label: "Serial Number (optional/private)", sectionName: "Verification & Compliance", sectionOrder: 11 },
  { key: "authenticity_verified", label: "Authenticity Verified", options: yesNoOptions, sectionName: "Verification & Compliance", sectionOrder: 11 },
  { key: "original_invoice_available", label: "Original Invoice Available", options: yesNoOptions, sectionName: "Verification & Compliance", sectionOrder: 11 },
  { key: "return_policy", label: "Return Policy", type: "textarea", sectionName: "Verification & Compliance", sectionOrder: 11 },
  { key: "top_placement", label: "Top Placement", options: yesNoOptions, sectionName: "Promotions", sectionOrder: 13 },
];

const electronicsMobileFields: CategoryAttributeField[] = [
  ...electronicsPostingCommonFields,
  { key: "storage", label: "Storage Capacity", isRequired: true, options: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "Other"], sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "ram", label: "RAM", isRequired: true, options: ["2GB", "4GB", "6GB", "8GB", "12GB", "16GB", "Other"], sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "screenSize", label: "Screen Size", sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "carrier_status", label: "Carrier Locked / Unlocked", isRequired: true, options: ["Unlocked", "Carrier Locked"], sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "batteryHealth", label: "Battery Health", sectionName: "Product Specifications", sectionOrder: 4 },
];

const electronicsComputerFields: CategoryAttributeField[] = [
  ...electronicsPostingCommonFields,
  { key: "processor", label: "Processor", isRequired: true, sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "ram", label: "RAM", isRequired: true, options: ["4GB", "8GB", "16GB", "32GB", "64GB", "Other"], sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "storage_type", label: "Storage Type (SSD/HDD)", options: ["SSD", "HDD", "Hybrid", "Other"], sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "operatingSystem", label: "Operating System", isRequired: true, options: ["Windows", "macOS", "Linux", "Chrome OS", "Other"], sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "graphicsCard", label: "Graphics Card", sectionName: "Product Specifications", sectionOrder: 4 },
];

const electronicsTvFields: CategoryAttributeField[] = [
  ...electronicsPostingCommonFields,
  { key: "screenSize", label: "Screen Size", isRequired: true, sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "resolution", label: "Resolution", isRequired: true, options: ["HD", "Full HD", "4K", "8K", "Other"], sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "smartTv", label: "Smart TV Features", isRequired: true, options: yesNoOptions, sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "hdmi_ports", label: "HDMI Ports", type: "number", sectionName: "Product Specifications", sectionOrder: 4 },
];

const electronicsCameraFields: CategoryAttributeField[] = [
  ...electronicsPostingCommonFields,
  { key: "megapixels", label: "Megapixels", sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "lens_included", label: "Lens Included", options: yesNoOptions, sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "sensor_type", label: "Sensor Type", sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "video_resolution", label: "Video Resolution", sectionName: "Product Specifications", sectionOrder: 4 },
];

const electronicsAudioFields: CategoryAttributeField[] = [
  ...electronicsPostingCommonFields,
  { key: "connectivity", label: "Connectivity", options: ["Bluetooth", "WiFi", "Wired", "USB", "Other"], sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "battery_life", label: "Battery Life", sectionName: "Product Specifications", sectionOrder: 4 },
];

const electronicsApplianceFields: CategoryAttributeField[] = [
  ...electronicsPostingCommonFields,
  { key: "capacity", label: "Capacity", isRequired: true, sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "energyRating", label: "Energy Rating", options: ["1 Star", "2 Star", "3 Star", "4 Star", "5 Star", "ENERGY STAR", "Not Rated"], sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "powerConsumption", label: "Power Consumption", sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "installation_service", label: "Installation Included", options: yesNoOptions, sectionName: "Product Specifications", sectionOrder: 4 },
];

const electronicsAccessoryFields: CategoryAttributeField[] = [
  ...electronicsPostingCommonFields,
  { key: "accessoryType", label: "Accessory Type", isRequired: true, sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "compatibility", label: "Compatibility", sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "connectivity", label: "Connectivity", options: ["Bluetooth", "WiFi", "Wired", "USB-C", "Lightning", "Other"], sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "battery_life", label: "Battery Life", sectionName: "Product Specifications", sectionOrder: 4 },
];

const electronicsNetworkingFields: CategoryAttributeField[] = [
  ...electronicsPostingCommonFields,
  { key: "connectivity", label: "Connectivity", options: ["WiFi", "Ethernet", "Fiber", "Bluetooth", "Other"], sectionName: "Product Specifications", sectionOrder: 4 },
  { key: "compatibility", label: "Compatibility", sectionName: "Product Specifications", sectionOrder: 4 },
];

const petPostingCommonFields: CategoryAttributeField[] = [
  { key: "listing_title", label: "Listing Title", isRequired: true, sectionName: "Pet Information", sectionOrder: 2 },
  { key: "pet_name", label: "Pet Name", sectionName: "Pet Information", sectionOrder: 2 },
  { key: "animal_type", label: "Animal Type", isRequired: true, sectionName: "Pet Information", sectionOrder: 2 },
  { key: "breed", label: "Breed", sectionName: "Pet Information", sectionOrder: 2 },
  { key: "gender", label: "Gender", options: ["Male", "Female", "Unknown"], sectionName: "Pet Information", sectionOrder: 2 },
  { key: "age", label: "Age", isRequired: true, sectionName: "Pet Information", sectionOrder: 2 },
  { key: "date_of_birth", label: "Date of Birth", type: "date", sectionName: "Pet Information", sectionOrder: 2 },
  { key: "color_markings", label: "Color / Markings", sectionName: "Pet Information", sectionOrder: 2 },
  { key: "description", label: "Description", type: "textarea", isRequired: true, sectionName: "Pet Information", sectionOrder: 2 },
  { key: "pickup_available", label: "Pickup Available", options: yesNoOptions, sectionName: "Location Information", sectionOrder: 3 },
  { key: "delivery_available", label: "Delivery Available", options: yesNoOptions, sectionName: "Location Information", sectionOrder: 3 },
  { key: "vaccinated", label: "Vaccinated", options: yesNoOptions, sectionName: "Health Information", sectionOrder: 4 },
  { key: "spayed_neutered", label: "Spayed / Neutered", options: yesNoOptions, sectionName: "Health Information", sectionOrder: 4 },
  { key: "microchipped", label: "Microchipped", options: yesNoOptions, sectionName: "Health Information", sectionOrder: 4 },
  { key: "health_certificate_available", label: "Health Certificate Available", options: yesNoOptions, sectionName: "Health Information", sectionOrder: 4 },
  { key: "medical_history", label: "Medical History", type: "textarea", sectionName: "Health Information", sectionOrder: 4 },
  { key: "vet_records_upload", label: "Vet Records Upload", type: "file", sectionName: "Health Information", sectionOrder: 4 },
  { key: "friendly_with_kids", label: "Friendly with Kids", options: yesNoOptions, sectionName: "Pet Characteristics", sectionOrder: 5 },
  { key: "friendly_with_other_pets", label: "Friendly with Other Pets", options: yesNoOptions, sectionName: "Pet Characteristics", sectionOrder: 5 },
  { key: "house_trained", label: "House Trained", options: yesNoOptions, sectionName: "Pet Characteristics", sectionOrder: 5 },
  { key: "crate_trained", label: "Crate Trained", options: yesNoOptions, sectionName: "Pet Characteristics", sectionOrder: 5 },
  { key: "energy_level", label: "Energy Level", options: ["Low", "Medium", "High"], sectionName: "Pet Characteristics", sectionOrder: 5 },
  { key: "temperament", label: "Temperament", options: ["Friendly", "Playful", "Calm", "Protective"], sectionName: "Pet Characteristics", sectionOrder: 5 },
  { key: "pet_listing_type", label: "Listing Type", options: ["Adoption", "Rehoming", "Service Listing"], isRequired: true, sectionName: "Pricing & Adoption Information", sectionOrder: 6 },
  { key: "adoption_fee", label: "Fee Amount", type: "number", sectionName: "Pricing & Adoption Information", sectionOrder: 6 },
  { key: "price_negotiable", label: "Negotiable", options: yesNoOptions, sectionName: "Pricing & Adoption Information", sectionOrder: 6 },
  { key: "pet_video_url", label: "Videos", sectionName: "Media Upload", sectionOrder: 7 },
  { key: "vaccination_records_upload", label: "Vaccination Records", type: "file", sectionName: "Media Upload", sectionOrder: 7 },
  { key: "adoption_documents_upload", label: "Adoption Documents", type: "file", sectionName: "Media Upload", sectionOrder: 7 },
  { key: "contact_name", label: "Contact Name", isRequired: true, sectionName: "Owner / Organization Information", sectionOrder: 8 },
  { key: "phone", label: "Phone", isRequired: true, sectionName: "Owner / Organization Information", sectionOrder: 8 },
  { key: "email", label: "Email", isRequired: true, sectionName: "Owner / Organization Information", sectionOrder: 8 },
  { key: "organization_name", label: "Organization Name", sectionName: "Owner / Organization Information", sectionOrder: 8 },
  { key: "website", label: "Website", sectionName: "Owner / Organization Information", sectionOrder: 8 },
  { key: "home_check_required", label: "Home Check Required", options: yesNoOptions, sectionName: "Adoption Requirements", sectionOrder: 9 },
  { key: "experience_required", label: "Experience Required", options: yesNoOptions, sectionName: "Adoption Requirements", sectionOrder: 9 },
  { key: "fenced_yard_required", label: "Fenced Yard Required", options: yesNoOptions, sectionName: "Adoption Requirements", sectionOrder: 9 },
  { key: "other_conditions", label: "Other Conditions", type: "textarea", sectionName: "Adoption Requirements", sectionOrder: 9 },
  { key: "available_from_date", label: "Available From Date", type: "date", sectionName: "Availability Information", sectionOrder: 10 },
  { key: "immediate_adoption_available", label: "Immediate Adoption Available", options: yesNoOptions, sectionName: "Availability Information", sectionOrder: 10 },
  { key: "meet_greet_scheduling", label: "Meet & Greet Scheduling", options: yesNoOptions, sectionName: "Availability Information", sectionOrder: 10 },
  { key: "verified_shelter", label: "Verified Shelter", options: yesNoOptions, sectionName: "Compliance & Verification", sectionOrder: 12 },
  { key: "verified_breeder", label: "Verified Breeder", options: yesNoOptions, sectionName: "Compliance & Verification", sectionOrder: 12 },
  { key: "usda_license_number", label: "USDA License Number", sectionName: "Compliance & Verification", sectionOrder: 12 },
  { key: "adoption_agreement_upload", label: "Adoption Agreement Upload", type: "file", sectionName: "Compliance & Verification", sectionOrder: 12 },
  { key: "identity_verification", label: "Identity Verification", options: yesNoOptions, sectionName: "Compliance & Verification", sectionOrder: 12 },
  { key: "urgent_adoption_badge", label: "Urgent Adoption Badge", options: yesNoOptions, sectionName: "Promotions", sectionOrder: 13 },
  { key: "featured_placement", label: "Featured Placement", options: yesNoOptions, sectionName: "Promotions", sectionOrder: 13 },
];

const petDogFields: CategoryAttributeField[] = [
  ...petPostingCommonFields,
  { key: "training_status", label: "Training Status", options: ["Not Trained", "Basic", "Advanced", "Professional"], sectionName: "Dog Details", sectionOrder: 14 },
  { key: "exercise_requirements", label: "Exercise Requirements", options: ["Low", "Moderate", "High"], sectionName: "Dog Details", sectionOrder: 14 },
];

const petCatFields: CategoryAttributeField[] = [
  ...petPostingCommonFields,
  { key: "indoor_outdoor_preference", label: "Indoor/Outdoor Preference", options: ["Indoor", "Outdoor", "Both"], sectionName: "Cat Details", sectionOrder: 14 },
  { key: "litter_trained_status", label: "Litter Trained Status", options: ["Yes", "No", "In Training"], sectionName: "Cat Details", sectionOrder: 14 },
];

const petBirdFields: CategoryAttributeField[] = [
  ...petPostingCommonFields,
  { key: "wings_clipped", label: "Wings Clipped", options: yesNoOptions, sectionName: "Bird Details", sectionOrder: 14 },
  { key: "cage_included", label: "Cage Included", options: yesNoOptions, sectionName: "Bird Details", sectionOrder: 14 },
];

const petFishFields: CategoryAttributeField[] = [
  ...petPostingCommonFields,
  { key: "tank_size_requirement", label: "Tank Size Requirement", sectionName: "Fish Details", sectionOrder: 14 },
  { key: "water_type", label: "Freshwater/Saltwater", options: ["Freshwater", "Saltwater"], sectionName: "Fish Details", sectionOrder: 14 },
];

const petLostFoundFields: CategoryAttributeField[] = [
  ...petPostingCommonFields,
  { key: "last_seen_location", label: "Last Seen Location", isRequired: true, sectionName: "Lost Pet Details", sectionOrder: 14 },
  { key: "last_seen_date", label: "Last Seen Date", type: "date", isRequired: true, sectionName: "Lost Pet Details", sectionOrder: 14 },
  { key: "reward_offered", label: "Reward Offered", options: yesNoOptions, sectionName: "Lost Pet Details", sectionOrder: 14 },
  { key: "contact_urgency", label: "Contact Urgency", options: ["Normal", "Urgent", "Emergency"], sectionName: "Lost Pet Details", sectionOrder: 14 },
];

const petServiceFields: CategoryAttributeField[] = [
  ...petPostingCommonFields,
  { key: "service_type", label: "Service Type", isRequired: true, sectionName: "Pet Service Details", sectionOrder: 14 },
  { key: "business_hours", label: "Business Hours", sectionName: "Pet Service Details", sectionOrder: 14 },
  { key: "service_area", label: "Service Area", sectionName: "Pet Service Details", sectionOrder: 14 },
  { key: "certifications", label: "Certifications", sectionName: "Pet Service Details", sectionOrder: 14 },
];

const careServiceOptions = [
  "Meal Preparation",
  "Medication Reminder",
  "Bathing Assistance",
  "Transportation Assistance",
  "Housekeeping",
  "Pet Assistance",
  "Mobility Support",
  "Therapy Assistance",
];
const careServiceFields: CategoryAttributeField[] = [
  { key: "serviceTitle", label: "Service Title", isRequired: true, sectionName: "Service Information", sectionOrder: 2 },
  { key: "businessCaregiverName", label: "Business / Caregiver Name", isRequired: true, sectionName: "Service Information", sectionOrder: 2 },
  { key: "tagline", label: "Tagline", sectionName: "Service Information", sectionOrder: 2 },
  { key: "description", label: "Description", type: "textarea", isRequired: true, sectionName: "Service Information", sectionOrder: 2 },
  { key: "providerType", label: "Provider Type", options: ["Individual Caregiver", "Agency / Company"], isRequired: true, sectionName: "Provider Information", sectionOrder: 3 },
  { key: "experienceYears", label: "Years of Experience", type: "number", isRequired: true, sectionName: "Provider Information", sectionOrder: 3 },
  { key: "languagesSpoken", label: "Languages Spoken", options: ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam", "Gujarati", "Punjabi", "Bengali", "Marathi", "Urdu", "Spanish"], isRequired: true, sectionName: "Provider Information", sectionOrder: 3 },
  { key: "genderPreference", label: "Gender", options: ["No Preference", "Female", "Male"], sectionName: "Provider Information", sectionOrder: 3 },
  { key: "serviceRadiusMiles", label: "Service Radius (miles)", type: "number", sectionName: "Service Location", sectionOrder: 4 },
  { key: "willingToTravel", label: "Willing to Travel", options: yesNoOptions, isRequired: true, sectionName: "Service Location", sectionOrder: 4 },
  { key: "availabilityType", label: "Availability Type", options: ["Full-time", "Part-time", "Hourly", "Live-in"], isRequired: true, sectionName: "Availability & Scheduling", sectionOrder: 5 },
  { key: "availableDays", label: "Available Days", options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], isRequired: true, sectionName: "Availability & Scheduling", sectionOrder: 5 },
  { key: "availableTimeSlots", label: "Available Time Slots", options: ["Morning", "Afternoon", "Evening", "Night", "Overnight", "Flexible"], isRequired: true, sectionName: "Availability & Scheduling", sectionOrder: 5 },
  { key: "startDate", label: "Start Date", type: "date", isRequired: true, sectionName: "Availability & Scheduling", sectionOrder: 5 },
  { key: "rateType", label: "Pricing Type", options: ["Hourly", "Daily", "Weekly", "Monthly"], isRequired: true, sectionName: "Pricing", sectionOrder: 6 },
  { key: "price", label: "Rate (USD)", type: "number", isRequired: true, sectionName: "Pricing", sectionOrder: 6 },
  { key: "price_negotiable", label: "Negotiable", options: yesNoOptions, sectionName: "Pricing", sectionOrder: 6 },
  { key: "minimumHoursRequired", label: "Minimum Hours Required", type: "number", sectionName: "Pricing", sectionOrder: 6 },
  { key: "mealPreparation", label: "Meal Preparation", type: "checkbox", sectionName: "Services Offered", sectionOrder: 7 },
  { key: "medicationReminder", label: "Medication Reminder", type: "checkbox", sectionName: "Services Offered", sectionOrder: 7 },
  { key: "bathingAssistance", label: "Bathing Assistance", type: "checkbox", sectionName: "Services Offered", sectionOrder: 7 },
  { key: "transportationAssistance", label: "Transportation Assistance", type: "checkbox", sectionName: "Services Offered", sectionOrder: 7 },
  { key: "housekeeping", label: "Housekeeping", type: "checkbox", sectionName: "Services Offered", sectionOrder: 7 },
  { key: "petAssistance", label: "Pet Assistance", type: "checkbox", sectionName: "Services Offered", sectionOrder: 7 },
  { key: "mobilitySupport", label: "Mobility Support", type: "checkbox", sectionName: "Services Offered", sectionOrder: 7 },
  { key: "therapyAssistance", label: "Therapy Assistance", type: "checkbox", sectionName: "Services Offered", sectionOrder: 7 },
  { key: "cprCertified", label: "CPR Certified", options: yesNoOptions, isRequired: true, sectionName: "Qualifications & Certifications", sectionOrder: 8 },
  { key: "firstAidCertified", label: "First Aid Certified", options: yesNoOptions, isRequired: true, sectionName: "Qualifications & Certifications", sectionOrder: 8 },
  { key: "cnaCertified", label: "CNA Certified", options: yesNoOptions, sectionName: "Qualifications & Certifications", sectionOrder: 8 },
  { key: "rnLpn", label: "RN / LPN License", options: yesNoOptions, sectionName: "Qualifications & Certifications", sectionOrder: 8 },
  { key: "licenseNumber", label: "License Number", sectionName: "Qualifications & Certifications", sectionOrder: 8 },
  { key: "certificationDocuments", label: "Certifications Upload (PDF/Image)", type: "file", sectionName: "Qualifications & Certifications", sectionOrder: 8 },
  { key: "backgroundCheck", label: "Background Verified", options: yesNoOptions, isRequired: true, sectionName: "Qualifications & Certifications", sectionOrder: 8 },
  { key: "ageGroups", label: "Age Group", options: ["Infants", "Children", "Adults", "Seniors"], isRequired: true, sectionName: "Care Preferences", sectionOrder: 9 },
  { key: "specialNeedsExperience", label: "Special Needs Experience", options: yesNoOptions, isRequired: true, sectionName: "Care Preferences", sectionOrder: 9 },
  { key: "smokingAllowed", label: "Smoking Allowed", options: yesNoOptions, isRequired: true, sectionName: "Care Preferences", sectionOrder: 9 },
  { key: "petFriendly", label: "Pet Friendly", options: yesNoOptions, isRequired: true, sectionName: "Care Preferences", sectionOrder: 9 },
  { key: "contactName", label: "Contact Name", sectionName: "Contact Information", sectionOrder: 12 },
  { key: "contactPhone", label: "Phone", sectionName: "Contact Information", sectionOrder: 12 },
  { key: "contactEmail", label: "Email", sectionName: "Contact Information", sectionOrder: 12 },
  { key: "contactWebsite", label: "Website", sectionName: "Contact Information", sectionOrder: 12 },
  { key: "chatEnabled", label: "Chat Enabled", options: yesNoOptions, sectionName: "Contact Information", sectionOrder: 12 },
  { key: "callEnabled", label: "Call Enabled", options: yesNoOptions, sectionName: "Contact Information", sectionOrder: 12 },
  { key: "identityVerification", label: "Identity Verification", options: yesNoOptions, isRequired: true, sectionName: "Compliance & Safety", sectionOrder: 13 },
  { key: "backgroundVerification", label: "Background Check Status", options: yesNoOptions, isRequired: true, sectionName: "Compliance & Safety", sectionOrder: 13 },
  { key: "insurance", label: "Insurance Coverage", sectionName: "Compliance & Safety", sectionOrder: 13 },
  { key: "serviceDisclaimer", label: "Medical Disclaimer", type: "textarea", sectionName: "Compliance & Safety", sectionOrder: 13 },
  { key: "hipaaCompliance", label: "HIPAA Compliance", options: yesNoOptions, sectionName: "Compliance & Safety", sectionOrder: 13 },
  { key: "scheduleInterview", label: "Appointment Booking Enabled", options: yesNoOptions, sectionName: "Booking & Appointments", sectionOrder: 14 },
  { key: "onlineConsultation", label: "Online Consultation", options: yesNoOptions, sectionName: "Booking & Appointments", sectionOrder: 14 },
  { key: "emergencyAvailability", label: "Emergency Availability", options: yesNoOptions, sectionName: "Booking & Appointments", sectionOrder: 14 },
  { key: "childAgeGroup", label: "Child Age Group", options: ["Infants", "Toddlers", "Preschool", "School Age"], sectionName: "Child Care Details", sectionOrder: 16 },
  { key: "schoolPickupOption", label: "School Pickup Option", options: yesNoOptions, sectionName: "Child Care Details", sectionOrder: 16 },
  { key: "mobilityAssistance", label: "Mobility Assistance", options: yesNoOptions, sectionName: "Elder Care Details", sectionOrder: 17 },
  { key: "dementiaCareExperience", label: "Dementia Care Experience", options: yesNoOptions, sectionName: "Elder Care Details", sectionOrder: 17 },
  { key: "petTypeExperience", label: "Pet Type Experience", sectionName: "Pet Care Details", sectionOrder: 18 },
  { key: "staffCount", label: "Staff Count", type: "number", sectionName: "Agency Details", sectionOrder: 19 },
];

const categoryAttributeFieldsByCategory: Record<string, CategoryAttributeField[]> = {
  "Real Estate": [
    { key: "price", label: "Price", type: "number", isRequired: true },
    { key: "priceNegotiable", label: "Price Type", options: ["Negotiable", "Fixed"] },
    { key: "superBuiltUpArea", label: "Super Built-up Area (sq ft)", type: "number" },
    { key: "carpetArea", label: "Carpet Area", type: "number" },
    { key: "floorNumber", label: "Floor Number", type: "number" },
    { key: "totalFloors", label: "Total Floors", type: "number" },
    { key: "propertyAge", label: "Property Age", options: ["New", "<1 yr", "1-5 yrs", "5+ yrs"] },
    { key: "availability", label: "Availability", options: ["Immediate", "Date"] },
    { key: "landmark", label: "Landmark" },
    { key: "googleMapLatLong", label: "Google Map Location (lat/long)" },
    { key: "sellerType", label: "Seller Type", options: ["Owner", "Agent", "Builder"] },
    { key: "reraNumber", label: "RERA Number" },
    { key: "ownershipType", label: "Ownership Type", options: ["Freehold", "Leasehold"] },
  ],
  "Roommates & Rentals": [
    { key: "listing_title", label: "Listing Title", isRequired: true, sectionName: "Property Information", sectionOrder: 2 },
    { key: "property_type", label: "Property Type", options: ["Apartment", "House", "Condo", "Townhouse", "Basement", "Studio"], isRequired: true, sectionName: "Property Information", sectionOrder: 2 },
    { key: "description", label: "Description", type: "textarea", isRequired: true, sectionName: "Property Information", sectionOrder: 2 },
    { key: "neighborhood", label: "Neighborhood", sectionName: "Location Information", sectionOrder: 3 },
    { key: "monthly_rent", label: "Monthly Rent (USD)", type: "number", isRequired: true, sectionName: "Rental Information", sectionOrder: 4 },
    { key: "security_deposit", label: "Security Deposit (USD)", type: "number", isRequired: true, sectionName: "Rental Information", sectionOrder: 4 },
    { key: "utilities_included", label: "Utilities Included", options: yesNoOptions, sectionName: "Rental Information", sectionOrder: 4 },
    { key: "price_negotiable", label: "Negotiable", options: yesNoOptions, sectionName: "Rental Information", sectionOrder: 4 },
    { key: "lease_duration", label: "Lease Duration", options: ["Weekly", "Monthly", "6 Months", "12 Months", "Flexible"], sectionName: "Rental Information", sectionOrder: 4 },
    { key: "available_from", label: "Available From Date", type: "date", isRequired: true, sectionName: "Rental Information", sectionOrder: 4 },
    { key: "bedrooms", label: "Number of Bedrooms", type: "number", isRequired: true, sectionName: "Room Details", sectionOrder: 5 },
    { key: "bathrooms", label: "Number of Bathrooms", type: "number", isRequired: true, sectionName: "Room Details", sectionOrder: 5 },
    { key: "room_type", label: "Room Type", options: ["Private Room", "Shared Room"], isRequired: true, sectionName: "Room Details", sectionOrder: 5 },
    { key: "furnishing_type", label: "Furnishing", options: ["Fully Furnished", "Semi-Furnished", "Unfurnished"], isRequired: true, sectionName: "Room Details", sectionOrder: 5 },
    { key: "room_size_sqft", label: "Room Size (sq ft)", type: "number", isRequired: true, sectionName: "Room Details", sectionOrder: 5 },
    { key: "preferred_gender", label: "Preferred Gender", options: ["Male", "Female", "Any"], isRequired: true, sectionName: "Roommate Preferences", sectionOrder: 6 },
    { key: "preferred_occupation", label: "Preferred Occupation", options: ["Student", "Professional", "Any"], isRequired: true, sectionName: "Roommate Preferences", sectionOrder: 6 },
    { key: "preferred_age_range", label: "Preferred Age Range", sectionName: "Roommate Preferences", sectionOrder: 6 },
    { key: "smoking_allowed", label: "Smoking Allowed", options: yesNoOptions, sectionName: "Roommate Preferences", sectionOrder: 6 },
    { key: "pets_allowed", label: "Pets Allowed", options: yesNoOptions, sectionName: "Roommate Preferences", sectionOrder: 6 },
    { key: "couples_allowed", label: "Couples Allowed", options: yesNoOptions, sectionName: "Roommate Preferences", sectionOrder: 6 },
    { key: "wifi_included", label: "WiFi Included", type: "checkbox", sectionName: "Property Amenities", sectionOrder: 7 },
    { key: "parking_available", label: "Parking Available", type: "checkbox", sectionName: "Property Amenities", sectionOrder: 7 },
    { key: "laundry_facility", label: "Laundry Facility", type: "checkbox", sectionName: "Property Amenities", sectionOrder: 7 },
    { key: "air_conditioning", label: "Air Conditioning", type: "checkbox", sectionName: "Property Amenities", sectionOrder: 7 },
    { key: "heating", label: "Heating", type: "checkbox", sectionName: "Property Amenities", sectionOrder: 7 },
    { key: "gym_access", label: "Gym Access", type: "checkbox", sectionName: "Property Amenities", sectionOrder: 7 },
    { key: "swimming_pool", label: "Swimming Pool", type: "checkbox", sectionName: "Property Amenities", sectionOrder: 7 },
    { key: "elevator", label: "Elevator", type: "checkbox", sectionName: "Property Amenities", sectionOrder: 7 },
    { key: "security_system", label: "Security System", type: "checkbox", sectionName: "Property Amenities", sectionOrder: 7 },
    { key: "public_transportation_nearby", label: "Public Transportation Nearby", type: "checkbox", sectionName: "Nearby Facilities", sectionOrder: 8 },
    { key: "university_nearby", label: "University Nearby", type: "checkbox", sectionName: "Nearby Facilities", sectionOrder: 8 },
    { key: "grocery_stores_nearby", label: "Grocery Stores Nearby", type: "checkbox", sectionName: "Nearby Facilities", sectionOrder: 8 },
    { key: "hospital_nearby", label: "Hospital Nearby", type: "checkbox", sectionName: "Nearby Facilities", sectionOrder: 8 },
    { key: "shopping_center_nearby", label: "Shopping Center Nearby", type: "checkbox", sectionName: "Nearby Facilities", sectionOrder: 8 },
    { key: "property_photos", label: "Property Photos", type: "file", sectionName: "Media Upload", sectionOrder: 9 },
    { key: "room_photos", label: "Room Photos", type: "file", sectionName: "Media Upload", sectionOrder: 9 },
    { key: "floor_plan", label: "Floor Plan", type: "file", sectionName: "Media Upload", sectionOrder: 9 },
    { key: "property_video_tour", label: "Property Video Tour", sectionName: "Media Upload", sectionOrder: 9 },
    { key: "virtual_tour_360", label: "360 Virtual Tour", sectionName: "Media Upload", sectionOrder: 9 },
    { key: "contact_name", label: "Contact Name", isRequired: true, sectionName: "Contact Information", sectionOrder: 10 },
    { key: "phone", label: "Phone", isRequired: true, sectionName: "Contact Information", sectionOrder: 10 },
    { key: "email", label: "Email", isRequired: true, sectionName: "Contact Information", sectionOrder: 10 },
    { key: "preferred_contact_method", label: "Preferred Contact Method", options: ["Call", "SMS", "Chat", "Email"], sectionName: "Contact Information", sectionOrder: 10 },
    { key: "available_until", label: "Available Until", type: "date", sectionName: "Availability & Viewing", sectionOrder: 11 },
    { key: "schedule_property_viewing", label: "Schedule Property Viewing", options: yesNoOptions, sectionName: "Availability & Viewing", sectionOrder: 11 },
    { key: "open_house_dates", label: "Open House Dates", type: "date", sectionName: "Availability & Viewing", sectionOrder: 11 },
    { key: "identity_verified", label: "Identity Verified", options: yesNoOptions, sectionName: "Compliance & Verification", sectionOrder: 13 },
    { key: "property_ownership_verified", label: "Property Ownership Verified", options: yesNoOptions, sectionName: "Compliance & Verification", sectionOrder: 13 },
    { key: "lease_document_upload", label: "Lease Document Upload", type: "file", sectionName: "Compliance & Verification", sectionOrder: 13 },
    { key: "background_verification", label: "Background Verification", options: yesNoOptions, sectionName: "Compliance & Verification", sectionOrder: 13 },
    { key: "university_name", label: "University Name", sectionName: "Student Housing Details", sectionOrder: 15 },
    { key: "distance_from_campus", label: "Distance from Campus", sectionName: "Student Housing Details", sectionOrder: 15 },
    { key: "student_only", label: "Student Only Option", options: yesNoOptions, sectionName: "Student Housing Details", sectionOrder: 15 },
    { key: "original_lease_end_date", label: "Original Lease End Date", type: "date", sectionName: "Sublease Details", sectionOrder: 16 },
    { key: "landlord_approval_required", label: "Landlord Approval Required", options: yesNoOptions, sectionName: "Sublease Details", sectionOrder: 16 },
    { key: "corporate_rates", label: "Corporate Rates", sectionName: "Corporate Housing Details", sectionOrder: 17 },
    { key: "business_traveler_amenities", label: "Business Traveler Amenities", type: "textarea", sectionName: "Corporate Housing Details", sectionOrder: 17 },
    { key: "daily_rate", label: "Daily Rate", type: "number", sectionName: "Vacation Rental Details", sectionOrder: 18 },
    { key: "check_in_date", label: "Check-In Date", type: "date", sectionName: "Vacation Rental Details", sectionOrder: 18 },
    { key: "check_out_date", label: "Check-Out Date", type: "date", sectionName: "Vacation Rental Details", sectionOrder: 18 },
    { key: "cleaning_fee", label: "Cleaning Fee", type: "number", sectionName: "Vacation Rental Details", sectionOrder: 18 },
  ],
  Vehicles: [
    ...vehiclePostingCommonFields,
  ],
  "Restaurants & Food": [
    { key: "restaurant_name", label: "Restaurant Name", isRequired: true, sectionName: "Restaurant / Business Information", sectionOrder: 1 },
    { key: "business_name", label: "Business Name", sectionName: "Restaurant / Business Information", sectionOrder: 1 },
    { key: "tagline", label: "Tagline", sectionName: "Restaurant / Business Information", sectionOrder: 1 },
    { key: "description", label: "Description", type: "textarea", sectionName: "Restaurant / Business Information", sectionOrder: 1 },
    { key: "cuisine_type", label: "Cuisine Type", options: ["Indian", "Chinese", "Italian", "Mexican", "Thai", "Mediterranean", "American", "Vegan", "Korean", "Japanese", "Middle Eastern"], isRequired: true, sectionName: "Cuisine Information", sectionOrder: 2 },
    { key: "food_type", label: "Food Type", options: ["Veg", "Non-Veg", "Vegan", "Halal", "Kosher", "Gluten-Free"], sectionName: "Cuisine Information", sectionOrder: 2 },
    { key: "service_type", label: "Service Type", options: ["Dine-In", "Takeaway", "Delivery", "Catering", "Reservations Accepted"], isRequired: true, sectionName: "Service Type", sectionOrder: 6 },
    { key: "delivery_radius", label: "Delivery Radius (miles)", type: "number", sectionName: "Location", sectionOrder: 4 },
    { key: "service_radius", label: "Service Radius (miles)", type: "number", sectionName: "Location", sectionOrder: 4 },
    { key: "contact_person", label: "Contact Person", sectionName: "Contact Information", sectionOrder: 5 },
    { key: "instagram_url", label: "Instagram", sectionName: "Contact Information", sectionOrder: 5 },
    { key: "facebook_url", label: "Facebook", sectionName: "Contact Information", sectionOrder: 5 },
    { key: "tiktok_url", label: "TikTok", sectionName: "Contact Information", sectionOrder: 5 },
    { key: "working_days", label: "Working Days", sectionName: "Working Hours", sectionOrder: 6 },
    { key: "opening_time", label: "Opening Time", sectionName: "Working Hours", sectionOrder: 6 },
    { key: "closing_time", label: "Closing Time", sectionName: "Working Hours", sectionOrder: 6 },
    { key: "open_24x7", label: "24/7 Service", options: yesNoOptions, sectionName: "Working Hours", sectionOrder: 6 },
    { key: "holiday_hours", label: "Holiday Hours", type: "textarea", sectionName: "Working Hours", sectionOrder: 6 },
    { key: "dine_in", label: "Dine-In", options: yesNoOptions, sectionName: "Service Type", sectionOrder: 7 },
    { key: "takeaway", label: "Takeaway", options: yesNoOptions, sectionName: "Service Type", sectionOrder: 7 },
    { key: "delivery_available", label: "Delivery", options: yesNoOptions, sectionName: "Service Type", sectionOrder: 7 },
    { key: "catering_available", label: "Catering", options: yesNoOptions, sectionName: "Service Type", sectionOrder: 7 },
    { key: "reservations_accepted", label: "Reservations Accepted", options: yesNoOptions, sectionName: "Service Type", sectionOrder: 7 },
    { key: "menu_items", label: "Menu Items", type: "textarea", sectionName: "Menu Management", sectionOrder: 8 },
    { key: "average_cost_for_two", label: "Average Cost for Two (USD)", type: "number", sectionName: "Pricing & Offers", sectionOrder: 9 },
    { key: "price_range", label: "Price Range", options: ["Budget", "Moderate", "Premium"], sectionName: "Pricing & Offers", sectionOrder: 9 },
    { key: "discounts_offers", label: "Offers / Discounts", type: "textarea", sectionName: "Pricing & Offers", sectionOrder: 9 },
    { key: "coupon_codes", label: "Coupon Codes", sectionName: "Pricing & Offers", sectionOrder: 9 },
    { key: "happy_hours", label: "Happy Hours", sectionName: "Pricing & Offers", sectionOrder: 9 },
    { key: "delivery_fee", label: "Delivery Fee", type: "number", sectionName: "Delivery Details", sectionOrder: 10 },
    { key: "minimum_order_value", label: "Minimum Order Amount", type: "number", sectionName: "Delivery Details", sectionOrder: 10 },
    { key: "estimated_delivery_time", label: "Estimated Delivery Time", sectionName: "Delivery Details", sectionOrder: 10 },
    { key: "third_party_integration", label: "Third-party Delivery", options: ["DoorDash", "Uber Eats", "Grubhub"], sectionName: "Delivery Details", sectionOrder: 10 },
    { key: "catering_type", label: "Catering Type", sectionName: "Catering Details", sectionOrder: 11 },
    { key: "minimum_guests", label: "Minimum Guests", type: "number", sectionName: "Catering Details", sectionOrder: 11 },
    { key: "maximum_guests", label: "Maximum Guests", type: "number", sectionName: "Catering Details", sectionOrder: 11 },
    { key: "per_plate_pricing", label: "Per Plate Pricing", type: "number", sectionName: "Catering Details", sectionOrder: 11 },
    { key: "event_types", label: "Event Types", options: ["Wedding", "Corporate", "Birthday", "Festival"], sectionName: "Catering Details", sectionOrder: 11 },
    { key: "parking", label: "Parking", type: "checkbox", sectionName: "Amenities", sectionOrder: 12 },
    { key: "wifi", label: "WiFi", type: "checkbox", sectionName: "Amenities", sectionOrder: 12 },
    { key: "outdoor_seating", label: "Outdoor Seating", type: "checkbox", sectionName: "Amenities", sectionOrder: 12 },
    { key: "live_music", label: "Live Music", type: "checkbox", sectionName: "Amenities", sectionOrder: 12 },
    { key: "pet_friendly", label: "Pet Friendly", type: "checkbox", sectionName: "Amenities", sectionOrder: 12 },
    { key: "family_friendly", label: "Family Friendly", type: "checkbox", sectionName: "Amenities", sectionOrder: 12 },
    { key: "wheelchair_accessible", label: "Wheelchair Accessible (ADA)", type: "checkbox", sectionName: "Amenities", sectionOrder: 12 },
    { key: "private_dining", label: "Private Dining", type: "checkbox", sectionName: "Amenities", sectionOrder: 12 },
    { key: "bar_available", label: "Bar Available", type: "checkbox", sectionName: "Amenities", sectionOrder: 12 },
    { key: "mobile_locations", label: "Mobile Locations", type: "textarea", sectionName: "Food Truck Details", sectionOrder: 13 },
    { key: "operating_zones", label: "Operating Zones", type: "textarea", sectionName: "Food Truck Details", sectionOrder: 13 },
    { key: "food_license_number", label: "Food License Number", sectionName: "Compliance & Licensing", sectionOrder: 15 },
    { key: "health_inspection_rating", label: "Health Inspection Rating", sectionName: "Compliance & Licensing", sectionOrder: 15 },
    { key: "alcohol_license", label: "Alcohol License", sectionName: "Compliance & Licensing", sectionOrder: 15 },
    { key: "business_registration_number", label: "Business Registration Number", sectionName: "Compliance & Licensing", sectionOrder: 15 },
    { key: "age_restriction", label: "Age Restriction", sectionName: "Compliance & Licensing", sectionOrder: 15 },
    { key: "table_booking", label: "Table Reservation Enabled", options: yesNoOptions, sectionName: "Reservation & Booking", sectionOrder: 16 },
    { key: "reservation_capacity", label: "Reservation Capacity", type: "number", sectionName: "Reservation & Booking", sectionOrder: 16 },
    { key: "online_booking_url", label: "Online Booking URL", sectionName: "Reservation & Booking", sectionOrder: 16 },
    { key: "ad_type", label: "Listing Type", options: listingTypeOptions, sectionName: "Listing Visibility & Promotions", sectionOrder: 17 },
    { key: "sponsored_listing", label: "Sponsored Listing", options: yesNoOptions, sectionName: "Listing Visibility & Promotions", sectionOrder: 17 },
    { key: "boost_listing", label: "Boost Listing", options: yesNoOptions, sectionName: "Listing Visibility & Promotions", sectionOrder: 17 },
    { key: "ad_duration_days", label: "Ad Duration", options: ["30", "60", "90"], sectionName: "Listing Visibility & Promotions", sectionOrder: 17 },
    { key: "enable_chat", label: "Enable Chat", options: yesNoOptions, sectionName: "Lead & Interaction", sectionOrder: 18 },
    { key: "enable_call", label: "Enable Call", options: yesNoOptions, sectionName: "Lead & Interaction", sectionOrder: 18 },
    { key: "order_now_button", label: "Order Now Button", options: yesNoOptions, sectionName: "Lead & Interaction", sectionOrder: 18 },
  ],
  "Electronics & Appliances": [
    ...electronicsPostingCommonFields,
  ],
  "Care Services": [
    ...careServiceFields,
  ],
  "Furniture & Home": [
    ...furniturePostingCommonFields,
  ],
  "Furniture & Home Decor": [
    ...furniturePostingCommonFields,
  ],
  "Fashion & Lifestyle": [
    { key: "brand", label: "Brand" },
    { key: "size", label: "Size" },
    { key: "condition", label: "Condition", options: commonConditionOptions },
    { key: "material", label: "Material" },
    { key: "color", label: "Color" },
    { key: "genderFit", label: "Fit / Gender", options: ["Men", "Women", "Kids", "Unisex"] },
    { key: "authenticity", label: "Authenticity", options: ["Original", "Replica", "Not Applicable"] },
  ],
  "Pets & Animals": [
    ...petPostingCommonFields,
  ],
  "Books, Sports & Hobbies": [
    { key: "brandOrAuthor", label: "Brand / Author" },
    { key: "condition", label: "Condition", options: commonConditionOptions },
    { key: "classOrLevel", label: "Class / Level" },
    { key: "language", label: "Language" },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "ageGroup", label: "Age Group" },
    { key: "includedItems", label: "Included Items" },
  ],
  Jobs: [
    { key: "job_title", label: "Job Title", isRequired: true, sectionName: "Job Information", sectionOrder: 2 },
    { key: "job_code", label: "Job Code", sectionName: "Job Information", sectionOrder: 2 },
    { key: "company_name", label: "Company Name", isRequired: true, sectionName: "Job Information", sectionOrder: 2 },
    { key: "hiring_manager", label: "Hiring Manager", sectionName: "Job Information", sectionOrder: 2 },
    { key: "job_description", label: "Job Description", type: "textarea", isRequired: true, sectionName: "Job Information", sectionOrder: 2 },
    { key: "company_website", label: "Company Website", sectionName: "Company Information", sectionOrder: 3 },
    { key: "industry", label: "Industry", isRequired: true, sectionName: "Company Information", sectionOrder: 3 },
    { key: "company_size", label: "Company Size", options: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"], sectionName: "Company Information", sectionOrder: 3 },
    { key: "company_description", label: "Company Description", type: "textarea", sectionName: "Company Information", sectionOrder: 3 },
    { key: "company_logo", label: "Company Logo", type: "file", sectionName: "Company Information", sectionOrder: 3 },
    { key: "work_mode", label: "Work Mode", options: ["Onsite", "Remote", "Hybrid"], isRequired: true, sectionName: "Job Location", sectionOrder: 4 },
    { key: "detailed_office_address", label: "Detailed Office Address", sectionName: "Job Location", sectionOrder: 4 },
    { key: "remote_work_policy", label: "Remote Work Policy", type: "textarea", sectionName: "Job Location", sectionOrder: 4 },
    { key: "time_zone_requirement", label: "Time Zone Requirement", sectionName: "Job Location", sectionOrder: 4 },
    { key: "salary_type", label: "Salary Type", options: ["Hourly", "Monthly", "Annually"], isRequired: true, sectionName: "Compensation", sectionOrder: 5 },
    { key: "price", label: "Salary Range (Min)", type: "number", isRequired: true, sectionName: "Compensation", sectionOrder: 5 },
    { key: "salary_max", label: "Salary Range (Max)", type: "number", isRequired: true, sectionName: "Compensation", sectionOrder: 5 },
    { key: "currency", label: "Currency", options: ["USD"], sectionName: "Compensation", sectionOrder: 5 },
    { key: "bonus_available", label: "Bonus Available", options: yesNoOptions, sectionName: "Compensation", sectionOrder: 5 },
    { key: "benefits_included", label: "Benefits Included", options: yesNoOptions, sectionName: "Compensation", sectionOrder: 5 },
    { key: "employment_type", label: "Employment Type", options: ["Full-Time", "Part-Time", "Contract", "Temporary", "Internship", "Freelance"], isRequired: true, sectionName: "Employment Details", sectionOrder: 6 },
    { key: "experience_required", label: "Experience Required", options: ["Fresher", "1-3 Years", "3-5 Years", "5-10 Years", "10+ Years"], isRequired: true, sectionName: "Employment Details", sectionOrder: 6 },
    { key: "education_requirement", label: "Education Requirement", options: ["High School", "Associate Degree", "Bachelor's Degree", "Master's Degree", "PhD"], sectionName: "Education Requirements", sectionOrder: 7 },
    { key: "technical_skills", label: "Technical Skills", options: ["Java", ".NET", "Python", "React", "Angular", "SQL", "AWS", "Azure", "DevOps"], sectionName: "Skills & Technologies", sectionOrder: 8 },
    { key: "soft_skills", label: "Soft Skills", options: ["Communication", "Leadership", "Team Management"], sectionName: "Skills & Technologies", sectionOrder: 8 },
    { key: "work_authorization", label: "Work Authorization", options: ["US Citizen", "Green Card", "H1B", "H4 EAD", "OPT", "CPT", "TN Visa", "Any Authorized Worker"], sectionName: "Visa & Work Authorization", sectionOrder: 9 },
    { key: "sponsorship_available", label: "Sponsorship Available", options: yesNoOptions, sectionName: "Visa & Work Authorization", sectionOrder: 9 },
    { key: "key_responsibilities", label: "Key Responsibilities", type: "textarea", isRequired: true, sectionName: "Job Responsibilities", sectionOrder: 10 },
    { key: "day_to_day_tasks", label: "Day-to-Day Tasks", type: "textarea", sectionName: "Job Responsibilities", sectionOrder: 10 },
    { key: "reporting_structure", label: "Reporting Structure", sectionName: "Job Responsibilities", sectionOrder: 10 },
    { key: "health_insurance", label: "Health Insurance", type: "checkbox", sectionName: "Benefits", sectionOrder: 11 },
    { key: "dental_insurance", label: "Dental Insurance", type: "checkbox", sectionName: "Benefits", sectionOrder: 11 },
    { key: "vision_insurance", label: "Vision Insurance", type: "checkbox", sectionName: "Benefits", sectionOrder: 11 },
    { key: "401k", label: "401(k)", type: "checkbox", sectionName: "Benefits", sectionOrder: 11 },
    { key: "paid_time_off", label: "Paid Time Off", type: "checkbox", sectionName: "Benefits", sectionOrder: 11 },
    { key: "remote_work_option", label: "Remote Work Option", type: "checkbox", sectionName: "Benefits", sectionOrder: 11 },
    { key: "relocation_assistance", label: "Relocation Assistance", type: "checkbox", sectionName: "Benefits", sectionOrder: 11 },
    { key: "application_method", label: "Application Method", options: ["Apply on Platform", "External Website", "Email Resume"], isRequired: true, sectionName: "Application Process", sectionOrder: 12 },
    { key: "required_documents", label: "Required Documents", options: ["Resume", "Cover Letter", "Portfolio", "Certifications"], sectionName: "Application Process", sectionOrder: 12 },
    { key: "external_apply_url", label: "External Apply URL", sectionName: "Application Process", sectionOrder: 12 },
    { key: "resume_email", label: "Resume Email", sectionName: "Application Process", sectionOrder: 12 },
    { key: "contact_name", label: "Contact Name", isRequired: true, sectionName: "Recruiter Contact Information", sectionOrder: 13 },
    { key: "phone", label: "Phone Number", isRequired: true, sectionName: "Recruiter Contact Information", sectionOrder: 13 },
    { key: "email", label: "Email Address", isRequired: true, sectionName: "Recruiter Contact Information", sectionOrder: 13 },
    { key: "application_deadline", label: "Application Deadline", type: "date", sectionName: "Job Posting Settings", sectionOrder: 14 },
    { key: "immediate_hiring", label: "Immediate Hiring", options: yesNoOptions, sectionName: "Job Posting Settings", sectionOrder: 14 },
    { key: "number_of_openings", label: "Number of Openings", type: "number", sectionName: "Job Posting Settings", sectionOrder: 14 },
    { key: "priority_level", label: "Priority Level", options: ["Low", "Normal", "High", "Urgent"], sectionName: "Job Posting Settings", sectionOrder: 14 },
    { key: "office_photos", label: "Office Photos", type: "file", sectionName: "Media Upload", sectionOrder: 15 },
    { key: "recruitment_video", label: "Recruitment Video", type: "file", sectionName: "Media Upload", sectionOrder: 15 },
    { key: "job_brochure_pdf", label: "Job Brochure PDF", type: "file", sectionName: "Media Upload", sectionOrder: 15 },
    { key: "verified_company_badge", label: "Verified Company Badge", options: yesNoOptions, sectionName: "Employer Verification", sectionOrder: 16 },
    { key: "business_registration_verification", label: "Business Registration Verification", type: "file", sectionName: "Employer Verification", sectionOrder: 16 },
    { key: "recruiter_verification", label: "Recruiter Verification", type: "file", sectionName: "Employer Verification", sectionOrder: 16 },
    { key: "urgent_hiring_badge", label: "Urgent Hiring Badge", options: yesNoOptions, sectionName: "Promotions", sectionOrder: 17 },
    { key: "sponsored_job", label: "Sponsored Job", options: yesNoOptions, sectionName: "Promotions", sectionOrder: 17 },
    { key: "top_search_placement", label: "Top Search Placement", options: yesNoOptions, sectionName: "Promotions", sectionOrder: 17 },
    { key: "contract_duration", label: "Contract Duration", sectionName: "Contract Job Details", sectionOrder: 18 },
    { key: "hourly_rate", label: "Hourly Rate", type: "number", sectionName: "Contract Job Details", sectionOrder: 18 },
    { key: "internship_duration", label: "Internship Duration", sectionName: "Internship Details", sectionOrder: 19 },
    { key: "college_requirement", label: "College Requirement", sectionName: "Internship Details", sectionOrder: 19 },
    { key: "stipend_information", label: "Stipend Information", sectionName: "Internship Details", sectionOrder: 19 },
    { key: "medical_license_number", label: "Medical License Number", sectionName: "Healthcare Details", sectionOrder: 20 },
    { key: "certification_requirements", label: "Certification Requirements", type: "textarea", sectionName: "Healthcare Details", sectionOrder: 20 },
    { key: "cdl_required", label: "CDL Required", options: yesNoOptions, sectionName: "Driver Job Details", sectionOrder: 21 },
    { key: "driving_experience", label: "Driving Experience", sectionName: "Driver Job Details", sectionOrder: 21 },
    { key: "license_class", label: "License Class", sectionName: "Driver Job Details", sectionOrder: 21 },
  ],
  "Jobs / Services": [
    { key: "companyOrProvider", label: "Company / Provider" },
    { key: "jobOrServiceType", label: "Job / Service Type", options: ["Full Time", "Part Time", "Contract", "Freelance", "One Time Service", "Training"] },
    { key: "experienceRequired", label: "Experience Required" },
    { key: "qualification", label: "Qualification" },
    { key: "salaryOrFee", label: "Salary / Fee" },
    { key: "workMode", label: "Work Mode", options: ["Onsite", "Remote", "Hybrid", "At Customer Location"] },
    { key: "availability", label: "Availability" },
  ],
  "Business & Industrial": [
    { key: "brand", label: "Brand" },
    { key: "model", label: "Model" },
    { key: "condition", label: "Condition", options: commonConditionOptions },
    { key: "capacity", label: "Capacity / Specification" },
    { key: "manufacturingYear", label: "Manufacturing Year", type: "number" },
    { key: "minimumOrderQuantity", label: "Minimum Order Quantity" },
    { key: "warrantyOrService", label: "Warranty / Service" },
  ],
  "Events & Tickets": [
    { key: "event_title", label: "Event Title", isRequired: true, sectionName: "Event Information", sectionOrder: 2 },
    { key: "organizer_name", label: "Organizer Name", isRequired: true, sectionName: "Event Information", sectionOrder: 2 },
    { key: "tagline", label: "Tagline", sectionName: "Event Information", sectionOrder: 2 },
    { key: "event_description", label: "Event Description", type: "textarea", isRequired: true, sectionName: "Event Information", sectionOrder: 2 },
    { key: "event_start_date", label: "Event Start Date", type: "date", isRequired: true, sectionName: "Event Date & Time", sectionOrder: 3 },
    { key: "event_end_date", label: "Event End Date", type: "date", sectionName: "Event Date & Time", sectionOrder: 3 },
    { key: "start_time", label: "Start Time", type: "time", sectionName: "Event Date & Time", sectionOrder: 3 },
    { key: "end_time", label: "End Time", type: "time", sectionName: "Event Date & Time", sectionOrder: 3 },
    { key: "time_zone", label: "Time Zone", options: ["Eastern Time", "Central Time", "Mountain Time", "Pacific Time", "Alaska Time", "Hawaii Time"], isRequired: true, sectionName: "Event Date & Time", sectionOrder: 3 },
    { key: "recurring_event", label: "Recurring Event", options: yesNoOptions, sectionName: "Event Date & Time", sectionOrder: 3 },
    { key: "venue_name", label: "Venue Name", sectionName: "Event Location", sectionOrder: 4 },
    { key: "full_address", label: "Full Address", sectionName: "Event Location", sectionOrder: 4 },
    { key: "map_lat_long", label: "Latitude / Longitude", sectionName: "Event Location", sectionOrder: 4 },
    { key: "online_meeting_url", label: "Online Meeting URL", sectionName: "Virtual Event", sectionOrder: 5 },
    { key: "streaming_platform", label: "Platform", options: ["Zoom", "Google Meet", "Microsoft Teams", "YouTube Live"], sectionName: "Virtual Event", sectionOrder: 5 },
    { key: "ticket_type", label: "Ticket Type", options: ["Free", "Paid", "Donation-based"], sectionName: "Ticket Information", sectionOrder: 6 },
    { key: "ticket_categories", label: "Ticket Categories", options: ["General Admission", "VIP", "Early Bird", "Premium Seating"], sectionName: "Ticket Information", sectionOrder: 6 },
    { key: "ticket_price", label: "Ticket Price (USD)", type: "number", sectionName: "Ticket Information", sectionOrder: 6 },
    { key: "quantity_available", label: "Quantity Available", type: "number", sectionName: "Ticket Information", sectionOrder: 6 },
    { key: "max_tickets_per_user", label: "Max Tickets Per User", type: "number", sectionName: "Ticket Information", sectionOrder: 6 },
    { key: "registration_required", label: "Registration Required", options: yesNoOptions, sectionName: "Payment & Registration", sectionOrder: 7 },
    { key: "payment_gateway", label: "Payment Gateway Integration", sectionName: "Payment & Registration", sectionOrder: 7 },
    { key: "refund_policy", label: "Refund Policy", type: "textarea", sectionName: "Payment & Registration", sectionOrder: 7 },
    { key: "cancellation_policy", label: "Cancellation Policy", type: "textarea", sectionName: "Payment & Registration", sectionOrder: 7 },
    { key: "event_capacity", label: "Event Capacity", type: "number", sectionName: "Audience & Capacity", sectionOrder: 8 },
    { key: "age_restriction", label: "Age Restriction", options: ["All Ages", "18+", "21+"], sectionName: "Audience & Capacity", sectionOrder: 8 },
    { key: "age_verification", label: "Age Verification", options: yesNoOptions, sectionName: "Audience & Capacity", sectionOrder: 8 },
    { key: "audience_type", label: "Audience Type", options: ["Public", "Invite Only"], sectionName: "Audience & Capacity", sectionOrder: 8 },
    { key: "organizer_type", label: "Organizer Type", options: ["Individual", "Company", "Nonprofit Organization"], sectionName: "Organizer Information", sectionOrder: 9 },
    { key: "contact_name", label: "Contact Name", sectionName: "Organizer Information", sectionOrder: 9 },
    { key: "phone", label: "Phone (OTP verified)", sectionName: "Organizer Information", sectionOrder: 9 },
    { key: "email", label: "Email", sectionName: "Organizer Information", sectionOrder: 9 },
    { key: "website", label: "Website", sectionName: "Organizer Information", sectionOrder: 9 },
    { key: "social_media_links", label: "Social Media Links", sectionName: "Organizer Information", sectionOrder: 9 },
    { key: "event_banner", label: "Event Banner", type: "file", sectionName: "Media Upload", sectionOrder: 10 },
    { key: "event_photos", label: "Event Photos", type: "file", sectionName: "Media Upload", sectionOrder: 10 },
    { key: "promo_video_url", label: "Promo Videos", sectionName: "Media Upload", sectionOrder: 10 },
    { key: "brochure_flyer_pdf", label: "Brochure / Flyer PDF", type: "file", sectionName: "Media Upload", sectionOrder: 10 },
    { key: "parking_available", label: "Parking Available", type: "checkbox", sectionName: "Event Features & Amenities", sectionOrder: 11 },
    { key: "food_drinks_available", label: "Food & Drinks Available", type: "checkbox", sectionName: "Event Features & Amenities", sectionOrder: 11 },
    { key: "wheelchair_accessible", label: "Wheelchair Accessible", type: "checkbox", sectionName: "Event Features & Amenities", sectionOrder: 11 },
    { key: "live_streaming", label: "Live Streaming", type: "checkbox", sectionName: "Event Features & Amenities", sectionOrder: 11 },
    { key: "networking_sessions", label: "Networking Sessions", type: "checkbox", sectionName: "Event Features & Amenities", sectionOrder: 11 },
    { key: "merchandise_available", label: "Merchandise Available", type: "checkbox", sectionName: "Event Features & Amenities", sectionOrder: 11 },
    { key: "event_permit", label: "Event Permit", sectionName: "Compliance & Permissions", sectionOrder: 12 },
    { key: "alcohol_permit", label: "Alcohol Permit", sectionName: "Compliance & Permissions", sectionOrder: 12 },
    { key: "terms_conditions", label: "Terms & Conditions", type: "textarea", sectionName: "Compliance & Permissions", sectionOrder: 12 },
    { key: "liability_waiver", label: "Liability Waiver", type: "textarea", sectionName: "Compliance & Permissions", sectionOrder: 12 },
    { key: "featured_event", label: "Featured Event", options: yesNoOptions, sectionName: "Promotions & Marketing", sectionOrder: 13 },
    { key: "sponsored_placement", label: "Sponsored Placement", options: yesNoOptions, sectionName: "Promotions & Marketing", sectionOrder: 13 },
    { key: "promo_codes_coupons", label: "Promo Codes / Coupons", sectionName: "Promotions & Marketing", sectionOrder: 13 },
    { key: "email_campaign_integration", label: "Email Campaign Integration", options: yesNoOptions, sectionName: "Promotions & Marketing", sectionOrder: 13 },
    { key: "tickets_sold", label: "Tickets Sold", type: "number", sectionName: "Analytics & Tracking", sectionOrder: 14 },
    { key: "page_views", label: "Page Views", type: "number", sectionName: "Analytics & Tracking", sectionOrder: 14 },
    { key: "rsvps", label: "RSVPs", type: "number", sectionName: "Analytics & Tracking", sectionOrder: 14 },
    { key: "attendance_tracking", label: "Attendance Tracking", options: yesNoOptions, sectionName: "Analytics & Tracking", sectionOrder: 14 },
    { key: "revenue_generated", label: "Revenue Generated", type: "number", sectionName: "Analytics & Tracking", sectionOrder: 14 },
    { key: "original_ticket_proof", label: "Original Ticket Proof", sectionName: "Ticket Resale", sectionOrder: 15 },
    { key: "transfer_policy", label: "Transfer Policy", type: "textarea", sectionName: "Ticket Resale", sectionOrder: 15 },
  ],
  "Tickets & Events": [],
};

categoryAttributeFieldsByCategory["Tickets & Events"] = categoryAttributeFieldsByCategory["Events & Tickets"];

const categoryAttributeFieldSetsByCategory: Record<string, CategoryAttributeFieldSet> = {
  "Real Estate": {
    default: categoryAttributeFieldsByCategory["Real Estate"],
    subCategories: {
      "For Sale": [
        ...categoryAttributeFieldsByCategory["Real Estate"],
        { key: "salePriceLabel", label: "Price Type", options: ["Total Price"] },
        { key: "loanEligibleDetail", label: "Loan Eligible", options: yesNoOptions },
      ],
      "For Rent": [
        ...categoryAttributeFieldsByCategory["Real Estate"],
        { key: "monthlyRentLabel", label: "Price Type", options: ["Monthly Rent"] },
        { key: "securityDepositDetail", label: "Security Deposit", type: "number" },
      ],
      "PG / Co-living": [
        { key: "roomTypeDetail", label: "Room Type", options: ["Single", "Shared"] },
        { key: "genderPreferenceDetail", label: "Gender Preference", options: ["Male", "Female", "Any"] },
        { key: "foodIncludedDetail", label: "Food Included", options: yesNoOptions },
        { key: "pgAmenitiesDetail", label: "Amenities", options: ["WiFi", "Laundry", "AC"] },
      ],
      "Commercial": [
        { key: "commercialPropertyType", label: "Property Type", options: ["Office", "Shop", "Warehouse"] },
        { key: "commercialArea", label: "Area (sq ft)", type: "number" },
        { key: "commercialFurnishing", label: "Furnishing", options: ["Furnished", "Unfurnished"] },
        { key: "washrooms", label: "Washrooms", type: "number" },
        { key: "parkingAvailable", label: "Parking", options: yesNoOptions },
        { key: "suitableFor", label: "Suitable For", options: ["Office", "Retail", "Storage"] },
        { key: "sellerType", label: "Seller Type", options: ["Owner", "Agent", "Builder"] },
      ],
      "Vacation Rentals": [
        ...categoryAttributeFieldsByCategory["Real Estate"],
        { key: "monthlyRentLabel", label: "Price Type", options: ["Monthly Rent"] },
        { key: "securityDepositDetail", label: "Security Deposit", type: "number" },
      ],
      "New Projects / New Construction": [
        ...categoryAttributeFieldsByCategory["Real Estate"],
        { key: "salePriceLabel", label: "Price Type", options: ["Total Price"] },
        { key: "loanEligibleDetail", label: "Loan Eligible", options: yesNoOptions },
      ],
      "Real Estate Services": [
        { key: "serviceType", label: "Service Type" },
        { key: "serviceArea", label: "Service Area" },
        { key: "experience", label: "Experience" },
        { key: "licenseNumber", label: "License Number" },
      ],
    },
  },
  "Roommates & Rentals": {
    default: categoryAttributeFieldsByCategory["Roommates & Rentals"],
    subCategories: {
      "Roommates Wanted": categoryAttributeFieldsByCategory["Roommates & Rentals"],
      "Rooms for Rent": categoryAttributeFieldsByCategory["Roommates & Rentals"],
      "Shared Apartments": categoryAttributeFieldsByCategory["Roommates & Rentals"],
      "Shared Houses": categoryAttributeFieldsByCategory["Roommates & Rentals"],
      "Paying Guest (PG) Accommodation": categoryAttributeFieldsByCategory["Roommates & Rentals"],
      "Student Housing": categoryAttributeFieldsByCategory["Roommates & Rentals"],
      "Temporary & Short-Term Rentals": categoryAttributeFieldsByCategory["Roommates & Rentals"],
      "Sublease & Lease Transfer": categoryAttributeFieldsByCategory["Roommates & Rentals"],
      "Co-Living Spaces": categoryAttributeFieldsByCategory["Roommates & Rentals"],
      "Vacation & Corporate Housing": categoryAttributeFieldsByCategory["Roommates & Rentals"],
    },
  },
  Vehicles: {
    default: categoryAttributeFieldsByCategory.Vehicles,
    subCategories: {
      Cars: [
        ...vehicleCoreFields,
        { key: "bodyType", label: "Body Type", options: ["Sedan", "SUV", "Hatchback", "Coupe", "Convertible", "Luxury Car", "Sports Car", "Hybrid Car", "Electric Car", "Other"] },
        { key: "seatingCapacity", label: "Seating Capacity", type: "number" },
        { key: "bootSpace", label: "Boot Space" },
        { key: "mileage", label: "Fuel Economy / Mileage" },
        { key: "airConditioning", label: "Air Conditioning", type: "checkbox" },
        { key: "powerSteering", label: "Power Steering", type: "checkbox" },
        { key: "abs", label: "ABS", type: "checkbox" },
        { key: "airbags", label: "Airbags", type: "checkbox" },
        { key: "alloyWheels", label: "Alloy Wheels", type: "checkbox" },
        { key: "bluetoothGps", label: "Bluetooth / GPS", type: "checkbox" },
        { key: "reverseCamera", label: "Reverse Camera", type: "checkbox" },
        { key: "cruiseControl", label: "Cruise Control", type: "checkbox" },
      ],
      "Motorcycles & Scooters": [
        ...vehicleCoreFields,
        { key: "engineCapacity", label: "Engine Capacity (cc)", isRequired: true, type: "number" },
        { key: "mileage", label: "Mileage" },
        { key: "bikeType", label: "Bike Type", isRequired: true, options: ["Sport Bike", "Cruiser", "Scooter", "Touring Bike", "Dirt Bike", "Electric Bike", "Other"] },
      ],
      Bikes: [
        ...vehicleCoreFields,
        { key: "engineCapacity", label: "Engine Capacity (cc)", isRequired: true, type: "number" },
        { key: "mileage", label: "Mileage" },
        { key: "bikeType", label: "Bike Type", isRequired: true, options: ["Sport Bike", "Cruiser", "Scooter", "Touring Bike", "Dirt Bike", "Electric Bike", "Other"] },
      ],
      "Trucks & Commercial Vehicles": [
        ...vehicleCoreFields,
        { key: "loadCapacity", label: "Load Capacity", isRequired: true, type: "number", sectionName: "Commercial Vehicle Fields", sectionOrder: 10 },
        { key: "cargoDimensions", label: "Cargo Dimensions", sectionName: "Commercial Vehicle Fields", sectionOrder: 10 },
        { key: "dotCompliance", label: "DOT Compliance", options: yesNoOptions, sectionName: "Commercial Vehicle Fields", sectionOrder: 10 },
        { key: "fleetVehicle", label: "Fleet Vehicle", options: yesNoOptions, sectionName: "Commercial Vehicle Fields", sectionOrder: 10 },
      ],
      "Commercial Vehicles": [
        ...vehicleCoreFields,
        { key: "loadCapacity", label: "Load Capacity", isRequired: true, type: "number", sectionName: "Commercial Vehicle Fields", sectionOrder: 10 },
        { key: "cargoDimensions", label: "Cargo Dimensions", sectionName: "Commercial Vehicle Fields", sectionOrder: 10 },
        { key: "dotCompliance", label: "DOT Compliance", options: yesNoOptions, sectionName: "Commercial Vehicle Fields", sectionOrder: 10 },
        { key: "fleetVehicle", label: "Fleet Vehicle", options: yesNoOptions, sectionName: "Commercial Vehicle Fields", sectionOrder: 10 },
      ],
      "RVs & Campers": [
        ...vehicleCoreFields,
        { key: "rvType", label: "RV Type", options: ["Motorhome", "Travel Trailer", "Camper Van", "Fifth Wheel RV"], isRequired: true },
        { key: "sleepingCapacity", label: "Sleeping Capacity", type: "number" },
        { key: "lengthFeet", label: "Length (ft)", type: "number" },
      ],
      "Boats & Watercraft": [
        ...vehicleCoreFields,
        { key: "watercraftType", label: "Watercraft Type", options: ["Fishing Boat", "Yacht", "Jet Ski", "Sailboat", "Pontoon Boat"], isRequired: true },
        { key: "lengthFeet", label: "Length (ft)", type: "number" },
        { key: "engineHours", label: "Engine Hours", type: "number" },
      ],
      Rentals: [
        ...vehicleCoreFields,
        { key: "rentalType", label: "Rental Type", isRequired: true, options: ["Car Rental", "Luxury Rental", "Party Bus Rental", "Truck Rental", "RV Rental", "Self-drive", "With Driver"], sectionName: "Rental Details", sectionOrder: 11 },
        { key: "rentalDuration", label: "Rental Duration", isRequired: true, sectionName: "Rental Details", sectionOrder: 11 },
        { key: "pricePerDay", label: "Daily Price", type: "number", isRequired: true, sectionName: "Rental Details", sectionOrder: 11 },
        { key: "securityDepositVehicle", label: "Deposit Amount", type: "number", isRequired: true, sectionName: "Rental Details", sectionOrder: 11 },
      ],
      "Vehicle Rentals": [
        ...vehicleCoreFields,
        { key: "rentalType", label: "Rental Type", isRequired: true, options: ["Car Rental", "Luxury Rental", "Party Bus Rental", "Truck Rental", "RV Rental", "Self-drive", "With Driver"], sectionName: "Rental Details", sectionOrder: 11 },
        { key: "rentalDuration", label: "Rental Duration", isRequired: true, sectionName: "Rental Details", sectionOrder: 11 },
        { key: "pricePerDay", label: "Daily Price", type: "number", isRequired: true, sectionName: "Rental Details", sectionOrder: 11 },
        { key: "securityDepositVehicle", label: "Deposit Amount", type: "number", isRequired: true, sectionName: "Rental Details", sectionOrder: 11 },
      ],
      "Auto Parts & Accessories": [
        { key: "partType", label: "Part Type", isRequired: true, options: ["Tires & Wheels", "Batteries", "Car Audio Systems", "Seat Covers", "GPS & Electronics", "Performance Parts", "Other"], sectionName: "Auto Parts & Accessories Fields", sectionOrder: 11 },
        { key: "compatibleModels", label: "Compatible Brands / Models", isRequired: true, sectionName: "Auto Parts & Accessories Fields", sectionOrder: 11 },
        { key: "oemAftermarket", label: "OEM / Aftermarket", options: ["OEM", "Aftermarket"], sectionName: "Auto Parts & Accessories Fields", sectionOrder: 11 },
        { key: "condition", label: "Part Condition", isRequired: true, options: ["New", "Used", "Refurbished"], sectionName: "Auto Parts & Accessories Fields", sectionOrder: 11 },
      ],
      "Spare Parts & Accessories": [
        { key: "partType", label: "Part Type", isRequired: true, options: ["Tires & Wheels", "Batteries", "Car Audio Systems", "Seat Covers", "GPS & Electronics", "Performance Parts", "Other"], sectionName: "Auto Parts & Accessories Fields", sectionOrder: 11 },
        { key: "compatibleModels", label: "Compatible Brands / Models", isRequired: true, sectionName: "Auto Parts & Accessories Fields", sectionOrder: 11 },
        { key: "oemAftermarket", label: "OEM / Aftermarket", options: ["OEM", "Aftermarket"], sectionName: "Auto Parts & Accessories Fields", sectionOrder: 11 },
        { key: "condition", label: "Part Condition", isRequired: true, options: ["New", "Used", "Refurbished"], sectionName: "Auto Parts & Accessories Fields", sectionOrder: 11 },
      ],
      "Electric Vehicles (EV)": [
        ...vehicleCoreFields,
        { key: "batteryRange", label: "Battery Range (miles)", type: "number", isRequired: true, sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "chargingTime", label: "Charging Time", isRequired: true, sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "fastChargingSupport", label: "Fast Charging Support", options: yesNoOptions, sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "chargingPortType", label: "Charging Port Type", sectionName: "EV-Specific Fields", sectionOrder: 9 },
      ],
      "Services & Repairs": [
        { key: "serviceType", label: "Service Type", options: ["Auto Repair Shop", "Car Wash & Detailing", "Oil Change Service", "Tire Service", "Body Shop", "Towing Service"], isRequired: true },
        { key: "serviceRadiusMiles", label: "Service Radius (miles)", type: "number" },
        { key: "appointmentRequired", label: "Appointment Required", options: yesNoOptions },
        { key: "emergencyService", label: "Emergency Service", options: yesNoOptions },
      ],
    },
    detailedCategories: {
      "Electric Cars": [
        ...vehicleCoreFields,
        { key: "batteryRange", label: "Battery Range (miles)", type: "number", isRequired: true, sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "chargingTime", label: "Charging Time", isRequired: true, sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "fastChargingSupport", label: "Fast Charging Support", options: yesNoOptions, sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "chargingPortType", label: "Charging Port Type", sectionName: "EV-Specific Fields", sectionOrder: 9 },
      ],
      "Electric Bikes": [
        ...vehicleCoreFields,
        { key: "batteryRange", label: "Battery Range (miles)", type: "number", isRequired: true, sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "chargingTime", label: "Charging Time", isRequired: true, sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "fastChargingSupport", label: "Fast Charging Support", options: yesNoOptions, sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "chargingPortType", label: "Charging Port Type", sectionName: "EV-Specific Fields", sectionOrder: 9 },
      ],
      "Charging Stations": [
        { key: "chargingStationType", label: "Charging Station Type", sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "chargingPortType", label: "Charging Port Type", sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "fastChargingSupport", label: "Fast Charging Support", options: yesNoOptions, sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "price", label: "Price (USD)", type: "number", isRequired: true, sectionName: "Pricing", sectionOrder: 4 },
      ],
      "EV Accessories": [
        { key: "partType", label: "Part Type", isRequired: true, sectionName: "Auto Parts & Accessories Fields", sectionOrder: 11 },
        { key: "compatibleModels", label: "Compatible Brands / Models", isRequired: true, sectionName: "Auto Parts & Accessories Fields", sectionOrder: 11 },
        { key: "condition", label: "Part Condition", isRequired: true, options: ["New", "Used", "Refurbished"], sectionName: "Auto Parts & Accessories Fields", sectionOrder: 11 },
      ],
      "Electric Vehicles": [
        ...vehicleCoreFields,
        { key: "batteryRange", label: "Battery Range (miles)", type: "number", isRequired: true, sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "chargingTime", label: "Charging Time", isRequired: true, sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "fastChargingSupport", label: "Fast Charging Support", options: yesNoOptions, sectionName: "EV-Specific Fields", sectionOrder: 9 },
        { key: "chargingPortType", label: "Charging Port Type", sectionName: "EV-Specific Fields", sectionOrder: 9 },
      ],
      "Tires & Wheels": [
        { key: "itemType", label: "Item Type", options: ["Tire", "Wheel"] },
        { key: "sizeOrCapacity", label: "Size / Capacity" },
        { key: "brand", label: "Brand" },
        { key: "manufacturingDate", label: "Manufacturing Date" },
        { key: "condition", label: "Part Condition", options: ["New", "Used", "Refurbished"] },
        { key: "warranty", label: "Warranty", options: ["No Warranty", "Seller Warranty", "Manufacturer Warranty"] },
      ],
      "Tyres / Batteries": [
        { key: "itemType", label: "Item Type", options: ["Tire", "Battery"] },
        { key: "sizeOrCapacity", label: "Size / Capacity" },
        { key: "brand", label: "Brand" },
        { key: "manufacturingDate", label: "Manufacturing Date" },
        { key: "condition", label: "Part Condition", options: ["New", "Used", "Refurbished"] },
        { key: "warranty", label: "Warranty", options: ["No Warranty", "Seller Warranty", "Manufacturer Warranty"] },
      ],
    },
  },
  "Restaurants & Food": {
    default: categoryAttributeFieldsByCategory["Restaurants & Food"],
    subCategories: {
      "Restaurants (Dine-In)": categoryAttributeFieldsByCategory["Restaurants & Food"],
      Restaurant: categoryAttributeFieldsByCategory["Restaurants & Food"],
      "Fast Food & Takeaway": categoryAttributeFieldsByCategory["Restaurants & Food"],
      "Cafes & Bakeries": [
        ...categoryAttributeFieldsByCategory["Restaurants & Food"],
        { key: "bakerySpecialties", label: "Bakery Specialties", type: "textarea" },
      ],
      Cafe: categoryAttributeFieldsByCategory["Restaurants & Food"],
      Bakery: categoryAttributeFieldsByCategory["Restaurants & Food"],
      "Cloud Kitchen / Delivery Only": [
        ...categoryAttributeFieldsByCategory["Restaurants & Food"],
        { key: "deliveryOnly", label: "Delivery Only", options: yesNoOptions },
      ],
      "Cloud Kitchen": categoryAttributeFieldsByCategory["Restaurants & Food"],
      "Catering Services": [
        ...categoryAttributeFieldsByCategory["Restaurants & Food"],
        { key: "eventCapacity", label: "Event Capacity", type: "number" },
        { key: "cateringPackages", label: "Catering Packages", type: "textarea" },
      ],
      Catering: categoryAttributeFieldsByCategory["Restaurants & Food"],
      "Bars & Beverages": categoryAttributeFieldsByCategory["Restaurants & Food"],
      "Food Trucks & Pop-ups": categoryAttributeFieldsByCategory["Restaurants & Food"],
      "Grocery & Specialty Food Stores": categoryAttributeFieldsByCategory["Restaurants & Food"],
    },
  },
  "Electronics & Appliances": {
    default: categoryAttributeFieldsByCategory["Electronics & Appliances"],
    subCategories: {
      "Mobile Phones & Tablets": electronicsMobileFields,
      "Computers & Laptops": electronicsComputerFields,
      "TVs & Home Entertainment": electronicsTvFields,
      "Cameras & Photography": electronicsCameraFields,
      "Audio & Music Systems": electronicsAudioFields,
      "Gaming & Consoles": electronicsComputerFields,
      "Smart Home Devices": electronicsNetworkingFields,
      "Home Appliances": electronicsApplianceFields,
      "Kitchen Appliances": electronicsApplianceFields,
      "Office Electronics": electronicsNetworkingFields,
      "Wearables & Accessories": electronicsAccessoryFields,
      "Networking Equipment": electronicsNetworkingFields,
    },
    detailedCategories: {
      Smartphones: electronicsMobileFields,
      "Feature Phones": electronicsMobileFields,
      Tablets: electronicsMobileFields,
      iPads: electronicsMobileFields,
      "Smart Watches": electronicsAccessoryFields,
      "Mobile Accessories": electronicsAccessoryFields,
      Laptops: electronicsComputerFields,
      "Desktop Computers": electronicsComputerFields,
      "All-in-One PCs": electronicsComputerFields,
      Monitors: electronicsTvFields,
      "Computer Accessories": electronicsAccessoryFields,
      "Printers & Scanners": electronicsNetworkingFields,
      "Smart TVs": electronicsTvFields,
      "LED TVs": electronicsTvFields,
      "OLED TVs": electronicsTvFields,
      Projectors: electronicsTvFields,
      "Streaming Devices": electronicsNetworkingFields,
      "Home Theater Systems": electronicsAudioFields,
      "DSLR Cameras": electronicsCameraFields,
      "Mirrorless Cameras": electronicsCameraFields,
      "Action Cameras": electronicsCameraFields,
      Camcorders: electronicsCameraFields,
      "Camera Lenses": electronicsCameraFields,
      "Photography Accessories": electronicsAccessoryFields,
      Headphones: electronicsAudioFields,
      Earbuds: electronicsAudioFields,
      "Bluetooth Speakers": electronicsAudioFields,
      Soundbars: electronicsAudioFields,
      "Home Audio Systems": electronicsAudioFields,
      "DJ Equipment": electronicsAudioFields,
      "PlayStation Consoles": electronicsComputerFields,
      "Xbox Consoles": electronicsComputerFields,
      "Nintendo Consoles": electronicsComputerFields,
      "Gaming PCs": electronicsComputerFields,
      "Gaming Accessories": electronicsAccessoryFields,
      "VR Headsets": electronicsAccessoryFields,
      "Smart Speakers": electronicsAudioFields,
      "Smart Lights": electronicsNetworkingFields,
      "Smart Thermostats": electronicsNetworkingFields,
      "Smart Security Cameras": electronicsCameraFields,
      "Video Doorbells": electronicsCameraFields,
      "Home Automation Devices": electronicsNetworkingFields,
      Refrigerators: electronicsApplianceFields,
      "Washing Machines": electronicsApplianceFields,
      Dryers: electronicsApplianceFields,
      "Air Conditioners": electronicsApplianceFields,
      "Air Purifiers": electronicsApplianceFields,
      "Vacuum Cleaners": electronicsApplianceFields,
      Microwaves: electronicsApplianceFields,
      Ovens: electronicsApplianceFields,
      Dishwashers: electronicsApplianceFields,
      "Coffee Makers": electronicsApplianceFields,
      "Mixers & Blenders": electronicsApplianceFields,
      "Water Purifiers": electronicsApplianceFields,
      Printers: electronicsNetworkingFields,
      Scanners: electronicsNetworkingFields,
      "Conference Equipment": electronicsNetworkingFields,
      "POS Systems": electronicsNetworkingFields,
      "Fitness Bands": electronicsAccessoryFields,
      Chargers: electronicsAccessoryFields,
      "Power Banks": electronicsAccessoryFields,
      "Phone Cases": electronicsAccessoryFields,
      "Screen Protectors": electronicsAccessoryFields,
      Routers: electronicsNetworkingFields,
      Modems: electronicsNetworkingFields,
      "WiFi Extenders": electronicsNetworkingFields,
      "Network Switches": electronicsNetworkingFields,
      "Access Points": electronicsNetworkingFields,
    },
  },
  "Care Services": {
    default: categoryAttributeFieldsByCategory["Care Services"],
    subCategories: {
      "Child Care Services": careServiceFields,
      "Child Care / Babysitting": careServiceFields,
      "Babysitting & Nanny Services": careServiceFields,
      "Elder Care Services": careServiceFields,
      "Elder Care": careServiceFields,
      "Home Health Care": careServiceFields,
      "Nursing Services": careServiceFields,
      "Pet Care Services": careServiceFields,
      "Pet Care": careServiceFields,
      "Disability & Special Needs Care": careServiceFields,
      "Special Needs Care": careServiceFields,
      "Companion Care Services": careServiceFields,
      "Rehabilitation & Therapy Services": careServiceFields,
      "Hospice & Palliative Care": careServiceFields,
    },
  },
  "Furniture & Home": {
    default: categoryAttributeFieldsByCategory["Furniture & Home"],
    subCategories: {
      "Living Room": [
        ...furniturePostingCommonFields,
        { key: "seating_capacity", label: "Seating Capacity", options: ["1", "2", "3", "5+"], sectionName: "Subcategory Details", sectionOrder: 4 },
        { key: "upholstery_type", label: "Upholstery Type", options: ["Fabric", "Leather", "Faux Leather"], sectionName: "Subcategory Details", sectionOrder: 4 },
        { key: "recliner", label: "Recliner", options: yesNoOptions, sectionName: "Subcategory Details", sectionOrder: 4 },
      ],
      Bedroom: [
        ...furniturePostingCommonFields,
        { key: "bed_size", label: "Bed Size", options: ["Twin", "Full", "Queen", "King"], sectionName: "Subcategory Details", sectionOrder: 4 },
        { key: "mattress_included", label: "Mattress Included", options: yesNoOptions, sectionName: "Subcategory Details", sectionOrder: 4 },
        { key: "storage", label: "Storage", options: yesNoOptions, sectionName: "Subcategory Details", sectionOrder: 4 },
      ],
      Dining: [
        ...furniturePostingCommonFields,
        { key: "dining_seating_capacity", label: "Seating Capacity", options: ["2", "4", "6", "8+"], sectionName: "Subcategory Details", sectionOrder: 4 },
        { key: "table_shape", label: "Table Shape", options: ["Round", "Rectangle", "Square"], sectionName: "Subcategory Details", sectionOrder: 4 },
      ],
      Office: [
        ...furniturePostingCommonFields,
        { key: "desk_type", label: "Desk Type", options: ["Standing", "Regular"], sectionName: "Subcategory Details", sectionOrder: 4 },
        { key: "chair_type", label: "Chair Type", options: ["Ergonomic", "Executive"], sectionName: "Subcategory Details", sectionOrder: 4 },
        { key: "adjustable_height", label: "Adjustable Height", options: yesNoOptions, sectionName: "Subcategory Details", sectionOrder: 4 },
      ],
      "Office Furniture": [
        ...furniturePostingCommonFields,
        { key: "desk_type", label: "Desk Type", options: ["Standing", "Regular"], sectionName: "Subcategory Details", sectionOrder: 4 },
        { key: "chair_type", label: "Chair Type", options: ["Ergonomic", "Executive"], sectionName: "Subcategory Details", sectionOrder: 4 },
        { key: "adjustable_height", label: "Adjustable Height", options: yesNoOptions, sectionName: "Subcategory Details", sectionOrder: 4 },
      ],
      Outdoor: [
        ...furniturePostingCommonFields,
        { key: "weather_resistant", label: "Weather Resistant", options: yesNoOptions, sectionName: "Subcategory Details", sectionOrder: 4 },
        { key: "outdoor_usage", label: "Usage", options: ["Patio", "Garden", "Balcony"], sectionName: "Subcategory Details", sectionOrder: 4 },
      ],
      Decor: [
        ...furniturePostingCommonFields,
        { key: "decor_type", label: "Decor Type", options: ["Wall Art", "Lighting", "Rugs", "Curtains"], sectionName: "Subcategory Details", sectionOrder: 4 },
        { key: "style", label: "Style", options: ["Modern", "Traditional", "Vintage", "Minimalist"], sectionName: "Subcategory Details", sectionOrder: 4 },
      ],
      "Home Decor": [
        ...furniturePostingCommonFields,
        { key: "decor_type", label: "Decor Type", options: ["Wall Art", "Lighting", "Rugs", "Curtains"], sectionName: "Subcategory Details", sectionOrder: 4 },
        { key: "style", label: "Style", options: ["Modern", "Traditional", "Vintage", "Minimalist"], sectionName: "Subcategory Details", sectionOrder: 4 },
      ],
      Kitchen: [
        ...furniturePostingCommonFields,
        { key: "kitchen_item_type", label: "Kitchen Item Type", options: ["Cabinet", "Island", "Storage", "Bar Stool", "Dining Table"], sectionName: "Subcategory Details", sectionOrder: 4 },
      ],
    },
  },
  "Furniture & Home Decor": {
    default: categoryAttributeFieldsByCategory["Furniture & Home Decor"],
  },
  "Fashion & Lifestyle": {
    default: categoryAttributeFieldsByCategory["Fashion & Lifestyle"],
    subCategories: {
      Men: [
        { key: "itemType", label: "Item Type", options: ["Clothing", "Footwear"] },
        { key: "brand", label: "Brand" },
        { key: "size", label: "Size" },
        { key: "fit", label: "Fit" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
      ],
      Women: [
        { key: "itemType", label: "Item Type", options: ["Clothing", "Footwear"] },
        { key: "brand", label: "Brand" },
        { key: "size", label: "Size" },
        { key: "color", label: "Color" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
      ],
      Kids: [
        { key: "itemType", label: "Item Type", options: ["Clothing", "Footwear"] },
        { key: "ageGroup", label: "Age Group" },
        { key: "brand", label: "Brand" },
        { key: "size", label: "Size" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
      ],
      Accessories: [
        { key: "accessoryType", label: "Accessory Type" },
        { key: "brand", label: "Brand" },
        { key: "material", label: "Material" },
        { key: "authenticity", label: "Authenticity", options: ["Original", "Replica", "Not Applicable"] },
        { key: "condition", label: "Condition", options: commonConditionOptions },
      ],
    },
    detailedCategories: {
      Jewelry: [
        { key: "jewelryType", label: "Jewelry Type" },
        { key: "metal", label: "Metal" },
        { key: "purity", label: "Purity" },
        { key: "weight", label: "Weight" },
        { key: "certificateAvailable", label: "Certificate Available", options: ["Yes", "No"] },
      ],
      Watches: [
        { key: "brand", label: "Brand" },
        { key: "watchType", label: "Watch Type", options: ["Analog", "Digital", "Smartwatch"] },
        { key: "condition", label: "Condition", options: commonConditionOptions },
        { key: "boxAvailable", label: "Box Available", options: ["Yes", "No"] },
      ],
    },
  },
  "Pets & Animals": {
    default: categoryAttributeFieldsByCategory["Pets & Animals"],
    subCategories: {
      Dogs: petDogFields,
      Cats: petCatFields,
      Birds: petBirdFields,
      "Fish & Aquariums": petFishFields,
      "Small Pets": petPostingCommonFields,
      "Reptiles & Amphibians": petPostingCommonFields,
      "Horses & Livestock": petPostingCommonFields,
      "Pet Adoption": petPostingCommonFields,
      "Pet Services": petServiceFields,
      "Pet Supplies & Accessories": petPostingCommonFields,
      "Pet Boarding & Daycare": petServiceFields,
      "Lost & Found Pets": petLostFoundFields,
    },
    detailedCategories: {
      "Puppies for Adoption": petDogFields,
      "Adult Dogs": petDogFields,
      "Purebred Dogs": petDogFields,
      "Mixed Breed Dogs": petDogFields,
      "Dog Breeding Services": petDogFields,
      "Kittens for Adoption": petCatFields,
      "Adult Cats": petCatFields,
      "Purebred Cats": petCatFields,
      "Mixed Breed Cats": petCatFields,
      Parrots: petBirdFields,
      Cockatiels: petBirdFields,
      "Love Birds": petBirdFields,
      Canaries: petBirdFields,
      "Exotic Birds": petBirdFields,
      "Freshwater Fish": petFishFields,
      "Saltwater Fish": petFishFields,
      "Aquarium Setup": petFishFields,
      "Aquarium Accessories": petFishFields,
      "Dog Adoption": petDogFields,
      "Cat Adoption": petCatFields,
      "Bird Adoption": petBirdFields,
      "Pet Grooming": petServiceFields,
      "Pet Training": petServiceFields,
      "Veterinary Services": petServiceFields,
      "Pet Walking": petServiceFields,
      "Pet Sitting": petServiceFields,
      "Overnight Boarding": petServiceFields,
      "Pet Daycare": petServiceFields,
      "Luxury Pet Hotels": petServiceFields,
      "Long-Term Boarding": petServiceFields,
      "Lost Dogs": petLostFoundFields,
      "Lost Cats": petLostFoundFields,
      "Found Pets": petLostFoundFields,
      "Pet Recovery Services": petLostFoundFields,
    },
  },
  "Books, Sports & Hobbies": {
    default: categoryAttributeFieldsByCategory["Books, Sports & Hobbies"],
    subCategories: {
      Books: [
        { key: "bookType", label: "Book Type" },
        { key: "authorOrPublisher", label: "Author / Publisher" },
        { key: "classOrLevel", label: "Class / Level" },
        { key: "language", label: "Language" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
      ],
      "Sports Equipment": [
        { key: "sportType", label: "Sport Type" },
        { key: "brand", label: "Brand" },
        { key: "sizeOrWeight", label: "Size / Weight" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
        { key: "includedItems", label: "Included Items" },
      ],
      "Musical Instruments": [
        { key: "instrumentType", label: "Instrument Type" },
        { key: "brand", label: "Brand" },
        { key: "model", label: "Model" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
        { key: "accessoriesIncluded", label: "Accessories Included" },
      ],
      "Hobby Items": [
        { key: "hobbyType", label: "Hobby Type" },
        { key: "collectionSize", label: "Collection Size" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
        { key: "authenticity", label: "Authenticity" },
      ],
    },
  },
  Jobs: {
    default: categoryAttributeFieldsByCategory.Jobs,
  },
  "Jobs / Services": {
    default: categoryAttributeFieldsByCategory["Jobs / Services"],
    subCategories: {
      "Job Listings": [
        { key: "companyName", label: "Company Name" },
        { key: "jobType", label: "Job Type", options: ["Full Time", "Part Time", "Contract", "Internship"] },
        { key: "experienceRequired", label: "Experience Required" },
        { key: "qualification", label: "Qualification" },
        { key: "salaryRange", label: "Salary Range" },
        { key: "workMode", label: "Work Mode", options: ["Onsite", "Remote", "Hybrid"] },
        { key: "lastDateToApply", label: "Last Date To Apply", type: "date" },
      ],
      "Freelance Services": [
        { key: "serviceType", label: "Service Type" },
        { key: "providerType", label: "Provider Type", options: ["Individual", "Agency", "Trainer"] },
        { key: "experience", label: "Experience" },
        { key: "serviceFee", label: "Service Fee" },
        { key: "availability", label: "Availability" },
        { key: "serviceMode", label: "Service Mode", options: ["Online", "Offline", "Both"] },
      ],
    },
  },
  "Business & Industrial": {
    default: categoryAttributeFieldsByCategory["Business & Industrial"],
    subCategories: {
      Machinery: [
        { key: "machineType", label: "Machine Type" },
        { key: "brand", label: "Brand" },
        { key: "model", label: "Model" },
        { key: "manufacturingYear", label: "Manufacturing Year", type: "number" },
        { key: "capacity", label: "Capacity / Specification" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
      ],
      "Industrial Supplies": [
        { key: "supplyType", label: "Supply Type" },
        { key: "brand", label: "Brand" },
        { key: "specification", label: "Specification" },
        { key: "quantity", label: "Quantity" },
        { key: "minimumOrderQuantity", label: "Minimum Order Quantity" },
      ],
      "Bulk Products": [
        { key: "productType", label: "Product Type" },
        { key: "grade", label: "Grade / Quality" },
        { key: "quantityAvailable", label: "Quantity Available" },
        { key: "minimumOrderQuantity", label: "Minimum Order Quantity" },
        { key: "packagingType", label: "Packaging Type" },
      ],
    },
  },
  "Events & Tickets": {
    default: categoryAttributeFieldsByCategory["Events & Tickets"],
  },
  "Tickets & Events": {
    default: categoryAttributeFieldsByCategory["Events & Tickets"],
  },
};

export default function ListingFormPage({ mode = "listing" }: { mode?: ListingFormMode } = {}) {
  const isClassifiedMode = mode === "classified";
  const [form, setForm] = useState<FormState>(initialForm);
  const [sellerName, setSellerName] = useState(
    localStorage.getItem("fullName") ||
      localStorage.getItem("customer_name") ||
      "",
  );
  const [services, setServices] = useState<ServiceItem[]>([
    { name: "", imageName: "" },
    { name: "", imageName: "" },
  ]);
  const [offers, setOffers] = useState<OfferItem[]>([
    { name: "", price: "", detail: "", imageName: "", link: "" },
  ]);
  const [infoItems, setInfoItems] = useState<InfoItem[]>(
    Array.from({ length: 6 }, () => ({ question: "", answer: "" })),
  );
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(defaultBusinessHours);
  const [contactInfo, setContactInfo] = useState<ContactInfo>(initialContactInfo);
  const [webLinks, setWebLinks] = useState<WebLinks>(initialWebLinks);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(initialSocialLinks);
  const [products, setProducts] = useState<string[]>([""]);
  const [brands, setBrands] = useState<string[]>([""]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>(initialPaymentMethods);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo>(initialRestaurantInfo);
  const [restaurantMenuItems, setRestaurantMenuItems] = useState<RestaurantMenuItem[]>([{ ...initialRestaurantMenuItem }]);
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttributes>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [editLockedMessage, setEditLockedMessage] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<GalleryUploadFile[]>([]);
  const [serviceFiles, setServiceFiles] = useState<InlineUploadFile[]>([]);
  const [offerFiles, setOfferFiles] = useState<InlineUploadFile[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [listingCategories, setListingCategories] = useState<ListingCategoryOption[]>(
    fallbackListingCategoryTree.filter((item) => supportedListingCategoryNameSet.has(item.name)),
  );
  const [dynamicCategoryFields, setDynamicCategoryFields] = useState<CategoryAttributeField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [selectingPlanCode, setSelectingPlanCode] = useState("");
  const [plansModalMessage, setPlansModalMessage] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [savedListingId, setSavedListingId] = useState<number | null>(null);
  const pricingSaveStartedRef = useRef(false);
  const planSelectionTouchedRef = useRef(false);
  const pendingValidationScrollRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { listingId } = useParams();
  const [searchParams] = useSearchParams();
  const editListingId = numberOrNull(listingId);
  const duplicateListingId = numberOrNull(searchParams.get("duplicate") || undefined);
  const sourceListingId = editListingId || duplicateListingId;
  const isEditMode = Boolean(editListingId);
  const isRealEstateListing = !isClassifiedMode && isRealEstateCategory(form.categoryName);
  const isRestaurantListing = !isClassifiedMode && form.categoryName === "Restaurants & Food";
  const isRoommatesRentalListing = !isClassifiedMode && form.categoryName === "Roommates & Rentals";
  const isJobsListing = !isClassifiedMode && form.categoryName === "Jobs";
  const isElectronicsListing = !isClassifiedMode && isElectronicsCategoryName(form.categoryName);
  const isPetsListing = !isClassifiedMode && form.categoryName === "Pets & Animals";

  useEffect(() => {
    if (isClassifiedMode) {
      setCurrentStep(getClassifiedListingStepIndex(location.pathname));
    }
  }, [isClassifiedMode, location.pathname]);

  useEffect(() => {
    if (!pendingValidationScrollRef.current || !Object.keys(fieldErrors).length) {
      return;
    }

    pendingValidationScrollRef.current = false;
    scrollToFirstValidationError();
  }, [currentStep, fieldErrors]);

  useEffect(() => {
    let isActive = true;
    getMyPlanUsage()
      .then((usage) => {
        if (isActive) {
          setPlanUsage(usage);
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    setIsPlansLoading(true);
    getPricingPlans()
      .then((plans) => {
        if (isActive) {
          setPricingPlans(plans);
        }
      })
      .catch(() => {
        if (isActive) {
          setPricingPlans([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsPlansLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const activePlanName = planUsage?.requiresPlanSelection || planUsage?.isPlanExpired ? "" : planUsage?.plan?.name;
    if (!activePlanName) {
      return;
    }

    setForm((currentForm) => {
      if (isEditMode || planSelectionTouchedRef.current) {
        return currentForm;
      }

      return currentForm.adType === activePlanName ? currentForm : { ...currentForm, adType: activePlanName };
    });
  }, [isEditMode, planUsage?.isPlanExpired, planUsage?.plan?.name, planUsage?.requiresPlanSelection]);

  useEffect(() => {
    if (!pricingPlans.length) {
      return;
    }

    setForm((currentForm) => {
      if (!isEditMode && !planSelectionTouchedRef.current && planUsage?.plan?.name && !planUsage.requiresPlanSelection && !planUsage.isPlanExpired) {
        const activePlan = getSelectedPricingPlan(pricingPlans, planUsage.plan.name);
        const activePlanName = activePlan?.name || planUsage.plan.name;
        return currentForm.adType === activePlanName ? currentForm : { ...currentForm, adType: activePlanName };
      }

      const selectedPlan = getSelectedPricingPlan(pricingPlans, currentForm.adType);
      if (selectedPlan && currentForm.adType !== selectedPlan.name) {
        return { ...currentForm, adType: selectedPlan.name };
      }

      if (!selectedPlan && isDefaultListingPlanValue(currentForm.adType)) {
        return { ...currentForm, adType: pricingPlans[0].name };
      }

      return currentForm;
    });
  }, [isEditMode, planUsage?.isPlanExpired, planUsage?.plan?.name, planUsage?.requiresPlanSelection, pricingPlans]);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.id === form.countryId) || countries.find((country) => country.name === form.country),
    [countries, form.country, form.countryId],
  );
  const currencyCountry = selectedCountry?.name || form.country;
  const selectedState = useMemo(
    () => states.find((state) => state.id === form.stateId) || states.find((state) => state.name === form.state),
    [states, form.state, form.stateId],
  );
  useEffect(() => {
    let isActive = true;

    getListingCategoryTree()
      .then((items) => {
        if (isActive) {
          const supportedItems = items.filter((item) => supportedListingCategoryNameSet.has(item.name));
          if (supportedItems.length) {
            setListingCategories(mergeListingCategoryOptions(
              fallbackListingCategoryTree.filter((item) => supportedListingCategoryNameSet.has(item.name)),
              supportedItems,
            ));
          }
        }
      })
      .catch(() => {
        // Keep the local document-backed fallback visible if the API is unavailable.
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    getLocationCountries()
      .then((items) => {
        if (isActive) {
          setCountries(items);
        }
      })
      .catch(() => {
        if (isActive) {
          setCountries([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!shouldDefaultCountryToUsa(form.categoryName) || form.country || !countries.length) {
      return;
    }

    const defaultCountry = countries.find((country) =>
      ["United States", "United States of America", "USA", "US"].includes(country.name)
    );

    if (defaultCountry) {
      setForm((currentForm) => ({
        ...currentForm,
        country: defaultCountry.name,
        countryId: defaultCountry.id,
      }));
    }
  }, [countries, form.categoryName, form.country]);

  useEffect(() => {
    let isActive = true;

    if (!selectedCountry?.id) {
      setStates([]);
      return () => {
        isActive = false;
      };
    }

    getLocationStates(selectedCountry.id)
      .then((items) => {
        if (isActive) {
          setStates(items);
        }
      })
      .catch(() => {
        if (isActive) {
          setStates([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedCountry?.id]);

  useEffect(() => {
    let isActive = true;

    if (!selectedState?.id) {
      setCities([]);
      return () => {
        isActive = false;
      };
    }

    getLocationCities(selectedState.id)
      .then((items) => {
        if (isActive) {
          setCities(items);
        }
      })
      .catch(() => {
        if (isActive) {
          setCities([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedState?.id]);

  useEffect(() => {
    let isActive = true;

    getMyProfile()
      .then(({ profile }) => {
        if (!isActive) return;
        setForm((currentForm) => ({
          ...currentForm,
          email: profile.email || currentForm.email,
          mobileNumber: profile.mobileNumber || currentForm.mobileNumber,
        }));
        setContactInfo((currentContact) => ({
          ...currentContact,
          email: currentContact.email || profile.email || "",
          mainPhone: currentContact.mainPhone || profile.mobileNumber || "",
        }));
        setCategoryAttributes((currentAttributes) => applyCareContactDefaults(currentAttributes, {
          name: profile.fullName || sellerName,
          phone: profile.mobileNumber,
          email: profile.email,
        }));
        setSellerName(profile.fullName || sellerName);
      })
      .catch(() => {
        if (!isActive) return;
        const storedSellerName =
          localStorage.getItem("fullName") ||
          localStorage.getItem("customer_name") ||
          "";
        setForm((currentForm) => ({
          ...currentForm,
          email: localStorage.getItem("email") || currentForm.email,
          mobileNumber:
            localStorage.getItem("mobileNumber") ||
            localStorage.getItem("mobile_number") ||
            currentForm.mobileNumber,
        }));
        setContactInfo((currentContact) => ({
          ...currentContact,
          email: currentContact.email || localStorage.getItem("email") || "",
          mainPhone:
            currentContact.mainPhone ||
            localStorage.getItem("mobileNumber") ||
            localStorage.getItem("mobile_number") ||
            "",
        }));
        setCategoryAttributes((currentAttributes) => applyCareContactDefaults(currentAttributes, {
          name: storedSellerName,
          phone: localStorage.getItem("mobileNumber") || localStorage.getItem("mobile_number") || "",
          email: localStorage.getItem("email") || "",
        }));
        setSellerName(storedSellerName);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (form.categoryName !== "Care Services") {
      return;
    }

    setCategoryAttributes((currentAttributes) => applyCareContactDefaults(currentAttributes, {
      name: sellerName,
      phone: form.mobileNumber,
      email: form.email,
      website: form.website,
    }));
  }, [form.categoryName, form.email, form.mobileNumber, form.website, sellerName]);

  useEffect(() => {
    if (!sourceListingId) {
      return;
    }

    let isActive = true;
    setErrorMessage("");
    setEditLockedMessage("");

    getListing(sourceListingId)
      .then((listing) => {
        if (!isActive) return;
        if (isEditMode && listing.canEdit === false) {
          setEditLockedMessage("This listing has been rejected 3 times and can no longer be edited.");
        }
        const propertyDetails = listing.propertyDetails || {};
        const otherInformation = parseListingOtherInformation(propertyDetails.otherInformation);
        setForm((currentForm) => mapListingToForm(listing, currentForm, !isEditMode, mode));
        setServices(parseServiceItems(propertyDetails.services));
        setOffers(parseJsonArray<OfferItem>(propertyDetails.offers, [{ name: "", price: "", detail: "", imageName: "", link: "" }]));
        setInfoItems(otherInformation.items);
        setBusinessHours(parseJsonArray<BusinessHour>(propertyDetails.businessHours, defaultBusinessHours));
        setContactInfo(parseJsonObject<ContactInfo>(propertyDetails.additionalContactInfo, initialContactInfo));
        setWebLinks(parseJsonObject<WebLinks>(propertyDetails.webLinks, initialWebLinks));
        setSocialLinks(parseJsonObject<SocialLinks>(propertyDetails.socialLinks, initialSocialLinks));
        setProducts(parseJsonArray<string>(propertyDetails.products, [""]));
        setBrands(parseJsonArray<string>(propertyDetails.brands, [""]));
        setPaymentMethods(parseJsonObject<PaymentMethods>(propertyDetails.paymentMethods, initialPaymentMethods));
        setRestaurantInfo(mapRestaurantInfoFromListing(listing, propertyDetails));
        setRestaurantMenuItems(mapRestaurantMenuItemsFromListing(listing));
        setBusinessHours(mapRestaurantHoursFromListing(listing, propertyDetails));
        setCategoryAttributes({
          ...otherInformation.categoryAttributes,
          ...mapPropertyAttributesFromListing(listing),
          ...mapRestaurantAttributesFromListing(listing),
          ...mapVehicleAttributesFromListing(listing),
          ...mapElectronicsAttributesFromListing(listing),
          ...mapCareServiceAttributesFromListing(listing),
        });
        setServiceFiles([]);
        setOfferFiles([]);
        setSavedListingId(isEditMode ? listing.id : null);
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(getListingApiErrorMessage(error));
        }
      });

    return () => {
      isActive = false;
    };
  }, [sourceListingId, isEditMode, mode]);

  useEffect(() => {
    const pricingState = location.state as ListingPricingState | null;
    const draft = pricingState?.pendingListingDraft;

    if (!draft) {
      return;
    }

    setForm(draft.form);
    setSellerName(draft.sellerName);
    setServices(draft.services);
    setOffers(draft.offers);
    setInfoItems(draft.infoItems);
    setBusinessHours(draft.businessHours);
    setContactInfo(draft.contactInfo);
    setWebLinks(draft.webLinks);
    setSocialLinks(draft.socialLinks);
    setProducts(draft.products);
    setBrands(draft.brands);
    setPaymentMethods(draft.paymentMethods);
    setRestaurantInfo(draft.restaurantInfo);
    setRestaurantMenuItems(draft.restaurantMenuItems);
    setCategoryAttributes(draft.categoryAttributes);
    setProfileImageFile(draft.profileImageFile);
    setCoverImageFile(draft.coverImageFile);
    setGalleryFiles(draft.galleryFiles);
    setServiceFiles(draft.serviceFiles);
    setOfferFiles(draft.offerFiles);
    setCurrentStep(4);

    if (pricingState?.pricingConfirmed && !pricingSaveStartedRef.current) {
      pricingSaveStartedRef.current = true;
      void saveListing(draft).then((wasSaved) => {
        if (wasSaved) {
          navigate(location.pathname, { replace: true, state: null });
        }
      });
    }
  }, [location.pathname, location.state, navigate]);

  const categoryOptions = useMemo(
    () => includeCurrentValue(listingCategories.map((category) => category.name), form.categoryName),
    [listingCategories, form.categoryName],
  );

  const selectedListingCategory = useMemo(
    () => listingCategories.find((category) => category.name === form.categoryName),
    [listingCategories, form.categoryName],
  );

  const selectedListingSubCategory = useMemo(
    () => selectedListingCategory?.subCategories.find((subCategory) => subCategory.name === form.subCategory),
    [selectedListingCategory, form.subCategory],
  );

  const selectedListingDetailedCategory = useMemo(
    () => selectedListingSubCategory?.detailedCategories.find((detailCategory) => detailCategory.name === form.detailCategory),
    [selectedListingSubCategory, form.detailCategory],
  );

  const subCategoryOptions = useMemo(
    () => includeCurrentValue(selectedListingCategory?.subCategories.map((subCategory) => subCategory.name) || [], form.subCategory),
    [selectedListingCategory, form.subCategory],
  );

  const detailCategoryOptions = useMemo(
    () => includeCurrentValue(
      mergeStringOptions(
        selectedListingSubCategory?.detailedCategories.map((detailCategory) => detailCategory.name) || [],
        getFallbackDetailedCategoryOptions(form.categoryName, form.subCategory),
      ),
      form.detailCategory,
    ),
    [selectedListingSubCategory, form.categoryName, form.detailCategory, form.subCategory],
  );
  const effectiveDynamicCategoryFields = useMemo(
    () => mergeCategoryPostingFields(dynamicCategoryFields, form.categoryName, form.subCategory, form.detailCategory),
    [dynamicCategoryFields, form.categoryName, form.detailCategory, form.subCategory],
  );
  const hasDynamicCategoryFields = !isRealEstateListing && effectiveDynamicCategoryFields.length > 0;
  const hasDynamicPriceField = !isRealEstateListing && hasAnyFieldKey(effectiveDynamicCategoryFields, "price", "listing_price", "total_price", "monthly_rent", "sale_price", "vehicle_price");
  const shouldRenderFallbackPriceField = !hasDynamicPriceField &&
    form.categoryName !== "Restaurants & Food" &&
    !isEventsListingCategory(form.categoryName) &&
    !(form.categoryName === "Vehicles" && isVehicleRentalSubCategory(form.subCategory));

  useEffect(() => {
    let isActive = true;

    if (!selectedListingCategory?.id) {
      setDynamicCategoryFields([]);
      return () => {
        isActive = false;
      };
    }

    const fieldsRequest = isClassifiedMode
      ? getClassifiedSpecificationFields(selectedListingCategory.id, selectedListingSubCategory?.id, selectedListingDetailedCategory?.id)
      : getListingCategoryFields(
          selectedListingCategory.id,
          selectedListingSubCategory?.id,
          selectedListingDetailedCategory?.id,
        );

    fieldsRequest
      .then((fields) => {
        if (isActive) {
          setDynamicCategoryFields(fields.map(mapDynamicFieldDefinition));
        }
      })
      .catch(() => {
        if (isActive) {
          setDynamicCategoryFields([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isClassifiedMode, selectedListingCategory?.id, selectedListingSubCategory?.id, selectedListingDetailedCategory?.id]);

  function updateField(name: StringFormField, value: string) {
    if (name === "adType") {
      planSelectionTouchedRef.current = true;
    }

    clearFieldError(name);
    setForm((currentForm) => {
      const nextForm = { ...currentForm, [name]: value };

      if (name === "categoryName") {
        nextForm.subCategory = "";
        nextForm.detailCategory = "";
        if (shouldDefaultCountryToUsa(value) && !nextForm.country) {
          nextForm.country = "United States";
        }
        if (value === "Restaurants & Food" && !["30", "60", "90"].includes(nextForm.adDurationDays)) {
          nextForm.adDurationDays = "30";
        }
        if (value === "Care Services" && !["15", "30", "60"].includes(nextForm.adDurationDays)) {
          nextForm.adDurationDays = "30";
        }
        if (!isClassifiedMode && isRealEstateCategory(value)) {
          nextForm.sellerType = "";
        }
        setCategoryAttributes({});
      }

      if (name === "country") {
        nextForm.countryId = null;
        nextForm.stateId = null;
        nextForm.cityId = null;
        nextForm.state = "";
        nextForm.city = "";
        nextForm.pincode = "";
      }

      if (name === "state") {
        nextForm.stateId = null;
        nextForm.cityId = null;
        nextForm.city = "";
        nextForm.pincode = "";
      }

      if (name === "city") {
        nextForm.cityId = null;
      }

      if (name === "subCategory") {
        nextForm.detailCategory = "";
        setCategoryAttributes({});
        nextForm.propertyType = "";
        nextForm.bhk = "";
        nextForm.bathrooms = "";
        nextForm.balconies = "";
        nextForm.furnishingType = "";
        nextForm.superBuiltUpArea = "";
        nextForm.carpetArea = "";
        nextForm.floorNumber = "";
        nextForm.totalFloors = "";
        nextForm.propertyAge = "";
        nextForm.availabilityType = "";
        nextForm.availabilityDate = "";
        nextForm.plotArea = "";
        nextForm.length = "";
        nextForm.breadth = "";
        nextForm.boundaryWall = "";
        nextForm.facing = "";
        nextForm.approvalType = "";
        nextForm.roadWidth = "";
        nextForm.area = "";
        nextForm.washrooms = "";
        nextForm.parking = "";
        nextForm.suitableFor = "";
        nextForm.roomType = "";
        nextForm.genderPreference = "";
        nextForm.foodIncluded = "";
        nextForm.pgAmenities = "";
      }

      if (name === "detailCategory") {
        nextForm.propertyType = value;
        setCategoryAttributes({});
      }

      return nextForm;
    });
  }

  function updateCategoryAttributes(values: CategoryAttributes) {
    setCategoryAttributes(values);
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      for (const key of Object.keys(values)) {
        if (String(values[key] || "").trim()) {
          delete nextErrors[categoryFieldErrorKey(key)];
        }
      }
      return nextErrors;
    });
  }

  function updateCountry(value: string) {
    clearFieldError("country");
    const country = countries.find((item) => item.name === value);
    setForm((currentForm) => ({
      ...currentForm,
      country: value,
      countryId: country?.id ?? null,
      state: "",
      stateId: null,
      city: "",
      cityId: null,
      pincode: "",
    }));
  }

  function updateState(value: string) {
    clearFieldError("state");
    const state = states.find((item) => item.name === value);
    setForm((currentForm) => ({
      ...currentForm,
      state: value,
      stateId: state?.id ?? null,
      city: "",
      cityId: null,
      pincode: "",
    }));
  }

  function updateCity(value: string) {
    clearFieldError("city");
    const city = cities.find((item) => item.name === value);
    setForm((currentForm) => ({
      ...currentForm,
      city: value,
      cityId: city?.id ?? null,
    }));
  }

  async function handleSelectPlan(plan: PricingPlan) {
    setSelectingPlanCode(plan.code);
    setPlansModalMessage("");
    try {
      const nextUsage = await selectPricingPlan(plan.code);
      setPlanUsage(nextUsage);
      updateField("adType", plan.name);
      setIsPlansModalOpen(false);
    } catch {
      setPlansModalMessage("Unable to select this plan. Please try again.");
    } finally {
      setSelectingPlanCode("");
    }
  }

  async function openPlansModal() {
    setPlansModalMessage("");
    setIsPlansModalOpen(true);

    if (pricingPlans.length || isPlansLoading) {
      return;
    }

    setIsPlansLoading(true);
    try {
      const plans = await getPricingPlans();
      setPricingPlans(plans);
      if (!plans.length) {
        setPlansModalMessage("Plans are not available right now.");
      }
    } catch {
      setPlansModalMessage("Unable to load pricing plans. Please try again.");
    } finally {
      setIsPlansLoading(false);
    }
  }

  function clearFieldError(name: string) {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  async function ensureAndApplyResolvedLocation(details: {
    countryName: string;
    countryCode?: string;
    stateName: string;
    cityName: string;
    address?: string;
    pincode?: string;
    latitude?: string;
    longitude?: string;
  }, expectedPincode?: string) {
    const matchedCountry = countries.find((item) =>
      namesMatch(item.name, details.countryName) ||
      (!!details.countryCode && item.code.trim().toLowerCase() === details.countryCode.trim().toLowerCase())
    );
    const countryName = matchedCountry?.name || form.country || details.countryName;
    const stateName = details.stateName.trim();
    const cityName = details.cityName.trim();

    let ensuredCountry = matchedCountry;
    let ensuredState: StateOption | null = states.find((item) => namesMatch(item.name, stateName)) || null;
    let ensuredCity: CityOption | null = cities.find((item) => namesMatch(item.name, cityName)) || null;

    if (countryName && (stateName || cityName)) {
      try {
        const ensured = await ensureLocationMaster({
          countryName,
          countryCode: matchedCountry?.code || details.countryCode || "",
          stateName,
          cityName,
        });

        ensuredCountry = ensured.country;
        ensuredState = ensured.state || ensuredState;
        ensuredCity = ensured.city || ensuredCity;

        if (ensured.state) {
          setStates((currentStates) => includeLocationOption(currentStates, ensured.state!));
        }

        if (ensured.city) {
          setCities((currentCities) => includeLocationOption(currentCities, ensured.city!));
        }
      } catch {
        // Keep the looked-up names visible even if the DB ensure call is unavailable.
      }
    }

    setForm((currentForm) => {
      if (expectedPincode && currentForm.pincode.trim() !== expectedPincode) {
        return currentForm;
      }

      return {
        ...currentForm,
        address: details.address || currentForm.address,
        pincode: details.pincode || currentForm.pincode,
        latitude: details.latitude || currentForm.latitude,
        longitude: details.longitude || currentForm.longitude,
        country: ensuredCountry?.name || countryName || currentForm.country,
        countryId: ensuredCountry?.id ?? currentForm.countryId,
        state: ensuredState?.name || stateName || currentForm.state,
        stateId: ensuredState?.id ?? currentForm.stateId,
        city: ensuredCity?.name || cityName || currentForm.city,
        cityId: ensuredCity?.id ?? currentForm.cityId,
      };
    });

    clearFieldError("address");
    clearFieldError("pincode");
    clearFieldError("country");
    clearFieldError("state");
    clearFieldError("city");
  }

  useEffect(() => {
    const pincode = form.pincode.trim();

    if (!/^\d{5}(-\d{4})?$/.test(pincode) && !/^\d{6}$/.test(pincode)) {
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      lookupPostalCodeLocation(pincode, form.country || undefined, controller.signal)
        .then((location) => {
          if (!location || form.pincode.trim() !== pincode) {
            return;
          }

          const resolvedCityName = location.city || location.district;
          void ensureAndApplyResolvedLocation({
            countryName: location.country,
            countryCode: location.countryCode,
            stateName: location.state,
            cityName: resolvedCityName,
            pincode,
            latitude: location.latitude,
            longitude: location.longitude,
          }, pincode);

          if (form.categoryName === "Restaurants & Food") {
            setContactInfo((currentContactInfo) => {
              if ((currentContactInfo.zipcode || form.pincode).trim() !== pincode) {
                return currentContactInfo;
              }

              return {
                ...currentContactInfo,
                state: location.state || currentContactInfo.state,
                city: resolvedCityName || currentContactInfo.city,
              };
            });
          }
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
        });
    }, 500);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [cities, countries, form.categoryName, form.country, form.pincode, states]);

  const handleAddressPlaceSelect = useCallback((addressDetails: ListingAddressDetails) => {
    void ensureAndApplyResolvedLocation({
      countryName: addressDetails.country,
      stateName: addressDetails.state,
      cityName: addressDetails.city,
      address: addressDetails.address,
      pincode: addressDetails.pincode,
      latitude: addressDetails.latitude,
      longitude: addressDetails.longitude,
    });
  }, [cities, countries, form.country, states]);

  const handleRestaurantAddressPlaceSelect = useCallback((addressDetails: ListingAddressDetails) => {
    const countryName = addressDetails.country || form.country || "United States";

    setContactInfo((currentContactInfo) => ({
      ...currentContactInfo,
      streetAddress: addressDetails.address || currentContactInfo.streetAddress,
      zipcode: addressDetails.pincode || currentContactInfo.zipcode,
      city: addressDetails.city || currentContactInfo.city,
      state: addressDetails.state || currentContactInfo.state,
    }));

    void ensureAndApplyResolvedLocation({
      countryName,
      stateName: addressDetails.state,
      cityName: addressDetails.city,
      address: addressDetails.address,
      pincode: addressDetails.pincode,
      latitude: addressDetails.latitude,
      longitude: addressDetails.longitude,
    });

    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors.restaurantStreetAddress;
      delete nextErrors.restaurantZipcode;
      delete nextErrors.restaurantCity;
      delete nextErrors.restaurantState;
      return nextErrors;
    });
  }, [cities, countries, form.country, states]);

  function handleNext(skipValidation = false) {
    if (!skipValidation) {
      for (let stepToValidate = 0; stepToValidate <= currentStep; stepToValidate += 1) {
        const isVisibleStep = stepToValidate === currentStep;
        if (!validateStep(stepToValidate, isVisibleStep)) {
          if (!isVisibleStep) {
            pendingValidationScrollRef.current = true;
            setCurrentStep(stepToValidate);
            if (isClassifiedMode) {
              window.history.pushState(null, "", getClassifiedListingFormPath(stepToValidate + 1, editListingId));
            }
          }
          return;
        }
      }
    }

    setErrorMessage("");
    setFieldErrors({});
    setCurrentStep((step) => {
      const nextStep = Math.min(step + 1, wizardSteps.length - 1);
      if (isClassifiedMode) {
        window.history.pushState(null, "", getClassifiedListingFormPath(nextStep + 1, editListingId));
      }
      return nextStep;
    });
    scrollToWizardTop();
  }

  function handlePrevious() {
    setErrorMessage("");
    setFieldErrors({});
    setCurrentStep((step) => {
      const nextStep = Math.max(step - 1, 0);
      if (isClassifiedMode) {
        window.history.pushState(null, "", getClassifiedListingFormPath(nextStep + 1, editListingId));
      }
      return nextStep;
    });
    scrollToWizardTop();
  }

  function scrollToWizardTop() {
    window.setTimeout(() => {
      const wizard = document.querySelector<HTMLElement>(".login-reg");
      const headerOffset = 95;
      const top = Math.max((wizard?.getBoundingClientRect().top || 0) + window.scrollY - headerOffset, 0);
      window.scrollTo({ top, behavior: "smooth" });
    }, 0);
  }

  function scrollToFirstValidationError() {
    window.setTimeout(() => {
      const firstInvalidField = document.querySelector<HTMLElement>(".login-main .is-invalid, .login-main .listing-field-error");
      const target = firstInvalidField?.closest<HTMLElement>(".form-group") || firstInvalidField;
      const focusTarget = target?.querySelector<HTMLElement>("input, select, textarea, button") ||
        (firstInvalidField?.matches("input, select, textarea, button") ? firstInvalidField : null);

      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      focusTarget?.focus();
    }, 50);
  }

  function validateStep(step: number, scrollOnError = true) {
    const nextFieldErrors: FieldErrors = {};
    const addFieldError = (name: string, message: string) => {
      if (!nextFieldErrors[name]) {
        nextFieldErrors[name] = message;
      }
    };
    const finishStepValidation = () => {
      if (Object.keys(nextFieldErrors).length) {
        setFieldErrors(nextFieldErrors);
        setErrorMessage("Please fix the required fields shown below.");
        if (scrollOnError) {
          pendingValidationScrollRef.current = true;
        }
        return false;
      }

      setFieldErrors({});
      return true;
    };

    if (step === 1) {
      if (isRealEstateListing) {
        ([
          ["title", "Listing Title"],
          ["businessDescription", "Description"],
          ["country", "Country"],
          ["state", "State"],
          ["city", "City"],
          ["pincode", "ZIP Code"],
          ["address", "Address"],
        ] as Array<[StringFormField, string]>).forEach(([name, label]) => {
          if (!form[name].trim()) {
            addFieldError(name, `${label} is required.`);
          }
        });
      } else {
        if (isRestaurantListing) {
          if (!restaurantInfo.restaurantName.trim()) {
            addFieldError("restaurantName", "Restaurant Name is required.");
          }

          if (!restaurantInfo.description.trim()) {
            addFieldError("restaurantDescription", "Description is required.");
          }

          if (!restaurantInfo.businessType.trim()) {
            addFieldError("restaurantBusinessType", "Business Type is required.");
          }

          const yearEstablished = numberOrNull(restaurantInfo.yearEstablished);
          if (!yearEstablished || yearEstablished < 1800 || yearEstablished > new Date().getFullYear()) {
            addFieldError("restaurantYearEstablished", "Year Established must be a valid year.");
          }

          if (!restaurantInfo.cuisine.trim()) {
            addFieldError("restaurantCuisine", "Cuisine Type is required.");
          }

          if (!restaurantInfo.foodTypes.length) {
            addFieldError("restaurantFoodTypes", "Food Type is required.");
          }
        }

        if (form.categoryName === "Vehicles") {
          addRequiredVehicleCategoryFieldErrors(1, addFieldError);
          addSharedListingLocationErrors(addFieldError);
          return finishStepValidation();
        }

        if (form.categoryName === "Roommates & Rentals") {
          addRequiredRoommatesRentalCategoryFieldErrors(1, addFieldError);
          addSharedListingLocationErrors(addFieldError);
          return finishStepValidation();
        }

        if (isElectronicsCategoryName(form.categoryName)) {
          addRequiredElectronicsCategoryFieldErrors(1, addFieldError);
          return finishStepValidation();
        }

        if (form.categoryName === "Jobs") {
          addRequiredJobCategoryFieldErrors(1, addFieldError);
          addSharedListingLocationErrors(addFieldError);
          return finishStepValidation();
        }

        if (form.categoryName === "Pets & Animals") {
          addRequiredPetCategoryFieldErrors(1, addFieldError);
          addSharedListingLocationErrors(addFieldError);
          return finishStepValidation();
        }

        const missingDetailField = hasDynamicCategoryFields || isClassifiedMode || isRestaurantListing
          ? undefined
          : getRequiredDetailFields(form.subCategory, form.detailCategory).find(([name]) => !form[name].trim());

        if (missingDetailField) {
          addFieldError(missingDetailField[0], `${missingDetailField[1]} is required.`);
        }

        if (shouldRenderFallbackPriceField && !form.price.trim()) {
          addFieldError("price", "Price is required.");
        }

        if (!isRestaurantListing) {
          effectiveDynamicCategoryFields
            .filter((field) => shouldShowCategoryAttributeField(field, categoryAttributes, form))
            .forEach((field) => {
              if (field.isRequired && isMissingRequiredCategoryValue(field, categoryAttributes[field.key])) {
                addFieldError(categoryFieldErrorKey(field.key), `${field.label} is required.`);
              }
            });
          addSharedListingLocationErrors(addFieldError);
        }
      }

      return finishStepValidation();
    }

    if (step === 2 && isRealEstateListing) {
      if (!form.price.trim()) {
        addFieldError("price", isRentRealEstateSubCategory(form.subCategory) ? "Monthly Rent is required." : "Total Price is required.");
      }

      if (!getAttributeValue(categoryAttributes, "price_type").trim()) {
        addFieldError(categoryFieldErrorKey("price_type"), "Price Type is required.");
      }

      if (!getAttributeValue(categoryAttributes, "property_type_group").trim()) {
        addFieldError(categoryFieldErrorKey("property_type_group"), "Property Type is required.");
      }

      if (getAttributeValue(categoryAttributes, "property_type_group") === "Residential") {
        const areaUnit = getAttributeValue(categoryAttributes, "area_unit").trim();
        if (!areaUnit) {
          addFieldError(categoryFieldErrorKey("area_unit"), "Area is required.");
        } else if (areaUnit === "Acres" && !form.plotArea.trim()) {
          addFieldError("plotArea", "Area Acres is required.");
        } else if (areaUnit === "Sq Ft" && !form.superBuiltUpArea.trim()) {
          addFieldError("superBuiltUpArea", "Area Sq Ft is required.");
        }
      }

      if (isRentRealEstateSubCategory(form.subCategory) && !form.securityDeposit.trim()) {
        addFieldError("securityDeposit", "Security Deposit is required.");
      }

      const bathroomsValue = form.bathrooms.trim() || getAttributeValue(categoryAttributes, "bathrooms").trim();
      if (bathroomsValue && !isNonNegativeDecimalText(bathroomsValue)) {
        addFieldError("bathrooms", "Bathrooms must be a valid number.");
      }

      return finishStepValidation();
    }

    if (step === 2 && form.categoryName === "Vehicles") {
      addRequiredVehicleCategoryFieldErrors(2, addFieldError);
      return finishStepValidation();
    }

    if (step === 2 && form.categoryName === "Roommates & Rentals") {
      addRequiredRoommatesRentalCategoryFieldErrors(2, addFieldError);
      return finishStepValidation();
    }

    if (step === 2 && isElectronicsCategoryName(form.categoryName)) {
      addRequiredElectronicsCategoryFieldErrors(2, addFieldError);
      addSharedListingLocationErrors(addFieldError);
      return finishStepValidation();
    }

    if (step === 2 && form.categoryName === "Jobs") {
      addRequiredJobCategoryFieldErrors(2, addFieldError);
      return finishStepValidation();
    }

    if (step === 2 && form.categoryName === "Pets & Animals") {
      addRequiredPetCategoryFieldErrors(2, addFieldError);
      return finishStepValidation();
    }

    if (step === 2 && isRestaurantListing) {
      const restaurantZipcode = contactInfo.zipcode || form.pincode;
      const selectedRestaurantServiceTypes = getSelectedRestaurantServiceTypes(restaurantInfo, categoryAttributes);

      if (!(contactInfo.mainPhone || form.mobileNumber).trim()) {
        addFieldError("restaurantPhone", "Phone is required.");
      }

      if (!(contactInfo.email || form.email).trim()) {
        addFieldError("restaurantEmail", "Email is required.");
      }

      if (!(contactInfo.streetAddress || form.address).trim()) {
        addFieldError("restaurantStreetAddress", "Street Address is required.");
      }

      if (!restaurantZipcode.trim()) {
        addFieldError("restaurantZipcode", "ZIP Code is required.");
      } else if (!/^\d{5}(-\d{4})?$/.test(restaurantZipcode.trim())) {
        addFieldError("restaurantZipcode", "ZIP Code should be a valid US ZIP format.");
      }

      if (!(contactInfo.city || form.city).trim()) {
        addFieldError("restaurantCity", "City is required.");
      }

      if (!(contactInfo.state || form.state).trim()) {
        addFieldError("restaurantState", "State is required.");
      }

      if (!selectedRestaurantServiceTypes.length) {
        addFieldError("restaurantServiceTypes", "At least one Service Type is required.");
      }

      return finishStepValidation();
    }

    if (step === 3 && form.categoryName === "Vehicles") {
      addRequiredVehicleCategoryFieldErrors(3, addFieldError);
      return finishStepValidation();
    }

    if (step === 3 && form.categoryName === "Roommates & Rentals") {
      addRequiredRoommatesRentalCategoryFieldErrors(3, addFieldError);
      return finishStepValidation();
    }

    if (step === 3 && isElectronicsCategoryName(form.categoryName)) {
      addRequiredElectronicsCategoryFieldErrors(3, addFieldError);
      return finishStepValidation();
    }

    if (step === 3 && form.categoryName === "Jobs") {
      addRequiredJobCategoryFieldErrors(3, addFieldError);
      return finishStepValidation();
    }

    if (step === 3 && form.categoryName === "Pets & Animals") {
      addRequiredPetCategoryFieldErrors(3, addFieldError);
      return finishStepValidation();
    }

    if (step === 4 && form.categoryName === "Roommates & Rentals") {
      addRequiredRoommatesRentalCategoryFieldErrors(4, addFieldError);
      return finishStepValidation();
    }

    if (step === 4 && isElectronicsCategoryName(form.categoryName)) {
      addRequiredElectronicsCategoryFieldErrors(4, addFieldError);
      return finishStepValidation();
    }

    if (step === 4 && form.categoryName === "Jobs") {
      addRequiredJobCategoryFieldErrors(4, addFieldError);
      return finishStepValidation();
    }

    if (step === 4 && form.categoryName === "Pets & Animals") {
      addRequiredPetCategoryFieldErrors(4, addFieldError);
      return finishStepValidation();
    }

    if (step === 3 && isRestaurantListing) {
      const isCloudKitchen = ["Cloud Kitchen", "Cloud Kitchen / Delivery Only"].includes(form.subCategory);
      const isCatering = ["Catering", "Catering Services"].includes(form.subCategory);
      const selectedRestaurantServiceTypes = getSelectedRestaurantServiceTypes(restaurantInfo, categoryAttributes);
      const isDeliveryListing = restaurantInfo.deliveryAvailable || selectedRestaurantServiceTypes.includes("Delivery") || isCloudKitchen;
      restaurantMenuItems.forEach((item, index) => {
        if (!item.itemName.trim()) addFieldError(restaurantMenuItemErrorKey(index, "itemName"), "Item Name is required.");
        if (!item.menuCategory.trim()) addFieldError(restaurantMenuItemErrorKey(index, "menuCategory"), "Category is required.");
        if (numberOrNull(item.price) === null) addFieldError(restaurantMenuItemErrorKey(index, "price"), "Price is required.");
        if (!item.foodType.trim()) addFieldError(restaurantMenuItemErrorKey(index, "foodType"), "Veg / Non-Veg is required.");
      });

      if ((isDeliveryListing || selectedRestaurantServiceTypes.includes("Catering") || isCatering) && !restaurantInfo.serviceRadiusMiles.trim()) {
        addFieldError("restaurantServiceRadiusMiles", "Delivery Radius is required for delivery, catering, and cloud kitchen listings.");
      }

      if (isDeliveryListing && !restaurantInfo.deliveryFee.trim()) {
        addFieldError("restaurantDeliveryFee", "Delivery Fee is required when delivery is available.");
      }

      if (isDeliveryListing && !restaurantInfo.minimumOrderValue.trim()) {
        addFieldError("restaurantMinimumOrderValue", "Minimum Order Amount is required when delivery is available.");
      }

      return finishStepValidation();
    }

    if (step !== 0) {
      return true;
    }

    const requiredFields: Array<[StringFormField, string]> = [
      ["mobileNumber", "Mobile Number"],
      ["categoryName", "Category"],
      ["subCategory", "Sub Category"],
    ];

    if (!isClassifiedMode) {
      requiredFields.push(["detailCategory", "Detailed Category"]);
    }

    requiredFields.forEach(([name, label]) => {
      if (!form[name].trim()) {
        addFieldError(name, `${label} is required.`);
      }
    });

    if (!sellerName.trim()) {
      addFieldError("sellerName", "Name is required.");
    }

    if (!form.profileImageName.trim()) {
      addFieldError("profileImageName", "Profile image is required.");
    }

    if (!form.coverImageName.trim()) {
      addFieldError("coverImageName", "Cover image is required.");
    }

    return finishStepValidation();
  }

  function validateListingDetailsForSubmit() {
    const nextFieldErrors: FieldErrors = {};
    let validationTargetStep = 1;
    const addFieldError = (name: string, message: string) => {
      if (!nextFieldErrors[name]) {
        nextFieldErrors[name] = message;
      }
    };

    if (!isClassifiedMode && form.categoryName === "Restaurants & Food" && !validateRestaurantFields()) {
      return false;
    }

    if (!isClassifiedMode && !nextFieldErrors.categoryName && !nextFieldErrors.subCategory && form.categoryName === "Vehicles" && !validateVehicleFields()) {
      return false;
    }

    if (!isClassifiedMode && !nextFieldErrors.categoryName && !nextFieldErrors.subCategory && isElectronicsCategoryName(form.categoryName) && !validateElectronicsFields()) {
      return false;
    }

    if (!isClassifiedMode && !nextFieldErrors.categoryName && !nextFieldErrors.subCategory && form.categoryName === "Care Services" && !validateCareServiceFields()) {
      return false;
    }

    if (!isClassifiedMode && !nextFieldErrors.categoryName && !nextFieldErrors.subCategory && form.categoryName === "Roommates & Rentals" && !validateRoommatesRentalFields()) {
      return false;
    }

    if (!isClassifiedMode && !nextFieldErrors.categoryName && !nextFieldErrors.subCategory && form.categoryName === "Jobs" && !validateJobFields()) {
      return false;
    }

    if (!isClassifiedMode && !nextFieldErrors.categoryName && !nextFieldErrors.subCategory && form.categoryName === "Pets & Animals" && !validatePetFields()) {
      return false;
    }

    if (!isClassifiedMode && !nextFieldErrors.categoryName && !nextFieldErrors.subCategory && isFurnitureCategory(form.categoryName) && !validateFurnitureFields()) {
      return false;
    }

    const missingDetailField = hasDynamicCategoryFields || isRealEstateListing || isClassifiedMode
      ? undefined
      : getRequiredDetailFields(form.subCategory, form.detailCategory).find(([name]) => !form[name].trim());

    if (missingDetailField) {
      addFieldError(missingDetailField[0], `${missingDetailField[1]} is required.`);
    }

    if (!isClassifiedMode && !hasDynamicCategoryFields && form.availabilityType === "Date" && !form.availabilityDate.trim()) {
      addFieldError("availabilityDate", "Availability Date is required.");
    }

    if (!hasDynamicCategoryFields && isRealEstateListing && !form.price.trim()) {
      validationTargetStep = 2;
      addFieldError("price", isRentRealEstateSubCategory(form.subCategory) ? "Monthly Rent is required." : "Total Price is required.");
    }

    if (!hasDynamicCategoryFields && isRealEstateListing && !getAttributeValue(categoryAttributes, "price_type").trim()) {
      validationTargetStep = 2;
      addFieldError(categoryFieldErrorKey("price_type"), "Price Type is required.");
    }

    if (!hasDynamicCategoryFields && isRealEstateListing && !getAttributeValue(categoryAttributes, "property_type_group").trim()) {
      validationTargetStep = 2;
      addFieldError(categoryFieldErrorKey("property_type_group"), "Property Type is required.");
    }

    if (!hasDynamicCategoryFields && isRealEstateListing && getAttributeValue(categoryAttributes, "property_type_group") === "Residential") {
      validationTargetStep = 2;
      const areaUnit = getAttributeValue(categoryAttributes, "area_unit").trim();
      if (!areaUnit) {
        addFieldError(categoryFieldErrorKey("area_unit"), "Area is required.");
      } else if (areaUnit === "Acres" && !form.plotArea.trim()) {
        addFieldError("plotArea", "Area Acres is required.");
      } else if (areaUnit === "Sq Ft" && !form.superBuiltUpArea.trim()) {
        addFieldError("superBuiltUpArea", "Area Sq Ft is required.");
      }

    }

    if (isRealEstateListing || form.categoryName === "Roommates & Rentals") {
      const bathroomsValue = form.bathrooms.trim() || getAttributeValue(categoryAttributes, "bathrooms").trim();
      if (bathroomsValue && !isNonNegativeDecimalText(bathroomsValue)) {
        validationTargetStep = 2;
        addFieldError(form.categoryName === "Roommates & Rentals" ? categoryFieldErrorKey("bathrooms") : "bathrooms", "Bathrooms must be a valid number.");
      }
    }

    if (!hasDynamicCategoryFields && isRealEstateListing && isRentRealEstateSubCategory(form.subCategory) && !form.securityDeposit.trim()) {
      if (!form.securityDeposit.trim()) {
        validationTargetStep = 2;
        addFieldError("securityDeposit", "Security Deposit is required.");
      }
    }

    if (!isRealEstateListing && !isRestaurantListing) {
      effectiveDynamicCategoryFields
        .filter((field) => shouldShowCategoryAttributeField(field, categoryAttributes, form))
        .forEach((field) => {
          if (field.isRequired && isMissingRequiredCategoryValue(field, categoryAttributes[field.key])) {
            addFieldError(categoryFieldErrorKey(field.key), `${field.label} is required.`);
          }
        });
      addSharedListingLocationErrors(addFieldError);
    }

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setErrorMessage("Please fix the required fields shown below.");
      pendingValidationScrollRef.current = true;
      setCurrentStep(validationTargetStep);
      return false;
    }

    setFieldErrors({});
    return true;
  }

  function addSharedListingLocationErrors(addFieldError: (name: string, message: string) => void) {
    if (!shouldUseSharedListingLocationSection(form.categoryName) || isClassifiedMode) {
      return;
    }

    if (!form.country.trim()) addFieldError("country", "Country is required.");
    if (!form.state.trim()) addFieldError("state", "State is required.");
    if (!form.city.trim()) addFieldError("city", "City is required.");
    if (!form.pincode.trim()) addFieldError("pincode", "ZIP Code is required.");
  }

  function addRequiredVehicleCategoryFieldErrors(formStep: number, addFieldError: (name: string, message: string) => void) {
    getVehicleStepCategoryFields(effectiveDynamicCategoryFields, formStep)
      .filter((field) => shouldShowCategoryAttributeField(field, categoryAttributes, form))
      .forEach((field) => {
        if (field.isRequired && isMissingRequiredCategoryValue(field, categoryAttributes[field.key])) {
          addFieldError(categoryFieldErrorKey(field.key), `${field.label} is required.`);
        }
      });
  }

  function addRequiredRoommatesRentalCategoryFieldErrors(formStep: number, addFieldError: (name: string, message: string) => void) {
    getRoommatesRentalStepCategoryFields(effectiveDynamicCategoryFields, formStep)
      .filter((field) => shouldShowCategoryAttributeField(field, categoryAttributes, form))
      .forEach((field) => {
        if (field.isRequired && isMissingRequiredCategoryValue(field, categoryAttributes[field.key])) {
          addFieldError(categoryFieldErrorKey(field.key), `${field.label} is required.`);
        }
      });

  }

  function addRequiredElectronicsCategoryFieldErrors(formStep: number, addFieldError: (name: string, message: string) => void) {
    getElectronicsStepCategoryFields(effectiveDynamicCategoryFields, formStep)
      .filter((field) => shouldShowCategoryAttributeField(field, categoryAttributes, form))
      .forEach((field) => {
        if (field.isRequired && isMissingRequiredCategoryValue(field, categoryAttributes[field.key])) {
          addFieldError(categoryFieldErrorKey(field.key), `${field.label} is required.`);
        }
      });
  }

  function addRequiredJobCategoryFieldErrors(formStep: number, addFieldError: (name: string, message: string) => void) {
    getJobStepCategoryFields(effectiveDynamicCategoryFields, formStep)
      .filter((field) => shouldShowCategoryAttributeField(field, categoryAttributes, form))
      .forEach((field) => {
        if (field.isRequired && isMissingRequiredCategoryValue(field, categoryAttributes[field.key])) {
          addFieldError(categoryFieldErrorKey(field.key), `${field.label} is required.`);
        }
      });
  }

  function addRequiredPetCategoryFieldErrors(formStep: number, addFieldError: (name: string, message: string) => void) {
    getPetStepCategoryFields(effectiveDynamicCategoryFields, formStep)
      .filter((field) => shouldShowCategoryAttributeField(field, categoryAttributes, form))
      .forEach((field) => {
        if (field.isRequired && isMissingRequiredCategoryValue(field, categoryAttributes[field.key])) {
          addFieldError(categoryFieldErrorKey(field.key), `${field.label} is required.`);
        }
      });
  }

  function validateRestaurantFields() {
    const nextFieldErrors: FieldErrors = {};
    let validationTargetStep = 1;
    const addFieldError = (name: string, message: string, targetStep: number) => {
      if (!nextFieldErrors[name]) {
        nextFieldErrors[name] = message;
        validationTargetStep = Math.min(validationTargetStep, targetStep);
      }
    };
    const isCloudKitchen = ["Cloud Kitchen", "Cloud Kitchen / Delivery Only"].includes(form.subCategory);
    const isCatering = ["Catering", "Catering Services"].includes(form.subCategory);
    const selectedRestaurantServiceTypes = getSelectedRestaurantServiceTypes(restaurantInfo, categoryAttributes);
    const isDeliveryListing = restaurantInfo.deliveryAvailable || selectedRestaurantServiceTypes.includes("Delivery") || isCloudKitchen;
    const restaurantZipcode = contactInfo.zipcode || form.pincode;

    if (!restaurantInfo.restaurantName.trim()) {
      addFieldError("restaurantName", "Restaurant Name is required.", 1);
    }

    if (!restaurantInfo.description.trim()) {
      addFieldError("restaurantDescription", "Description is required.", 1);
    }

    if (!restaurantInfo.businessType.trim()) {
      addFieldError("restaurantBusinessType", "Business Type is required.", 1);
    }

    const yearEstablished = numberOrNull(restaurantInfo.yearEstablished);
    if (!yearEstablished || yearEstablished < 1800 || yearEstablished > new Date().getFullYear()) {
      addFieldError("restaurantYearEstablished", "Year Established must be a valid year.", 1);
    }

    if (!restaurantInfo.cuisine.trim()) {
      addFieldError("restaurantCuisine", "Cuisine Type is required.", 1);
    }

    if (!restaurantInfo.foodTypes.length) {
      addFieldError("restaurantFoodTypes", "Food Type is required.", 1);
    }

    if (!selectedRestaurantServiceTypes.length) {
      addFieldError("restaurantServiceTypes", "At least one Service Type is required.", 2);
    }

    if (!(contactInfo.mainPhone || form.mobileNumber).trim()) {
      addFieldError("restaurantPhone", "Phone is required.", 2);
    }

    if (!(contactInfo.email || form.email).trim()) {
      addFieldError("restaurantEmail", "Email is required.", 2);
    }

    if (!(contactInfo.streetAddress || form.address).trim()) {
      addFieldError("restaurantStreetAddress", "Street Address is required.", 2);
    }

    if (!restaurantZipcode.trim()) {
      addFieldError("restaurantZipcode", "ZIP Code is required.", 2);
    } else if (!/^\d{5}(-\d{4})?$/.test(restaurantZipcode.trim())) {
      addFieldError("restaurantZipcode", "ZIP Code should be a valid US ZIP format.", 2);
    }

    if (!(contactInfo.city || form.city).trim()) {
      addFieldError("restaurantCity", "City is required.", 2);
    }

    if (!(contactInfo.state || form.state).trim()) {
      addFieldError("restaurantState", "State is required.", 2);
    }

    if ((selectedRestaurantServiceTypes.includes("Delivery") || selectedRestaurantServiceTypes.includes("Catering") || isCloudKitchen || isCatering) && !restaurantInfo.serviceRadiusMiles.trim()) {
      addFieldError("restaurantServiceRadiusMiles", "Delivery Radius is required for delivery, catering, and cloud kitchen listings.", 3);
    }

    if (isDeliveryListing && !restaurantInfo.deliveryFee.trim()) {
      addFieldError("restaurantDeliveryFee", "Delivery Fee is required when delivery is available.", 3);
    }

    if (isDeliveryListing && !restaurantInfo.minimumOrderValue.trim()) {
      addFieldError("restaurantMinimumOrderValue", "Minimum Order Amount is required when delivery is available.", 3);
    }

    if (form.subCategory === "Bars & Beverages" && !restaurantInfo.alcoholLicenseNumber.trim()) {
      addFieldError("restaurantAlcoholLicenseNumber", "Alcohol License is required for Bars & Beverages.", 4);
    }

    restaurantMenuItems.forEach((item, index) => {
      if (!item.itemName.trim()) addFieldError(restaurantMenuItemErrorKey(index, "itemName"), "Item Name is required.", 3);
      if (!item.menuCategory.trim()) addFieldError(restaurantMenuItemErrorKey(index, "menuCategory"), "Category is required.", 3);
      if (numberOrNull(item.price) === null) addFieldError(restaurantMenuItemErrorKey(index, "price"), "Price is required.", 3);
      if (!item.foodType.trim()) addFieldError(restaurantMenuItemErrorKey(index, "foodType"), "Veg / Non-Veg is required.", 3);
    });

    const invalidHours = businessHours.find((hour) => hour.status !== "Closed" && !hour.is24Hours && (!hour.open || !hour.close));
    if (invalidHours) {
      setErrorMessage(`${invalidHours.day} opening and closing time are required unless open 24/7.`);
      setFieldErrors(nextFieldErrors);
      setCurrentStep(2);
      scrollToWizardTop();
      return false;
    }

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setErrorMessage("Please fix the required fields shown below.");
      pendingValidationScrollRef.current = true;
      setCurrentStep(validationTargetStep);
      return false;
    }

    setFieldErrors({});
    return true;
  }

  function getVisibleCategoryFieldKey(...keys: string[]) {
    const visibleFields = effectiveDynamicCategoryFields.filter((field) => shouldShowCategoryAttributeField(field, categoryAttributes, form));
    const field = visibleFields.find((item) => keys.some((key) =>
      areEquivalentCategoryFieldKeys(item.key, key) ||
      normalizeFieldKey(item.label) === normalizeFieldKey(key)
    ));

    return field?.key || null;
  }

  function validateInlineCategoryRules(rules: Array<{ keys: string[]; message: string; formKey?: string }>) {
    const nextFieldErrors: FieldErrors = {};

    rules.forEach((rule) => {
      if (rule.formKey) {
        nextFieldErrors[rule.formKey] = rule.message;
        return;
      }

      const visibleKey = getVisibleCategoryFieldKey(...rule.keys);
      if (visibleKey) {
        nextFieldErrors[categoryFieldErrorKey(visibleKey)] = rule.message;
      }
    });

    if (!Object.keys(nextFieldErrors).length) {
      return true;
    }

    setFieldErrors(nextFieldErrors);
    setErrorMessage("Please fix the required fields shown below.");
    pendingValidationScrollRef.current = true;
    setCurrentStep(
      form.categoryName === "Vehicles"
        ? getVehicleValidationTargetStep(rules)
        : isElectronicsCategoryName(form.categoryName)
          ? getElectronicsValidationTargetStep(rules)
          : 1
    );
    return false;
  }

  function validateRoommatesRentalFields() {
    const nextFieldErrors: FieldErrors = {};
    let validationTargetStep = wizardSteps.length - 1;

    effectiveDynamicCategoryFields
      .filter((field) => shouldShowCategoryAttributeField(field, categoryAttributes, form))
      .forEach((field) => {
        if (!field.isRequired || !isMissingRequiredCategoryValue(field, categoryAttributes[field.key])) {
          return;
        }

        nextFieldErrors[categoryFieldErrorKey(field.key)] = `${field.label} is required.`;
        validationTargetStep = Math.min(validationTargetStep, getRoommatesRentalFormStepForSectionOrder(field.sectionOrder || 1));
      });

    const sharedLocationErrors: FieldErrors = {};
    addSharedListingLocationErrors((name, message) => {
      sharedLocationErrors[name] = message;
    });

    if (Object.keys(sharedLocationErrors).length) {
      Object.assign(nextFieldErrors, sharedLocationErrors);
      validationTargetStep = 1;
    }

    if (!Object.keys(nextFieldErrors).length) {
      return true;
    }

    setFieldErrors(nextFieldErrors);
    setErrorMessage("Please fix the required fields shown below.");
    pendingValidationScrollRef.current = true;
    setCurrentStep(validationTargetStep);
    return false;
  }

  function validateJobFields() {
    const nextFieldErrors: FieldErrors = {};
    let validationTargetStep = wizardSteps.length - 1;

    effectiveDynamicCategoryFields
      .filter((field) => shouldShowCategoryAttributeField(field, categoryAttributes, form))
      .forEach((field) => {
        if (!field.isRequired || !isMissingRequiredCategoryValue(field, categoryAttributes[field.key])) {
          return;
        }

        nextFieldErrors[categoryFieldErrorKey(field.key)] = `${field.label} is required.`;
        validationTargetStep = Math.min(validationTargetStep, getJobFormStepForSectionOrder(field.sectionOrder || 1));
      });

    const sharedLocationErrors: FieldErrors = {};
    addSharedListingLocationErrors((name, message) => {
      sharedLocationErrors[name] = message;
    });

    if (Object.keys(sharedLocationErrors).length) {
      Object.assign(nextFieldErrors, sharedLocationErrors);
      validationTargetStep = 1;
    }

    if (!Object.keys(nextFieldErrors).length) {
      return true;
    }

    setFieldErrors(nextFieldErrors);
    setErrorMessage("Please fix the required fields shown below.");
    pendingValidationScrollRef.current = true;
    setCurrentStep(validationTargetStep);
    return false;
  }

  function validatePetFields() {
    const nextFieldErrors: FieldErrors = {};
    let validationTargetStep = wizardSteps.length - 1;

    effectiveDynamicCategoryFields
      .filter((field) => shouldShowCategoryAttributeField(field, categoryAttributes, form))
      .forEach((field) => {
        if (!field.isRequired || !isMissingRequiredCategoryValue(field, categoryAttributes[field.key])) {
          return;
        }

        nextFieldErrors[categoryFieldErrorKey(field.key)] = `${field.label} is required.`;
        validationTargetStep = Math.min(validationTargetStep, getPetFormStepForSectionOrder(field.sectionOrder || 1));
      });

    const sharedLocationErrors: FieldErrors = {};
    addSharedListingLocationErrors((name, message) => {
      sharedLocationErrors[name] = message;
    });

    if (Object.keys(sharedLocationErrors).length) {
      Object.assign(nextFieldErrors, sharedLocationErrors);
      validationTargetStep = 1;
    }

    if (!Object.keys(nextFieldErrors).length) {
      return true;
    }

    setFieldErrors(nextFieldErrors);
    setErrorMessage("Please fix the required fields shown below.");
    pendingValidationScrollRef.current = true;
    setCurrentStep(validationTargetStep);
    return false;
  }

  function getVehicleValidationTargetStep(rules: Array<{ keys: string[]; message: string; formKey?: string }>) {
    const visibleFields = effectiveDynamicCategoryFields.filter((field) => shouldShowCategoryAttributeField(field, categoryAttributes, form));
    const matchingSteps = rules.flatMap((rule) => {
      const field = visibleFields.find((item) => rule.keys.some((key) =>
        areEquivalentCategoryFieldKeys(item.key, key) ||
        normalizeFieldKey(item.label) === normalizeFieldKey(key)
      ));

      return field ? [getVehicleFormStepForSectionOrder(field.sectionOrder || 1)] : [];
    });

    return matchingSteps.length ? Math.min(...matchingSteps) : 1;
  }

  function getElectronicsValidationTargetStep(rules: Array<{ keys: string[]; message: string; formKey?: string }>) {
    const visibleFields = effectiveDynamicCategoryFields.filter((field) => shouldShowCategoryAttributeField(field, categoryAttributes, form));
    const matchingSteps = rules.flatMap((rule) => {
      const field = visibleFields.find((item) => rule.keys.some((key) =>
        areEquivalentCategoryFieldKeys(item.key, key) ||
        normalizeFieldKey(item.label) === normalizeFieldKey(key)
      ));

      return field ? [getElectronicsFormStepForSectionOrder(field.sectionOrder || 1)] : [];
    });

    return matchingSteps.length ? Math.min(...matchingSteps) : 1;
  }

  function validateVehicleFields() {
    const isAccessories = isVehiclePartsSubCategory(form.subCategory) || form.detailCategory === "EV Accessories";
    const isRental = isVehicleRentalSubCategory(form.subCategory);
    const isServices = isVehicleServicesSubCategory(form.subCategory);
    const isEv = isVehicleEvSelection(form.subCategory, form.detailCategory);
    const isChargingStation = form.detailCategory === "Charging Stations";
    const condition = getAttributeValue(categoryAttributes, "vehicleCondition", "vehicle_condition", "condition");

    if (isChargingStation) {
      if (!getAttributeValue(categoryAttributes, "chargingStationType", "charging_station_type", "chargingPortType", "charging_port_type").trim()) {
        return validateInlineCategoryRules([{ keys: ["chargingStationType", "charging_station_type", "chargingPortType", "charging_port_type"], message: "Charging Station Type is required." }]);
      }

      return true;
    }

    if (isServices) {
      if (!getAttributeValue(categoryAttributes, "serviceType", "service_type").trim()) {
        return validateInlineCategoryRules([{ keys: ["serviceType", "service_type"], message: "Service Type is required." }]);
      }

      return true;
    }

    const requiredFields = isAccessories
      ? [
          ["listing_title", "listingTitle", "Listing Title"],
          ["description", "Description"],
          ["partType", "part_type", "Part Type"],
          ["compatibleModels", "compatible_models", "Compatible Models"],
          ["condition", "partCondition", "part_condition", "Condition"],
        ]
      : [
          ["listing_title", "listingTitle", "Listing Title"],
          ["description", "Description"],
          ["brand", "Brand"],
          ["model", "Model"],
          ["yearOfManufacture", "year_of_manufacture", "Year of Manufacture"],
          ["vehicleCondition", "vehicle_condition", "Vehicle Condition"],
          ...(isEv ? [] : [["fuelType", "fuel_type", "Fuel Type"]]),
          ["color", "Color"],
        ];

    const missing = requiredFields.find((field) => !getAttributeValue(categoryAttributes, ...field.slice(0, -1)).trim());
    if (missing) {
      return validateInlineCategoryRules([{ keys: missing.slice(0, -1), message: `${missing[missing.length - 1]} is required.` }]);
    }

    if (!isAccessories && isUsedVehicleCondition(condition)) {
      const usedMissing = [
        ["kilometersDriven", "kilometers_driven", "kmDriven", "km_driven", "KM Driven"],
        ["ownerCount", "owner_count", "numberOfOwners", "number_of_owners", "Number of Owners"],
      ].find((field) => !getAttributeValue(categoryAttributes, ...field.slice(0, -1)).trim());

      if (usedMissing) {
        return validateInlineCategoryRules([{ keys: usedMissing.slice(0, -1), message: `${usedMissing[usedMissing.length - 1]} is required for used vehicles.` }]);
      }

    }

    if (getAttributeValue(categoryAttributes, "insurance", "insuranceStatus", "insurance_status") === "Active" &&
      !getAttributeValue(categoryAttributes, "insuranceValidTill", "insurance_valid_till").trim()) {
      return validateInlineCategoryRules([{ keys: ["insuranceValidTill", "insurance_valid_till"], message: "Insurance Valid Till is required when Insurance is Active." }]);
    }

    if (form.subCategory === "Cars") {
      const rules = [
        ...(!getAttributeValue(categoryAttributes, "kilometersDriven", "kilometers_driven", "kmDriven", "km_driven").trim() ? [{ keys: ["kilometersDriven", "kilometers_driven", "kmDriven", "km_driven"], message: "Mileage is required for Cars." }] : []),
        ...(!getAttributeValue(categoryAttributes, "transmission").trim() ? [{ keys: ["transmission"], message: "Transmission is required for Cars." }] : []),
      ];
      if (rules.length) {
        return validateInlineCategoryRules(rules);
      }
    }

    if (isVehicleMotorcycleSubCategory(form.subCategory)) {
      const rules = [
        ...(!getAttributeValue(categoryAttributes, "engineCapacity", "engine_capacity").trim() ? [{ keys: ["engineCapacity", "engine_capacity"], message: "Engine Capacity is required for Motorcycles & Scooters." }] : []),
        ...(!getAttributeValue(categoryAttributes, "bikeType", "bike_type").trim() ? [{ keys: ["bikeType", "bike_type"], message: "Bike Type is required for Motorcycles & Scooters." }] : []),
      ];
      if (rules.length) {
        return validateInlineCategoryRules(rules);
      }
    }

    if (isVehicleCommercialSubCategory(form.subCategory)) {
      const commercialMissing = [
        ["loadCapacity", "load_capacity", "Load Capacity"],
      ].find((field) => !getAttributeValue(categoryAttributes, ...field.slice(0, -1)).trim());

      if (commercialMissing) {
        return validateInlineCategoryRules([{ keys: commercialMissing.slice(0, -1), message: `${commercialMissing[commercialMissing.length - 1]} is required for Trucks & Commercial Vehicles.` }]);
      }
    }

    if (isRental) {
      if (!getAttributeValue(categoryAttributes, "rentalType", "rental_type").trim()) {
        return validateInlineCategoryRules([{ keys: ["rentalType", "rental_type"], message: "Rental Type is required for Rentals." }]);
      }

      if (!getAttributeValue(categoryAttributes, "rentalDuration", "rental_duration").trim()) {
        return validateInlineCategoryRules([{ keys: ["rentalDuration", "rental_duration"], message: "Rental Duration is required for Rentals." }]);
      }

      if (!getAttributeValue(categoryAttributes, "pricePerDay", "price_per_day", "daily_price").trim()) {
        return validateInlineCategoryRules([{ keys: ["pricePerDay", "price_per_day", "daily_price"], message: "Daily Price is required for Rentals." }]);
      }

      if (!getAttributeValue(categoryAttributes, "securityDepositVehicle", "security_deposit_vehicle").trim()) {
        return validateInlineCategoryRules([{ keys: ["securityDepositVehicle", "security_deposit_vehicle"], message: "Deposit Amount is required for Rentals." }]);
      }
    } else if (!getAttributeValue(categoryAttributes, "price", "listing_price", "total_price", "sale_price", "vehicle_price").trim() && !form.price.trim()) {
      return validateInlineCategoryRules([{ keys: ["price", "listing_price", "total_price", "sale_price", "vehicle_price"], formKey: getVisibleCategoryFieldKey("price", "listing_price", "total_price", "sale_price", "vehicle_price") ? undefined : "price", message: "Price is required for vehicle sale listings." }]);
    }

    return true;
  }

  function validateElectronicsFields() {
    const subCategory = form.subCategory;
    const detailCategory = form.detailCategory;
    const condition = getAttributeValue(categoryAttributes, "condition");
    const warranty = getAttributeValue(categoryAttributes, "warranty");

    const requiredFields = [
      ["listing_title", "listingTitle", "Listing Title"],
      ["brand", "Brand"],
      ["modelNameNumber", "model_name_number", "model", "Model"],
      ["productName", "product_name", "Product Name"],
      ["description", "Description"],
      ["condition", "Condition"],
      ["sellerType", "seller_type", "Ownership"],
      ["price", "listing_price", "total_price", "Selling Price"],
      ["warranty", "Warranty Available"],
      ["seller_name", "sellerName", "Seller Name"],
      ["phone", "contact_phone", "Phone"],
      ["email", "contact_email", "Email"],
    ];

    const missing = requiredFields.find((field) => !getAttributeValue(categoryAttributes, ...field.slice(0, -1)).trim());
    if (missing) {
      return validateInlineCategoryRules([{ keys: missing.slice(0, -1), message: `${missing[missing.length - 1]} is required.` }]);
    }

    if (warranty === "Yes" && !getAttributeValue(categoryAttributes, "manufacturerWarranty", "manufacturer_warranty", "extendedWarranty", "extended_warranty", "warrantyExpiryDate", "warranty_expiry_date").trim()) {
      return validateInlineCategoryRules([{ keys: ["manufacturerWarranty", "manufacturer_warranty", "extendedWarranty", "extended_warranty", "warrantyExpiryDate", "warranty_expiry_date"], message: "Warranty details are required when Warranty Available is Yes." }]);
    }

    if (condition === "Used" && !getAttributeValue(categoryAttributes, "usageDuration", "usage_duration").trim()) {
      return validateInlineCategoryRules([{ keys: ["usageDuration", "usage_duration"], message: "Usage Duration is required for used products." }]);
    }

    if (subCategory === "Mobile Phones & Tablets" || ["Smartphones", "Feature Phones", "Tablets", "iPads"].includes(detailCategory)) {
      const mobileMissing = [
        ["ram", "RAM"],
        ["storage", "Storage Capacity"],
        ["carrierStatus", "carrier_status", "Carrier Locked / Unlocked"],
      ].find((field) => !getAttributeValue(categoryAttributes, ...field.slice(0, -1)).trim());

      if (mobileMissing) {
        return validateInlineCategoryRules([{ keys: mobileMissing.slice(0, -1), message: `${mobileMissing[mobileMissing.length - 1]} is required for mobiles and tablets.` }]);
      }

      if (condition === "Used" && !getAttributeValue(categoryAttributes, "batteryHealth", "battery_health").trim()) {
        return validateInlineCategoryRules([{ keys: ["batteryHealth", "battery_health"], message: "Battery Health is required for used mobile phones." }]);
      }
    }

    if (subCategory === "Computers & Laptops" || detailCategory === "Laptops") {
      const computerMissing = [
        ["ram", "RAM"],
        ["storage_type", "storageType", "Storage Type (SSD/HDD)"],
        ["processor", "Processor"],
        ["operatingSystem", "operating_system", "Operating System"],
      ].find((field) => !getAttributeValue(categoryAttributes, ...field.slice(0, -1)).trim());

      if (computerMissing) {
        return validateInlineCategoryRules([{ keys: computerMissing.slice(0, -1), message: `${computerMissing[computerMissing.length - 1]} is required for computers and laptops.` }]);
      }
    }

    if (subCategory === "TVs & Home Entertainment" || ["Smart TVs", "LED TVs", "OLED TVs"].includes(detailCategory)) {
      const tvMissing = [
        ["screenSize", "screen_size", "Screen Size"],
        ["resolution", "Resolution"],
        ["smartTv", "smart_tv", "Smart TV Features"],
      ].find((field) => !getAttributeValue(categoryAttributes, ...field.slice(0, -1)).trim());

      if (tvMissing) {
        return validateInlineCategoryRules([{ keys: tvMissing.slice(0, -1), message: `${tvMissing[tvMissing.length - 1]} is required for TVs.` }]);
      }
    } else if (subCategory === "Home Appliances" || subCategory === "Kitchen Appliances") {
      const applianceMissing = [
        ["capacity", "Capacity"],
      ].find((field) => !getAttributeValue(categoryAttributes, ...field.slice(0, -1)).trim());

      if (applianceMissing) {
        return validateInlineCategoryRules([{ keys: applianceMissing.slice(0, -1), message: `${applianceMissing[applianceMissing.length - 1]} is required for home appliances.` }]);
      }
    }

    if (subCategory === "Wearables & Accessories") {
      const accessoryMissing = [
        ["accessoryType", "accessory_type", "Accessory Type"],
      ].find((field) => !getAttributeValue(categoryAttributes, ...field.slice(0, -1)).trim());

      if (accessoryMissing) {
        return validateInlineCategoryRules([{ keys: accessoryMissing.slice(0, -1), message: `${accessoryMissing[accessoryMissing.length - 1]} is required for accessories.` }]);
      }
    }

    if (!getAttributeValue(categoryAttributes, "price", "listing_price", "total_price").trim() && !form.price.trim()) {
      return validateInlineCategoryRules([{ keys: ["price", "listing_price", "total_price"], formKey: getVisibleCategoryFieldKey("price", "listing_price", "total_price") ? undefined : "price", message: "Price is required for Electronics & Appliances listings." }]);
    }

    return true;
  }

  function validateCareServiceFields() {
    const requiredFields = [
      ["businessCaregiverName", "business_caregiver_name", "Business / Caregiver Name"],
      ["providerType", "provider_type", "Provider Type"],
      ["experienceYears", "experience_years", "Experience"],
      ["languagesSpoken", "languages_spoken", "Languages Spoken"],
      ["willingToTravel", "willing_to_travel", "Willing to Travel"],
      ["availabilityType", "availability_type", "Availability Type"],
      ["availableDays", "available_days", "Available Days"],
      ["availableTimeSlots", "available_time_slots", "Available Time Slots"],
      ["startDate", "start_date", "Start Date"],
      ["rateType", "rate_type", "Pricing Type"],
      ["cprCertified", "cpr_certified", "CPR Certified"],
      ["firstAidCertified", "first_aid_certified", "First Aid Certified"],
      ["backgroundCheck", "background_check", "Background Check"],
      ["ageGroups", "age_groups", "Age Group"],
      ["specialNeedsExperience", "special_needs_experience", "Special Needs Experience"],
      ["smokingAllowed", "smoking_allowed", "Smoking Allowed"],
      ["petFriendly", "pet_friendly", "Pet Friendly"],
      ["identityVerification", "identity_verification", "Identity Verification"],
      ["backgroundVerification", "background_verification", "Background Check Status"],
    ];

    const missing = requiredFields.find((field) => {
      const fieldKeys = field.slice(0, -1);
      return getVisibleCategoryFieldKey(...fieldKeys) && !getAttributeValue(categoryAttributes, ...fieldKeys).trim();
    });
    if (missing) {
      return validateInlineCategoryRules([{ keys: missing.slice(0, -1), message: `${missing[missing.length - 1]} is required.` }]);
    }

    if (!careServiceValues(categoryAttributes).length) {
      return validateInlineCategoryRules([{ keys: ["servicesOffered", "services_offered", "mealPreparation", "meal_preparation", "service_type", "serviceType"], message: "At least one service offered is required." }]);
    }

    if (!getAttributeValue(categoryAttributes, "price", "listing_price", "total_price").trim() && !form.price.trim()) {
      return validateInlineCategoryRules([{ keys: ["price", "listing_price", "total_price"], formKey: getVisibleCategoryFieldKey("price", "listing_price", "total_price") ? undefined : "price", message: "Price is required for Care Services listings." }]);
    }

    if (isNursingCareSubCategory(form.subCategory) && !getAttributeValue(categoryAttributes, "licenseNumber", "license_number").trim()) {
      return validateInlineCategoryRules([{ keys: ["licenseNumber", "license_number"], message: "License Number is required for Nursing Services." }]);
    }

    if (isNursingCareSubCategory(form.subCategory) && !getAttributeValue(categoryAttributes, "certificationDocuments", "certification_documents").trim()) {
      return validateInlineCategoryRules([{ keys: ["certificationDocuments", "certification_documents"], message: "Certifications are required for Nursing Services." }]);
    }

    if (getAttributeValue(categoryAttributes, "providerType", "provider_type").trim() === "Agency / Company") {
      if (!getAttributeValue(categoryAttributes, "insurance", "insurance_coverage").trim()) {
        return validateInlineCategoryRules([{ keys: ["insurance", "insurance_coverage"], message: "Insurance Coverage is required for agency listings." }]);
      }

      if (!getAttributeValue(categoryAttributes, "staffCount", "staff_count").trim()) {
        return validateInlineCategoryRules([{ keys: ["staffCount", "staff_count"], message: "Staff Count is required for agency listings." }]);
      }
    }

    return true;
  }

  function validateFurnitureFields() {
    const requiredFields = [
      ["condition", "item_condition", "Condition"],
      ["material", "Material"],
      ["color_finish", "color", "Color / Finish"],
      ["quantity", "Quantity"],
      ["length_inches", "Length"],
      ["width_inches", "Width"],
      ["height_inches", "Height"],
      ["assembly_required", "Assembly Required"],
      ["price", "listing_price", "total_price", "Price"],
      ["price_negotiable", "priceNegotiable", "Price Negotiable"],
      ["pickup_only", "Pickup Only"],
      ["delivery_available", "Delivery Available"],
      ["seller_type", "sellerType", "Seller Type"],
    ];
    const condition = getAttributeValue(categoryAttributes, "condition", "item_condition");
    const deliveryAvailable = getAttributeValue(categoryAttributes, "delivery_available", "deliveryAvailable");

    if (condition !== "New") {
      requiredFields.push(["age_of_item", "age", "Age of Item"]);
    }

    const missing = requiredFields.find((field) => !getAttributeValue(categoryAttributes, ...field.slice(0, -1)).trim());
    if (missing) {
      return validateInlineCategoryRules([{ keys: missing.slice(0, -1), message: `${missing[missing.length - 1]} is required.` }]);
    }

    if (deliveryAvailable === "Yes" && !getAttributeValue(categoryAttributes, "delivery_charges", "deliveryCharges").trim()) {
      return validateInlineCategoryRules([{ keys: ["delivery_charges", "deliveryCharges"], message: "Delivery Charges are required when delivery is available." }]);
    }

    if (!getAttributeValue(categoryAttributes, "price", "listing_price", "total_price").trim() && !form.price.trim()) {
      return validateInlineCategoryRules([{ keys: ["price", "listing_price", "total_price"], formKey: getVisibleCategoryFieldKey("price", "listing_price", "total_price") ? undefined : "price", message: "Price is required for Furniture & Home listings." }]);
    }

    return true;
  }

  function validateMedia() {
    if (isClassifiedMode) {
      return true;
    }

    if (isRealEstateListing) {
      return true;
    }

    if (!isRealEstateListing && form.categoryName !== "Vehicles" && !isElectronicsCategoryName(form.categoryName) && form.categoryName !== "Care Services" && form.categoryName !== "Roommates & Rentals" && form.categoryName !== "Jobs" && !isFurnitureCategory(form.categoryName)) {
      return true;
    }

    const imageCount = [
      form.profileImageName,
      form.coverImageName,
      ...form.galleryMedia,
    ].filter((value) => value.trim() && !isVideoValue(value)).length;

    const minImageCount = form.categoryName === "Care Services" ? 1 : form.categoryName === "Roommates & Rentals" || form.categoryName === "Jobs" ? 0 : 3;
    if (form.categoryName === "Care Services" && !form.profileImageName.trim()) {
      const message = "Profile Photo is required for Care Services listings.";
      setErrorMessage(message);
      setFieldErrors((currentErrors) => ({ ...currentErrors, galleryMedia: message }));
      return false;
    }

    if (imageCount < minImageCount || imageCount > 15) {
      const message = `${form.categoryName} listings require minimum ${minImageCount} and maximum 15 images.`;
      setErrorMessage(message);
      setFieldErrors((currentErrors) => ({ ...currentErrors, galleryMedia: message }));
      return false;
    }

    clearFieldError("galleryMedia");
    return true;
  }

  function getListingDraft(): ListingDraft {
    return {
      businessHours,
      brands,
      categoryAttributes,
      contactInfo,
      coverImageFile,
      form,
      galleryFiles,
      infoItems,
      offers,
      offerFiles,
      paymentMethods,
      products,
      profileImageFile,
      restaurantInfo,
      restaurantMenuItems,
      sellerName,
      services,
      serviceFiles,
      socialLinks,
      webLinks,
    };
  }

  async function saveListing(draft = getListingDraft()) {
    if (editLockedMessage) {
      setErrorMessage(editLockedMessage);
      return false;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload = buildListingPayload(
        draft.form,
        draft.services,
        draft.offers,
        draft.infoItems,
        draft.sellerName,
        draft.businessHours,
        draft.contactInfo,
        draft.webLinks,
        draft.socialLinks,
        draft.products,
        draft.brands,
        draft.paymentMethods,
        draft.restaurantInfo,
        draft.restaurantMenuItems,
        draft.categoryAttributes,
        mode,
      );
      if (draft.profileImageFile) {
        payload.media.logoUrl = profileImageUploadMarker;
        payload.media.imageUrls = [
          profileImageUploadMarker,
          ...payload.media.imageUrls.filter((value) =>
            value !== profileImageUploadMarker &&
            value !== draft.form.profileImageName.trim()
          ),
        ];
      }
      if (draft.coverImageFile) {
        payload.media.coverBannerUrl = coverImageUploadMarker;
        const withoutCoverValues = payload.media.imageUrls.filter((value) =>
          value !== coverImageUploadMarker &&
          value !== draft.form.coverImageName.trim()
        );
        const insertIndex = draft.profileImageFile ? 1 : Math.min(1, withoutCoverValues.length);
        payload.media.imageUrls = [
          ...withoutCoverValues.slice(0, insertIndex),
          coverImageUploadMarker,
          ...withoutCoverValues.slice(insertIndex),
        ];
      }
      const galleryMarkers = new Set(draft.form.galleryMedia);
      if (draft.form.listingVideo.startsWith(galleryImageUploadMarkerPrefix)) {
        galleryMarkers.add(draft.form.listingVideo);
      }
      Object.values(draft.categoryAttributes).forEach((value) => {
        if (value.startsWith(galleryImageUploadMarkerPrefix)) {
          galleryMarkers.add(value);
        }
      });
      draft.restaurantMenuItems.forEach((item) => {
        if (item.imageUrl.startsWith(galleryImageUploadMarkerPrefix)) {
          galleryMarkers.add(item.imageUrl);
        }
      });
      const uploadFiles = {
        profileImageFile: draft.profileImageFile,
        coverImageFile: draft.coverImageFile,
        galleryFiles: draft.galleryFiles.filter((item) => galleryMarkers.has(item.marker)),
        serviceFiles: draft.serviceFiles.filter((item) => draft.services.some((service) => service.imageName === item.marker)),
        offerFiles: draft.offerFiles.filter((item) => draft.offers.some((offer) => offer.imageName === item.marker)),
      };
      const savedListing = isEditMode && editListingId
        ? await updateListing(editListingId, payload, uploadFiles)
        : await createListing(payload, uploadFiles);
      setSavedListingId(savedListing.id);
      setCurrentStep(doneStepIndex);
      return true;
    } catch (error) {
      if (isListingUpgradeRequired(error)) {
        setPlansModalMessage(getListingApiErrorMessage(error));
        setIsPlansModalOpen(true);
        return false;
      }
      const message = getListingApiErrorMessage(error);
      const obsoleteRealEstateMessage = message
        .replace(/\bProperty age is required\.\s*/gi, "")
        .replace(/\bFacing is required\.\s*/gi, "")
        .trim();
      setErrorMessage(obsoleteRealEstateMessage || "Please check the visible required fields and try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFinish() {
    if (!validateStep(0, currentStep === 0)) {
      pendingValidationScrollRef.current = true;
      setCurrentStep(0);
      if (isClassifiedMode) {
        window.history.pushState(null, "", getClassifiedListingFormPath(1, editListingId));
      }
      return;
    }

    if (!validateListingDetailsForSubmit()) {
      return;
    }

    if (!validateMedia()) {
      pendingValidationScrollRef.current = true;
      setCurrentStep(4);
      return;
    }

    await saveListing();
  }

  function renderRealEstatePostingSections(formStep: number) {
    return (
      <RealEstatePostingSections
        form={form}
        sellerName={sellerName}
        categoryAttributes={categoryAttributes}
        pricingPlans={pricingPlans}
        currencyCountry={currencyCountry}
        countries={countries}
        states={states}
        cities={cities}
        fieldErrors={fieldErrors}
        profileImageFile={profileImageFile}
        coverImageFile={coverImageFile}
        galleryFiles={galleryFiles}
        updateField={updateField}
        updateGalleryMedia={(items) => setForm((currentForm) => ({ ...currentForm, galleryMedia: items }))}
        updateSellerName={(value) => {
          clearFieldError("sellerName");
          setSellerName(value);
        }}
        updateCountry={updateCountry}
        updateState={updateState}
        updateCity={updateCity}
        updateBooleanField={(name, value) => setForm((currentForm) => ({ ...currentForm, [name]: value }))}
        updateCategoryAttributes={updateCategoryAttributes}
        handleAddressPlaceSelect={handleAddressPlaceSelect}
        setGalleryFiles={setGalleryFiles}
        onViewPlans={openPlansModal}
        formStep={formStep}
      />
    );
  }

  function renderRestaurantMediaAndPlanSections() {
    return (
      <RestaurantMediaAndPlanSections
        form={form}
        restaurantInfo={restaurantInfo}
        categoryAttributes={categoryAttributes}
        pricingPlans={pricingPlans}
        galleryFiles={galleryFiles}
        fieldErrors={fieldErrors}
        updateField={updateField}
        updateRestaurantInfo={setRestaurantInfo}
        updateGalleryMedia={(items) => setForm((currentForm) => ({ ...currentForm, galleryMedia: items }))}
        updateCategoryAttributes={updateCategoryAttributes}
        setGalleryFiles={setGalleryFiles}
        onViewPlans={openPlansModal}
      />
    );
  }

  function renderVehicleMediaAndPlanSections() {
    const setAttribute = (key: string, value: string) => {
      updateCategoryAttributes({ ...categoryAttributes, [key]: value });
    };

    return (
      <>
        <h4>Media Upload</h4>
        <div className="form-group">
          <label>Vehicle Images (multiple)</label>
          <GalleryMediaEditor
            items={form.galleryMedia}
            files={galleryFiles}
            onChange={(items) => setForm((currentForm) => ({ ...currentForm, galleryMedia: items }))}
            onFilesChange={setGalleryFiles}
          />
        </div>
        <FileUpload
          label="Interior Photos"
          accept="image/*,.jpg,.jpeg,.png,.webp"
          value={categoryAttributes.interior_photos || ""}
          files={galleryFiles}
          onFilesChange={setGalleryFiles}
          onChange={(value) => setAttribute("interior_photos", value)}
        />
        <FileUpload
          label="Engine Photos"
          accept="image/*,.jpg,.jpeg,.png,.webp"
          value={categoryAttributes.engine_photos || ""}
          files={galleryFiles}
          onFilesChange={setGalleryFiles}
          onChange={(value) => setAttribute("engine_photos", value)}
        />
        <Textarea placeholder="Videos" value={form.listingVideo} onChange={(value) => updateField("listingVideo", value)} />
        <Input placeholder="360 View (optional)" value={categoryAttributes.view_360 || ""} onChange={(value) => setAttribute("view_360", value)} />
        {renderGenericListingVisibilityAndPromotions()}
      </>
    );
  }

  function renderGenericListingVisibilityAndPromotions() {
    const listingPlanOptions = includeCurrentValue(
      pricingPlans.length ? pricingPlans.map((plan) => plan.name) : listingTypeOptions,
      form.adType,
    );
    const selectedListingPlan = getSelectedPricingPlan(pricingPlans, form.adType);
    const featuredUntilDate = selectedListingPlan
      ? formatInputDate(addMonths(new Date(), selectedListingPlan.durationMonths))
      : categoryAttributes.featured_until_date || "";

    return (
      <>
        <h4>Listing Visibility & Promotions</h4>
        <div className="row">
          <SelectColumn placeholder="Listing Type" value={form.adType} options={listingPlanOptions} onChange={(value) => updateField("adType", value)} width="col-md-5" />
          <InputColumn placeholder="Featured Until Date" type="date" value={featuredUntilDate} disabled onChange={() => undefined} width="col-md-5" />
          <div className="col-md-2">
            <div className="form-group listing-plan-action">
              <label className="listing-field-label">&nbsp;</label>
              <button
                type="button"
                className="btn btn-primary listing-plan-action-btn"
                onClick={openPlansModal}
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
        <Select
          placeholder="Boost Listing"
          value={categoryAttributes.boost_listing || ""}
          options={yesNoOptions}
          onChange={(value) => updateCategoryAttributes({ ...categoryAttributes, boost_listing: value })}
        />
        <Select
          placeholder="Sponsored Listing"
          value={categoryAttributes.sponsored_listing || ""}
          options={yesNoOptions}
          onChange={(value) => updateCategoryAttributes({ ...categoryAttributes, sponsored_listing: value })}
        />
      </>
    );
  }

  function renderVehiclePostingSections(formStep: number) {
    const vehicleStepFields = getVehicleStepCategoryFields(effectiveDynamicCategoryFields, formStep);
    const includeLocationSection = formStep === 1 && !isClassifiedMode && shouldUseSharedListingLocationSection(form.categoryName);

    return (
      <>
        {formStep === 3 ? renderVehicleContactInformationFields() : null}
        <CategoryAttributesFields
          categoryName={form.categoryName}
          subCategory={form.subCategory}
          detailCategory={form.detailCategory}
          form={form}
          currencyCountry={currencyCountry}
          dynamicFields={vehicleStepFields}
          values={categoryAttributes}
          fieldErrors={fieldErrors}
          uploadFiles={galleryFiles}
          omitLocationFields={includeLocationSection}
          locationSection={includeLocationSection ? (
            <SharedListingLocationFields
              form={form}
              countries={countries}
              states={states}
              cities={cities}
              fieldErrors={fieldErrors}
              updateField={updateField}
              updateCountry={updateCountry}
              updateState={updateState}
              updateCity={updateCity}
              onAddressPlaceSelect={handleAddressPlaceSelect}
            />
          ) : undefined}
          locationSectionOrder={getSharedListingLocationSectionOrder(form.categoryName)}
          onChange={updateCategoryAttributes}
          onUploadFilesChange={setGalleryFiles}
        />
      </>
    );
  }

  function renderVehicleContactInformationFields() {
    const setAttribute = (key: string, value: string) => {
      updateCategoryAttributes({ ...categoryAttributes, [key]: value });
    };

    return (
      <>
        <h5 className="mt-3 mb-3">Contact Information</h5>
        <Input
          placeholder="Seller Name*"
          value={sellerName}
          error={fieldErrors.sellerName}
          onChange={(value) => {
            clearFieldError("sellerName");
            setSellerName(value);
          }}
        />
        <div className="row">
          <InputColumn placeholder="Phone (OTP verified)*" value={form.mobileNumber} error={fieldErrors.mobileNumber} onChange={(value) => updateField("mobileNumber", value)} />
          <InputColumn placeholder="Email*" type="email" value={form.email} error={fieldErrors.email} onChange={(value) => updateField("email", value)} />
        </div>
        <div className="row">
          <InputColumn placeholder="Dealer Name" value={categoryAttributes.dealer_name || ""} onChange={(value) => setAttribute("dealer_name", value)} />
          <InputColumn placeholder="Website (optional)" value={form.website || categoryAttributes.dealer_website || ""} onChange={(value) => {
            updateField("website", value);
            setAttribute("dealer_website", value);
          }} />
        </div>
      </>
    );
  }

  function renderCategoryDynamicFields() {
    if (!form.categoryName || isRealEstateListing) {
      return null;
    }

    if (isEventsListingCategory(form.categoryName)) {
      return renderEventPostingSections(1);
    }

    if (isRoommatesRentalListing) {
      return renderRoommatesRentalPostingSections(1);
    }

    if (isJobsListing) {
      return renderJobPostingSections(1);
    }

    if (isElectronicsListing) {
      return renderElectronicsPostingSections(1);
    }

    if (isPetsListing) {
      return renderPetPostingSections(1);
    }

    if (form.categoryName === "Vehicles") {
      return renderVehiclePostingSections(1);
    }

    if (!isClassifiedMode && form.categoryName === "Restaurants & Food") {
      return (
        <RestaurantInfoFields
          restaurantInfo={restaurantInfo}
          fieldErrors={fieldErrors}
          onChange={setRestaurantInfo}
        />
      );
    }

    const useSharedLocation = !isClassifiedMode && shouldUseSharedListingLocationSection(form.categoryName);

    return (
      <>
        {shouldRenderFallbackPriceField ? (
          <ListingPriceFields form={form} currencyCountry={currencyCountry} fieldErrors={fieldErrors} updateField={updateField} />
        ) : null}
        <CategoryAttributesFields
          categoryName={form.categoryName}
          subCategory={form.subCategory}
          detailCategory={form.detailCategory}
          form={form}
          currencyCountry={currencyCountry}
          dynamicFields={effectiveDynamicCategoryFields}
          values={categoryAttributes}
          fieldErrors={fieldErrors}
          uploadFiles={galleryFiles}
          omitLocationFields={useSharedLocation}
          locationSection={useSharedLocation ? (
            <SharedListingLocationFields
              form={form}
              countries={countries}
              states={states}
              cities={cities}
              fieldErrors={fieldErrors}
              updateField={updateField}
              updateCountry={updateCountry}
              updateState={updateState}
              updateCity={updateCity}
              onAddressPlaceSelect={handleAddressPlaceSelect}
            />
          ) : undefined}
          locationSectionOrder={getSharedListingLocationSectionOrder(form.categoryName)}
          onChange={updateCategoryAttributes}
          onUploadFilesChange={setGalleryFiles}
        />
      </>
    );
  }

  function renderEventPostingSections(formStep: number) {
    const eventFields = getEventStepCategoryFields(effectiveDynamicCategoryFields, formStep);
    const useSharedLocation = !isClassifiedMode && formStep === 1 && shouldUseSharedListingLocationSection(form.categoryName);

    return (
      <>
        <CategoryAttributesFields
          categoryName={form.categoryName}
          subCategory={form.subCategory}
          detailCategory={form.detailCategory}
          form={form}
          currencyCountry={currencyCountry}
          dynamicFields={eventFields}
          values={categoryAttributes}
          fieldErrors={fieldErrors}
          uploadFiles={galleryFiles}
          omitLocationFields={useSharedLocation}
          locationSection={useSharedLocation ? (
            <SharedListingLocationFields
              form={form}
              countries={countries}
              states={states}
              cities={cities}
              fieldErrors={fieldErrors}
              updateField={updateField}
              updateCountry={updateCountry}
              updateState={updateState}
              updateCity={updateCity}
              onAddressPlaceSelect={handleAddressPlaceSelect}
            />
          ) : undefined}
          locationSectionOrder={getSharedListingLocationSectionOrder(form.categoryName)}
          onChange={updateCategoryAttributes}
          onUploadFilesChange={setGalleryFiles}
        />
        {formStep === 4 ? renderGenericListingVisibilityAndPromotions() : null}
      </>
    );
  }

  function renderRoommatesRentalPostingSections(formStep: number) {
    const roommateFields = getRoommatesRentalStepCategoryFields(effectiveDynamicCategoryFields, formStep);
    const useSharedLocation = !isClassifiedMode && formStep === 1 && shouldUseSharedListingLocationSection(form.categoryName);

    return (
      <>
        <CategoryAttributesFields
          categoryName={form.categoryName}
          subCategory={form.subCategory}
          detailCategory={form.detailCategory}
          form={form}
          currencyCountry={currencyCountry}
          dynamicFields={roommateFields}
          values={categoryAttributes}
          fieldErrors={fieldErrors}
          uploadFiles={galleryFiles}
          omitLocationFields={useSharedLocation}
          locationSection={useSharedLocation ? (
            <SharedListingLocationFields
              form={form}
              countries={countries}
              states={states}
              cities={cities}
              fieldErrors={fieldErrors}
              updateField={updateField}
              updateCountry={updateCountry}
              updateState={updateState}
              updateCity={updateCity}
              onAddressPlaceSelect={handleAddressPlaceSelect}
            />
          ) : undefined}
          locationSectionOrder={getSharedListingLocationSectionOrder(form.categoryName)}
          onChange={updateCategoryAttributes}
          onUploadFilesChange={setGalleryFiles}
        />
        {formStep === 4 ? renderGenericListingVisibilityAndPromotions() : null}
      </>
    );
  }

  function renderJobPostingSections(formStep: number) {
    const jobFields = getJobStepCategoryFields(effectiveDynamicCategoryFields, formStep);
    const useSharedLocation = !isClassifiedMode && formStep === 1 && shouldUseSharedListingLocationSection(form.categoryName);

    const renderJobFields = (fields: CategoryAttributeField[]) => fields.length ? (
      <CategoryAttributesFields
        categoryName={form.categoryName}
        subCategory={form.subCategory}
        detailCategory={form.detailCategory}
        form={form}
        currencyCountry={currencyCountry}
        dynamicFields={fields}
        values={categoryAttributes}
        fieldErrors={fieldErrors}
        uploadFiles={galleryFiles}
        omitLocationFields={useSharedLocation}
        locationSection={useSharedLocation ? (
          <SharedListingLocationFields
            form={form}
            countries={countries}
            states={states}
            cities={cities}
            fieldErrors={fieldErrors}
            updateField={updateField}
            updateCountry={updateCountry}
            updateState={updateState}
            updateCity={updateCity}
            onAddressPlaceSelect={handleAddressPlaceSelect}
          />
        ) : undefined}
        locationSectionOrder={getSharedListingLocationSectionOrder(form.categoryName)}
        onChange={updateCategoryAttributes}
        onUploadFilesChange={setGalleryFiles}
      />
    ) : null;

    if (formStep === 4) {
      const mediaAndVerificationFields = jobFields.filter((field) => (field.sectionOrder || 1) <= 16);
      const promotionFields = jobFields.filter((field) => (field.sectionOrder || 1) === 17);
      const conditionalFields = jobFields.filter((field) => (field.sectionOrder || 1) > 17);

      return (
        <>
          {renderJobFields(mediaAndVerificationFields)}
          {renderGenericListingVisibilityAndPromotions()}
          {renderJobFields(promotionFields)}
          {renderJobFields(conditionalFields)}
        </>
      );
    }

    return (
      <>
        {renderJobFields(jobFields)}
      </>
    );
  }

  function renderElectronicsPostingSections(formStep: number) {
    const electronicsFields = getElectronicsStepCategoryFields(effectiveDynamicCategoryFields, formStep);
    const useSharedLocation = !isClassifiedMode && formStep === 2 && shouldUseSharedListingLocationSection(form.categoryName);

    const renderElectronicsFields = (fields: CategoryAttributeField[]) => fields.length || useSharedLocation ? (
      <CategoryAttributesFields
        categoryName={form.categoryName}
        subCategory={form.subCategory}
        detailCategory={form.detailCategory}
        form={form}
        currencyCountry={currencyCountry}
        dynamicFields={fields}
        values={categoryAttributes}
        fieldErrors={fieldErrors}
        uploadFiles={galleryFiles}
        omitLocationFields={useSharedLocation}
        locationSection={useSharedLocation ? (
          <SharedListingLocationFields
            form={form}
            countries={countries}
            states={states}
            cities={cities}
            fieldErrors={fieldErrors}
            updateField={updateField}
            updateCountry={updateCountry}
            updateState={updateState}
            updateCity={updateCity}
            onAddressPlaceSelect={handleAddressPlaceSelect}
          />
        ) : undefined}
        locationSectionOrder={getSharedListingLocationSectionOrder(form.categoryName)}
        onChange={updateCategoryAttributes}
        onUploadFilesChange={setGalleryFiles}
      />
    ) : null;

    if (formStep === 4) {
      const mainFields = electronicsFields.filter((field) => (field.sectionOrder || 1) <= 11);
      const promotionFields = electronicsFields.filter((field) => (field.sectionOrder || 1) >= 13);

      return (
        <>
          <h5 className="mt-3 mb-3">Photo Gallery</h5>
          <GalleryMediaEditor
            items={form.galleryMedia}
            files={galleryFiles}
            error={fieldErrors.galleryMedia}
            onChange={(items) => {
              clearFieldError("galleryMedia");
              setForm((currentForm) => ({ ...currentForm, galleryMedia: items }));
            }}
            onFilesChange={setGalleryFiles}
          />
          {renderElectronicsFields(mainFields)}
          {renderGenericListingVisibilityAndPromotions()}
          {renderElectronicsFields(promotionFields)}
        </>
      );
    }

    return <>{renderElectronicsFields(electronicsFields)}</>;
  }

  function renderPetPostingSections(formStep: number) {
    const petFields = getPetStepCategoryFields(effectiveDynamicCategoryFields, formStep);
    const useSharedLocation = !isClassifiedMode && formStep === 1 && shouldUseSharedListingLocationSection(form.categoryName);

    const renderPetFields = (fields: CategoryAttributeField[]) => fields.length || useSharedLocation ? (
      <CategoryAttributesFields
        categoryName={form.categoryName}
        subCategory={form.subCategory}
        detailCategory={form.detailCategory}
        form={form}
        currencyCountry={currencyCountry}
        dynamicFields={fields}
        values={categoryAttributes}
        fieldErrors={fieldErrors}
        uploadFiles={galleryFiles}
        omitLocationFields={useSharedLocation}
        locationSection={useSharedLocation ? (
          <SharedListingLocationFields
            form={form}
            countries={countries}
            states={states}
            cities={cities}
            fieldErrors={fieldErrors}
            updateField={updateField}
            updateCountry={updateCountry}
            updateState={updateState}
            updateCity={updateCity}
            onAddressPlaceSelect={handleAddressPlaceSelect}
          />
        ) : undefined}
        locationSectionOrder={getSharedListingLocationSectionOrder(form.categoryName)}
        onChange={updateCategoryAttributes}
        onUploadFilesChange={setGalleryFiles}
      />
    ) : null;

    if (formStep === 3) {
      return (
        <>
          <h5 className="mt-3 mb-3">Pet Photos</h5>
          <GalleryMediaEditor
            items={form.galleryMedia}
            files={galleryFiles}
            error={fieldErrors.galleryMedia}
            onChange={(items) => {
              clearFieldError("galleryMedia");
              setForm((currentForm) => ({ ...currentForm, galleryMedia: items }));
            }}
            onFilesChange={setGalleryFiles}
          />
          {renderPetFields(petFields)}
        </>
      );
    }

    if (formStep === 4) {
      const mainFields = petFields.filter((field) => (field.sectionOrder || 1) <= 12);
      const promotionFields = petFields.filter((field) => (field.sectionOrder || 1) === 13);
      const conditionalFields = petFields.filter((field) => (field.sectionOrder || 1) > 13);

      return (
        <>
          {renderPetFields(mainFields)}
          {renderGenericListingVisibilityAndPromotions()}
          {renderPetFields(promotionFields)}
          {renderPetFields(conditionalFields)}
        </>
      );
    }

    return <>{renderPetFields(petFields)}</>;
  }

  const fieldErrorMessages = Array.from(new Set(Object.values(fieldErrors)));

  return (
    <>
      <UserHomeHeader />
      <section className="login-reg">
        <div className="container">
          <div className="row">
            <WizardSteps activeStep={currentStep} />
          </div>
          <div className="row">
            <div className="login-main add-list">
              <div className="log-bor">&nbsp;</div>
              <span className="steps">{currentStep < wizardSteps.length ? wizardSteps[currentStep].title : "Done"}</span>
              {errorMessage ? (
                <div className="alert alert-danger listing-form-alert">
                  <div>{errorMessage}</div>
                  {fieldErrorMessages.length ? (
                    <ul className="listing-form-error-list">
                      {fieldErrorMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              {editLockedMessage ? <div className="listing-form-locked">{editLockedMessage}</div> : null}

              {currentStep === 0 ? (
                <div className="log">
                  <div className="login">
                    <h4>{isClassifiedMode ? (isEditMode ? "Edit Classified Ad" : "Classified Details") : isEditMode ? "Edit Listing" : "Listing Details"}</h4>
                    <form className="listing_form_1 listing-polished-form" noValidate autoComplete="off">
                        <>
                      <h4>User Info</h4>
                      <Input
                        placeholder={isRealEstateListing ? "Name*" : form.categoryName === "Restaurants & Food" ? "Contact Person*" : "Listing Name*"}
                        value={sellerName}
                        error={fieldErrors.sellerName}
                        onChange={(value) => {
                          clearFieldError("sellerName");
                          setSellerName(value);
                        }}
                      />
                      <div className="row">
                        <InputColumn placeholder="Phone Number" value={form.mobileNumber} error={fieldErrors.mobileNumber} onChange={(value) => updateField("mobileNumber", value)} />
                        <InputColumn placeholder="Email Id" type="email" value={form.email} error={fieldErrors.email} onChange={(value) => updateField("email", value)} />
                      </div>
                      <h4>Category Selection</h4>
                      <Select placeholder="Select Category*" value={form.categoryName} error={fieldErrors.categoryName} options={categoryOptions} onChange={(value) => updateField("categoryName", value)} />
                      <Select
                        placeholder="Select Sub Category*"
                        value={form.subCategory}
                        error={fieldErrors.subCategory}
                        options={subCategoryOptions}
                        onChange={(value) => updateField("subCategory", value)}
                        disabled={!form.categoryName}
                      />
                      {!isClassifiedMode ? (
                        <Select
                          placeholder="Select Detailed Category*"
                          value={form.detailCategory}
                          error={fieldErrors.detailCategory}
                          options={detailCategoryOptions}
                          onChange={(value) => updateField("detailCategory", value)}
                          disabled={!form.subCategory || !detailCategoryOptions.length}
                        />
                      ) : null}
                      <h4>Images</h4>
                      <div className="row">
                        <TemplateImageColumn
                          label="Choose profile image*"
                          value={form.profileImageName}
                          file={profileImageFile}
                          error={fieldErrors.profileImageName}
                          onFileChange={(file) => {
                            setProfileImageFile(file);
                            updateField("profileImageName", file ? profileImageUploadMarker : "");
                          }}
                        />
                        <TemplateImageColumn
                          label="Choose cover image*"
                          value={form.coverImageName}
                          file={coverImageFile}
                          error={fieldErrors.coverImageName}
                          onFileChange={(file) => {
                            setCoverImageFile(file);
                            updateField("coverImageName", file ? coverImageUploadMarker : "");
                          }}
                        />
                      </div>
                      <StepNavigation
                        isFirst
                        onCancel={() => navigate("/dashboard/all-listing")}
                        onNext={() => handleNext()}
                        nextLabel="Next"
                        nextDisabled={isSaving || Boolean(editLockedMessage)}
                        progress={20}
                      />
                        </>
                    </form>
                  </div>
                </div>
              ) : null}

              {wizardSteps.length > 2 && currentStep === 1 ? (
                <div className="log">
                  <div className="login">
                    <h4>{isClassifiedMode ? "Classified Details" : isRealEstateListing ? "Property Details" : isRestaurantListing ? "Restaurant Details" : form.categoryName === "Vehicles" ? "Vehicle Details" : form.categoryName === "Care Services" ? "Care Service Details" : form.categoryName === "Events & Tickets" || form.categoryName === "Tickets & Events" ? "Event Details" : isRoommatesRentalListing ? "Roommate & Rental Details" : form.categoryName === "Jobs" ? "Job Details" : isElectronicsListing ? "Electronics Details" : isPetsListing ? "Pet Details" : "Category Details"}</h4>
                    <form className="listing_form_2" noValidate autoComplete="off">
                      {isRealEstateListing ? renderRealEstatePostingSections(0) : renderCategoryDynamicFields()}
                      <StepNavigation onPrevious={handlePrevious} onNext={() => handleNext()} progress={40} />
                    </form>
                  </div>
                </div>
              ) : null}

              {wizardSteps.length > 2 && currentStep === 2 ? (
                <div className="log">
                  <div className="login add-list-off">
                    <form className="listing_form_3" noValidate autoComplete="off">
                      {isRealEstateListing ? renderRealEstatePostingSections(1) : (
                        isRestaurantListing ? (
                          <RestaurantOperationsFields
                            form={form}
                            sellerName={sellerName}
                            contactInfo={contactInfo}
                            webLinks={webLinks}
                            socialLinks={socialLinks}
                            restaurantInfo={restaurantInfo}
                            businessHours={businessHours}
                            categoryAttributes={categoryAttributes}
                            fieldErrors={fieldErrors}
                            updateField={updateField}
                            onSellerNameChange={setSellerName}
                            onContactInfoChange={setContactInfo}
                            onWebLinksChange={setWebLinks}
                            onSocialLinksChange={setSocialLinks}
                            onRestaurantInfoChange={setRestaurantInfo}
                            onBusinessHoursChange={setBusinessHours}
                            onCategoryAttributesChange={updateCategoryAttributes}
                            onAddressPlaceSelect={handleRestaurantAddressPlaceSelect}
                          />
                        ) : form.categoryName === "Vehicles" ? (
                          renderVehiclePostingSections(2)
                        ) : form.categoryName === "Events & Tickets" || form.categoryName === "Tickets & Events" ? (
                          renderEventPostingSections(2)
                        ) : isRoommatesRentalListing ? (
                          renderRoommatesRentalPostingSections(2)
                        ) : isJobsListing ? (
                          renderJobPostingSections(2)
                        ) : isElectronicsListing ? (
                          renderElectronicsPostingSections(2)
                        ) : isPetsListing ? (
                          renderPetPostingSections(2)
                        ) : (
                          <ul className="listing-section-stack">
                            <li>
                              <BusinessHoursEditor hours={businessHours} onChange={setBusinessHours} />
                            </li>
                            <li>
                              <ContactLocationFields
                                contactInfo={contactInfo}
                                country={form.country}
                              fallbackState={form.state}
                              fallbackCity={form.city}
                              onChange={setContactInfo}
                              showAddress={!shouldUseSharedListingLocationSection(form.categoryName)}
                            />
                            </li>
                          </ul>
                        )
                      )}
                      <StepNavigation onPrevious={handlePrevious} onNext={() => handleNext()} progress={60} />
                    </form>
                  </div>
                </div>
              ) : null}

              {wizardSteps.length > 2 && currentStep === 3 ? (
                <div className="log add-list-map">
                  <div className="login add-list-off">
                    <form className="listing_form_4" noValidate autoComplete="off">
                      {isRealEstateListing ? renderRealEstatePostingSections(2) : (
                        isRestaurantListing ? (
                          <RestaurantMenuPricingFields
                            form={form}
                            currencyCountry={currencyCountry}
                            restaurantInfo={restaurantInfo}
                            menuItems={restaurantMenuItems}
                            uploadFiles={galleryFiles}
                            fieldErrors={fieldErrors}
                            onChange={setRestaurantInfo}
                            onMenuItemsChange={setRestaurantMenuItems}
                            onUploadFilesChange={setGalleryFiles}
                            onFieldErrorClear={clearFieldError}
                          />
                        ) : form.categoryName === "Vehicles" ? (
                          renderVehiclePostingSections(3)
                        ) : form.categoryName === "Events & Tickets" || form.categoryName === "Tickets & Events" ? (
                          renderEventPostingSections(3)
                        ) : isRoommatesRentalListing ? (
                          renderRoommatesRentalPostingSections(3)
                        ) : isJobsListing ? (
                          renderJobPostingSections(3)
                        ) : isElectronicsListing ? (
                          renderElectronicsPostingSections(3)
                        ) : isPetsListing ? (
                          renderPetPostingSections(3)
                        ) : (
                          <ul>
                            <li>
                              <WebLinksFields webLinks={webLinks} onChange={setWebLinks} />
                            </li>
                            <li>
                              <SocialLinksFields socialLinks={socialLinks} onChange={setSocialLinks} />
                            </li>
                          </ul>
                        )
                      )}
                      <StepNavigation onPrevious={handlePrevious} onNext={() => handleNext()} progress={80} />
                    </form>
                  </div>
                </div>
              ) : null}

              {wizardSteps.length > 2 && currentStep === 4 ? (
                <div className="log">
                  <div className="login add-lis-oth">
                    <form className="listing_form" noValidate autoComplete="off">
                      {isRealEstateListing ? (
                        <>
                          {renderRealEstatePostingSections(3)}
                          {renderRealEstatePostingSections(4)}
                        </>
                      ) : isRestaurantListing ? (
                        renderRestaurantMediaAndPlanSections()
                      ) : form.categoryName === "Vehicles" ? (
                        renderVehicleMediaAndPlanSections()
                      ) : form.categoryName === "Events & Tickets" || form.categoryName === "Tickets & Events" ? (
                        renderEventPostingSections(4)
                      ) : isRoommatesRentalListing ? (
                        renderRoommatesRentalPostingSections(4)
                      ) : isJobsListing ? (
                        renderJobPostingSections(4)
                      ) : isElectronicsListing ? (
                        renderElectronicsPostingSections(4)
                      ) : isPetsListing ? (
                        renderPetPostingSections(4)
                      ) : form.categoryName === "Care Services" ? (
                        <>
                          <h4>Photo gallery</h4>
                          <GalleryMediaEditor
                            items={form.galleryMedia}
                            files={galleryFiles}
                            onChange={(items) => setForm((currentForm) => ({ ...currentForm, galleryMedia: items }))}
                            onFilesChange={setGalleryFiles}
                          />
                          <p></p>
                          <h4>Video Gallery</h4>
                          <Textarea placeholder="Paste Your Youtube iframe Code here" value={form.listingVideo} onChange={(value) => updateField("listingVideo", value)} />
                          {renderGenericListingVisibilityAndPromotions()}
                        </>
                      ) : (
                        <>
                          <h4>More Info</h4>
                          <ul>
                            <ProductsServicesFields
                              products={products}
                              services={services}
                              brands={brands}
                              onProductsChange={setProducts}
                              onServicesChange={setServices}
                              onBrandsChange={setBrands}
                            />
                            <li>
                              <PaymentMethodsFields paymentMethods={paymentMethods} onChange={setPaymentMethods} />
                            </li>
                          </ul>
                          <h4>Photo gallery</h4>
                          <GalleryMediaEditor
                            items={form.galleryMedia}
                            files={galleryFiles}
                            onChange={(items) => setForm((currentForm) => ({ ...currentForm, galleryMedia: items }))}
                            onFilesChange={setGalleryFiles}
                          />
                          <p></p>
                          <h4>Video Gallery</h4>
                          <Textarea placeholder="Paste Your Youtube iframe Code here" value={form.listingVideo} onChange={(value) => updateField("listingVideo", value)} />
                          {renderGenericListingVisibilityAndPromotions()}
                        </>
                      )}
                      <div className="row">
                        <div className="col-md-6">
                          <button type="button" className="btn btn-primary" onClick={handlePrevious}>Previous</button>
                        </div>
                        <div className="col-md-6">
                          <button type="button" className="btn btn-primary" onClick={handleFinish} disabled={isSaving || Boolean(editLockedMessage)}>{isSaving ? "Saving..." : isEditMode ? "Save" : "Finish"}</button>
                        </div>
                      </div>
                      <Progress value={90} />
                    </form>
                  </div>
                </div>
              ) : null}

              {currentStep === doneStepIndex ? (
                <div className="log">
                  <div className="login add-lis-done">
                    <h4>Success</h4>
                    <p>{isClassifiedMode ? (isEditMode ? "Your ad has been updated and sent back for admin approval." : "Your ad has been submitted and is waiting for admin approval.") : isEditMode ? "Your listing has been updated and sent back for admin approval." : "Your listing has been submitted and is waiting for admin approval."}</p>
                    <div className="row">
                      <div className="col-md-12">
                        <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                          <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                          <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                        </svg>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <Link to="/dashboard/all-listing" className="btn btn-primary">Go to all listing</Link>
                      </div>
                      <div className="col-md-6">
                        <Link
                          to={savedListingId ? `/dashboard/listings/${savedListingId}/preview` : "/dashboard/all-listing"}
                          className="btn btn-primary"
                        >
                          Review listing
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
      {isPlansModalOpen ? (
        <PlansSelectionModal
          plans={pricingPlans}
          selectedPlanName={form.adType}
          activePlanCode={planUsage?.requiresPlanSelection ? "" : planUsage?.plan?.code || ""}
          message={plansModalMessage}
          isLoading={isPlansLoading}
          selectingPlanCode={selectingPlanCode}
          country={currencyCountry}
          onSelect={handleSelectPlan}
          onClose={() => {
            setPlansModalMessage("");
            setIsPlansModalOpen(false);
          }}
        />
      ) : null}
      <DashboardFooter onOpenSupport={() => undefined} onOpenMobileMenu={() => undefined} />
    </>
  );
}

function WizardSteps({ activeStep }: { activeStep: number }) {
  return (
    <div className="add-list-ste">
      <div className="add-list-ste-inn">
        <ul>
          {wizardSteps.map((step, index) => (
            <li key={step.title}>
              <a
                href={`#${step.title.toLowerCase().replace(/\s+/g, "-")}`}
                className={activeStep === index ? "act" : ""}
                onClick={(event) => event.preventDefault()}
              >
                <span>{step.title}</span>
                <b>{step.label}</b>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Input({ placeholder, value, onChange, error, type = "text", readOnly = false }: FieldProps & { type?: string; readOnly?: boolean }) {
  return (
    <div className="row">
      <InputColumn placeholder={placeholder} value={value} error={error} onChange={onChange} type={type} width="col-md-12" readOnly={readOnly} />
    </div>
  );
}

function fieldLabelFromPlaceholder(placeholder: string) {
  const label = cleanOptionalText(placeholder).trim().replace(/^Select\s+/i, "");
  return toTitleCaseLabel(label === "Listing Name*" ? "Name*" : label);
}

function cleanOptionalText(value: string) {
  return value
    .replace(/\s*\((?:admin\s+)?optional(?:\/private)?\)/gi, "")
    .replace(/\s*\(optional[^)]*\)/gi, "")
    .replace(/\s*\(rich\s+text\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePostalCodeSearchQuery(value: string, country?: string) {
  const trimmedValue = value.trim();
  const countryHint = country?.trim().toLowerCase() || "";
  const isUnitedStates = !countryHint || ["us", "usa", "united states", "united states of america"].includes(countryHint);
  const isIndia = !countryHint || ["in", "ind", "india"].includes(countryHint);

  if (isUnitedStates) {
    if (/^\d{9}$/.test(trimmedValue)) {
      return `${trimmedValue.slice(0, 5)}-${trimmedValue.slice(5)}`;
    }

    if (/^\d{5}(?:-\d{4})?$/.test(trimmedValue)) {
      return trimmedValue;
    }
  }

  if (isIndia && /^\d{6}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  return "";
}

function isPostalCodeSearchQuery(value: string, country?: string) {
  return Boolean(normalizePostalCodeSearchQuery(value, country));
}

function toTitleCaseLabel(label: string) {
  const acronyms: Record<string, string> = {
    bhk: "BHK",
    cctv: "CCTV",
    hoa: "HOA",
    id: "ID",
    mls: "MLS",
    pdf: "PDF",
    rera: "RERA",
    url: "URL",
    upi: "UPI",
    zip: "ZIP",
  };

  return label.replace(/\b[A-Za-z][A-Za-z']*/g, (word) => {
    const normalized = word.toLowerCase();
    if (acronyms[normalized]) {
      return acronyms[normalized];
    }

    if (word.length > 1 && word === word.toUpperCase()) {
      return word;
    }

    return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
  });
}

function getSelectedPricingPlan(plans: PricingPlan[], value: string) {
  const normalizedValue = normalizePlanValue(value);
  return plans.find((plan) =>
    normalizePlanValue(plan.name) === normalizedValue ||
    normalizePlanValue(plan.code) === normalizedValue ||
    normalizePlanValue(plan.name.replace(/\s+plan$/i, "")) === normalizedValue
  ) || null;
}

function normalizePlanValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isDefaultListingPlanValue(value: string) {
  const normalizedValue = normalizePlanValue(value);
  return !normalizedValue || normalizedValue === "free" || normalizedValue === "freeplan";
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + Math.max(months, 0));
  return nextDate;
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function AddressAutocompleteInput({
  placeholder,
  value,
  error,
  country,
  state,
  city,
  postalCode,
  onChange,
  onPostalCodeDetected,
  onPlaceSelect,
}: FieldProps & {
  country: string;
  state: string;
  city: string;
  postalCode?: string;
  onPostalCodeDetected?: (postalCode: string) => void;
  onPlaceSelect: (addressDetails: ListingAddressDetails) => void;
}) {
  const addressSearchMinLength = 5;
  const addressSearchDebounceMs = 650;
  const inputId = useId();
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suppressSuggestionsUntilClear, setSuppressSuggestionsUntilClear] = useState(false);
  const [suppressedSuggestionValue, setSuppressedSuggestionValue] = useState("");
  const isSelectingSuggestionRef = useRef(false);

  useEffect(() => {
    const query = value.trim();
    const postalCodeContext = normalizePostalCodeSearchQuery(postalCode || "", country);
    const searchQuery = query || postalCodeContext;

    if (suppressSuggestionsUntilClear && query && query === suppressedSuggestionValue) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return undefined;
    }

    if (suppressSuggestionsUntilClear && (!query || query !== suppressedSuggestionValue)) {
      setSuppressSuggestionsUntilClear(false);
      setSuppressedSuggestionValue("");
    }

    if (searchQuery.length < addressSearchMinLength) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return undefined;
    }

    if (isPostalCodeSearchQuery(query, country) && !postalCodeContext) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      searchAddressSuggestions({
        query: searchQuery,
        country,
        state,
        city,
        postalCode: postalCodeContext,
        signal: controller.signal,
      })
        .then((items) => {
          setSuggestions(items);
          setIsOpen(items.length > 0);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
            setIsOpen(false);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, addressSearchDebounceMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [city, country, postalCode, state, suppressedSuggestionValue, suppressSuggestionsUntilClear, value]);

  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    if (isSelectingSuggestionRef.current) {
      return;
    }

    isSelectingSuggestionRef.current = true;
    onChange(suggestion.address);
    setSuppressSuggestionsUntilClear(true);
    setSuppressedSuggestionValue(suggestion.address.trim());
    setSuggestions([]);
    setIsOpen(false);
    setIsLoading(true);

    try {
      const details = suggestion.placeId
        ? await getAddressPlaceDetail(suggestion.placeId)
        : null;

      const selectedAddress = details?.formattedAddress || suggestion.address;
      onPlaceSelect({
        address: selectedAddress,
        pincode: details?.postalCode || suggestion.pincode,
        latitude: details?.latitude != null ? String(details.latitude) : suggestion.latitude,
        longitude: details?.longitude != null ? String(details.longitude) : suggestion.longitude,
        country: details?.country || suggestion.country,
        state: details?.state || suggestion.state,
        city: details?.city || suggestion.city,
      });
      setSuppressSuggestionsUntilClear(true);
      setSuppressedSuggestionValue(selectedAddress.trim());
    } catch {
      onPlaceSelect({
        address: suggestion.address,
        pincode: suggestion.pincode,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        country: suggestion.country,
        state: suggestion.state,
        city: suggestion.city,
      });
      setSuppressSuggestionsUntilClear(true);
      setSuppressedSuggestionValue(suggestion.address.trim());
    } finally {
      setIsLoading(false);
      setSuggestions([]);
      setIsOpen(false);
      isSelectingSuggestionRef.current = false;
    }
  };

  const helperText = isLoading
      ? "Searching..."
      : "";

  return (
    <div className="row">
      <div className="col-md-12">
        <div className="form-group listing-address-autocomplete">
          <label className="listing-field-label">{fieldLabelFromPlaceholder(placeholder)}</label>
          <input
            className={`form-control${error ? " is-invalid" : ""}`}
            type="text"
            name={`listing-search-${inputId}`}
            value={value}
            placeholder={cleanOptionalText(placeholder)}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(event) => {
              const nextValue = event.target.value;
              const normalizedValue = nextValue.trim();
              if (!normalizedValue || normalizedValue !== suppressedSuggestionValue) {
                setSuppressSuggestionsUntilClear(false);
                setSuppressedSuggestionValue("");
              }
              const postalCode = normalizePostalCodeSearchQuery(normalizedValue, country);
              if (onPostalCodeDetected && postalCode) {
                onPostalCodeDetected(postalCode);
              }
              onChange(nextValue);
            }}
            onFocus={() => {
              if (!suppressSuggestionsUntilClear && suggestions.length) setIsOpen(true);
            }}
            onBlur={() => {
              window.setTimeout(() => setIsOpen(false), 150);
            }}
          />
          <FieldError message={error} />
          {helperText ? <div className="listing-address-helper">{helperText}</div> : null}
          {isOpen ? (
            <ul className="listing-address-suggestions">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      void handleSelectSuggestion(suggestion);
                    }}
                    onClick={(event) => event.preventDefault()}
                  >
                    <strong>{suggestion.title}</strong>
                    <span>{suggestion.subtitle}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

async function searchAddressSuggestions({
  query,
  country,
  state,
  city,
  postalCode,
  signal,
}: {
  query: string;
  country: string;
  state: string;
  city: string;
  postalCode?: string;
  signal: AbortSignal;
}) {
  const cacheKey = [query, country, state, city, postalCode || ""].map((part) => part.trim().toLowerCase()).join("|");
  const cachedSuggestions = addressSuggestionCache.get(cacheKey);
  if (cachedSuggestions) {
    return cachedSuggestions;
  }

  const googleSuggestions = await searchGoogleAddressSuggestions({ query, country, state, city, postalCode, signal });
  if (googleSuggestions.length) {
    addressSuggestionCache.set(cacheKey, googleSuggestions);
    return googleSuggestions;
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    limit: "8",
    q: [query, query.trim() === (postalCode || "").trim() ? "" : postalCode || "", city, state, country].filter((part) => part.trim()).join(", "),
  });
  const countryCode = getCountryCode(country);
  if (countryCode) {
    params.set("countrycodes", countryCode);
  }

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return [];
  }

  const results = (await response.json()) as NominatimAddressResult[];
  const cityResults = results.filter((item) => isAddressInSelectedCity(item, country, state, city));
  const suggestions = (cityResults.length ? cityResults : results).map(mapAddressSuggestion);
  addressSuggestionCache.set(cacheKey, suggestions);
  return suggestions;
}

const addressSuggestionCache = new Map<string, AddressSuggestion[]>();

async function searchGoogleAddressSuggestions({
  query,
  country,
  state,
  city,
  postalCode,
  signal,
}: {
  query: string;
  country: string;
  state: string;
  city: string;
  postalCode?: string;
  signal: AbortSignal;
}) {
  try {
    const normalizedQuery = query.trim();
    const normalizedPostalCode = (postalCode || "").trim();
    const searchQuery = [
      normalizedQuery,
      normalizedQuery === normalizedPostalCode ? "" : normalizedPostalCode,
    ].filter((part) => part.trim()).join(" ");
    const predictions = await searchAddressPredictions(searchQuery, country, state, city, signal);
    return predictions.map((item) => ({
      id: item.placeId,
      placeId: item.placeId,
      title: item.description.split(",")[0] || item.description,
      subtitle: item.description,
      address: item.description,
      pincode: "",
      latitude: "",
      longitude: "",
      country: "",
      state: "",
      city: "",
    }));
  } catch {
    return [];
  }
}

function mapAddressSuggestion(item: NominatimAddressResult): AddressSuggestion {
  const title = item.name || item.address?.road || item.address?.suburb || item.display_name.split(",")[0] || item.display_name;
  const subtitle = item.display_name;

  return {
    id: String(item.place_id),
    title,
    subtitle,
    address: item.display_name,
    pincode: item.address?.postcode || "",
    latitude: item.lat,
    longitude: item.lon,
    country: item.address?.country || "",
    state: item.address?.state || item.address?.province || item.address?.region || "",
    city: item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || item.address?.suburb || "",
  };
}

function isAddressInSelectedCity(item: NominatimAddressResult, country: string, state: string, city: string) {
  const displayName = item.display_name.toLowerCase();

  return [city, state, country].every((part) => {
    const normalized = part.trim().toLowerCase();
    return !normalized || displayName.includes(normalized);
  });
}

function getCountryCode(country: string) {
  const normalized = country.trim().toLowerCase();
  const countryCodes: Record<string, string> = {
    india: "in",
    "united states": "us",
    usa: "us",
    "united states of america": "us",
    england: "gb",
    "united kingdom": "gb",
    uk: "gb",
  };

  return countryCodes[normalized] || "";
}

function namesMatch(left: string, right: string) {
  return normalizeLocationName(left) === normalizeLocationName(right);
}

function normalizeLocationName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function includeLocationOption<T extends { id: number; name: string }>(options: T[], option: T) {
  if (options.some((item) => item.id === option.id || namesMatch(item.name, option.name))) {
    return options;
  }

  return [...options, option];
}

type AddressSuggestion = {
  id: string;
  placeId?: string;
  title: string;
  subtitle: string;
  address: string;
  pincode: string;
  latitude: string;
  longitude: string;
  country: string;
  state: string;
  city: string;
};

type NominatimAddressResult = {
  place_id: number | string;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: {
    country?: string;
    state?: string;
    province?: string;
    region?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    postcode?: string;
    road?: string;
    suburb?: string;
  };
};

function InputColumn({ placeholder, value, onChange, error, type = "text", width = "col-md-6", readOnly = false, disabled = false, autoComplete = "new-password", step, min }: FieldProps & { type?: string; width?: string; readOnly?: boolean; disabled?: boolean; autoComplete?: string; step?: string; min?: string }) {
  const inputId = useId();

  return (
    <div className={width}>
      <div className="form-group">
        <label className="listing-field-label">{fieldLabelFromPlaceholder(placeholder)}</label>
          <input className={`form-control${error ? " is-invalid" : ""}`} type={type} name={`listing-field-${inputId}`} value={value} placeholder={cleanOptionalText(placeholder)} readOnly={readOnly} disabled={disabled} autoComplete={autoComplete} step={step} min={min} onChange={(event) => onChange(event.target.value)} />
        <FieldError message={error} />
      </div>
    </div>
  );
}

function LabeledInputColumn({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  width = "col-md-6",
}: FieldProps & { label: string; type?: string; width?: string }) {
  const inputId = useId();

  return (
    <div className={width}>
      <div className="form-group">
        <label>{fieldLabelFromPlaceholder(label)}</label>
        <input className="form-control" type={type} name={`listing-contact-${inputId}`} value={value} placeholder={cleanOptionalText(placeholder)} autoComplete="new-password" onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

function SelectColumn({ placeholder, value, options, onChange, error, width = "col-md-6", disabled = false, emptyOptionLabel = placeholder }: FieldProps & { options: string[]; width?: string; disabled?: boolean; emptyOptionLabel?: string }) {
  return (
    <div className={width}>
      <div className="form-group">
        <label className="listing-field-label">{fieldLabelFromPlaceholder(placeholder)}</label>
        <select className={`chosen-select form-control${error ? " is-invalid" : ""}`} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
          <option value="">{cleanOptionalText(emptyOptionLabel)}</option>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <FieldError message={error} />
      </div>
    </div>
  );
}

function CheckboxField({ label, checked, onChange, error }: { label: string; checked: boolean; onChange: (value: boolean) => void; error?: string }) {
  const uniqueId = useId().replace(/[^a-z0-9]+/gi, "-");
  const labelSlug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const inputId = `listing-checkbox-${labelSlug}-${uniqueId}`;

  return (
    <div className="form-group listing-checkbox-field">
      <div className="chbox">
        <input id={inputId} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <label htmlFor={inputId}>{fieldLabelFromPlaceholder(label)}</label>
      </div>
      <FieldError message={error} />
    </div>
  );
}

function Textarea({ placeholder, value, onChange, error }: FieldProps) {
  return (
    <div className="row">
      <div className="col-md-12">
        <div className="form-group">
          <label className="listing-field-label">{fieldLabelFromPlaceholder(placeholder)}</label>
          <textarea className={`form-control${error ? " is-invalid" : ""}`} value={value} rows={4} placeholder={cleanOptionalText(placeholder)} onChange={(event) => onChange(event.target.value)} />
          <FieldError message={error} />
        </div>
      </div>
    </div>
  );
}

function ListingSectionCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`listing-section-card ${className}`.trim()}>
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function Select({ placeholder, value, options, onChange, error, disabled = false }: FieldProps & { options: string[]; disabled?: boolean }) {
  return (
    <div className="row">
      <div className="col-md-12">
        <div className="form-group">
          <label className="listing-field-label">{fieldLabelFromPlaceholder(placeholder)}</label>
          <select className={`chosen-select form-control${error ? " is-invalid" : ""}`} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
            <option value="">{cleanOptionalText(placeholder)}</option>
            {options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <FieldError message={error} />
        </div>
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <div className="listing-field-error">{message}</div> : null;
}

function CategoryAttributesFields({
  categoryName,
  subCategory,
  detailCategory,
  form,
  currencyCountry,
  dynamicFields,
  values,
  fieldErrors,
  uploadFiles,
  omitLocationFields = false,
  locationSection,
  locationSectionOrder = 99,
  onChange,
  onUploadFilesChange,
}: {
  categoryName: string;
  subCategory: string;
  detailCategory: string;
  form: FormState;
  currencyCountry: string;
  dynamicFields: CategoryAttributeField[];
  values: CategoryAttributes;
  fieldErrors: FieldErrors;
  uploadFiles: GalleryUploadFile[];
  omitLocationFields?: boolean;
  locationSection?: ReactNode;
  locationSectionOrder?: number;
  onChange: (value: CategoryAttributes) => void;
  onUploadFilesChange: (files: GalleryUploadFile[]) => void;
}) {
  const baseFields = dynamicFields.length
    ? dynamicFields
    : getCategoryAttributeFields(categoryName, subCategory, detailCategory);
  const fields = baseFields
    .filter((field) => shouldShowCategoryAttributeField(field, values, form))
    .filter((field) => !omitLocationFields || !isSharedListingLocationAttributeField(field));
  const sharedLocationSectionTitle = getSharedListingLocationSectionTitle(categoryName);
  const attachedLocationFields = locationSection
    ? fields.filter((field) => field.sectionName === sharedLocationSectionTitle)
    : [];
  const fieldsForSections = attachedLocationFields.length
    ? fields.filter((field) => field.sectionName !== sharedLocationSectionTitle)
    : fields;
  const sections = groupCategoryAttributeFields(fieldsForSections, categoryName);
  const sectionEntries = [
    ...sections.map((section) => ({
      key: `section-${section.name}`,
      order: section.order,
      content: renderCategoryAttributeSection(section),
    })),
    ...(locationSection ? [{
      key: "shared-listing-location",
      order: locationSectionOrder,
      content: attachedLocationFields.length ? (
        <>
          {locationSection}
          <div className="row">
            {attachedLocationFields.map((field) => renderCategoryAttributeField(field))}
          </div>
        </>
      ) : locationSection,
    }] : []),
  ].sort((left, right) => left.order - right.order || left.key.localeCompare(right.key));

  if (!fields.length && !locationSection) {
    return null;
  }

  function updateAttribute(key: string, value: string) {
    if (isEventsListingCategory(categoryName)) {
      const normalizedKey = normalizeFieldKey(key);

      if (["eventstartdate", "event_start_date"].includes(normalizedKey)) {
        const nextValues = { ...values, [key]: value };
        const currentEndDate = getAttributeValue(values, "event_end_date", "eventEndDate").trim();

        if (value && (!currentEndDate || currentEndDate < value)) {
          nextValues.event_end_date = value;
          nextValues.eventEndDate = value;
        }

        onChange(nextValues);
        return;
      }

      if (["eventenddate", "event_end_date"].includes(normalizedKey)) {
        const startDate = getAttributeValue(values, "event_start_date", "eventStartDate").trim();
        const nextEndDate = startDate && value && value < startDate ? startDate : value;
        onChange({ ...values, [key]: nextEndDate });
        return;
      }
    }

    onChange({ ...values, [key]: value });
  }

  function updateMultiSelectAttribute(key: string, option: string, checked: boolean) {
    const selectedValues = splitCategoryAttributeValues(values[key]);
    const nextValues = checked
      ? [...selectedValues, option]
      : selectedValues.filter((value) => !namesMatch(value, option));

    updateAttribute(key, dedupeStringOptions(nextValues).join(", "));
  }

  function renderCategoryAttributeSection(section: { name: string; order: number; fields: CategoryAttributeField[] }) {
    return (
      <div key={section.name}>
        <h5 className="mt-3 mb-3">{section.name}</h5>
        <div className="row">
          {section.fields.map((field) => renderCategoryAttributeField(field))}
        </div>
      </div>
    );
  }

  function renderCategoryAttributeField(field: CategoryAttributeField) {
    const displayLabel = labelWithCountryCurrency(field.isRequired ? `${field.label}*` : field.label, currencyCountry);
    const error = fieldErrors[categoryFieldErrorKey(field.key)];
    const inputMin = getCategoryAttributeInputMin(field, categoryName, values);
    const inputStep = getCategoryAttributeInputStep(field, categoryName);

    if (isMultiSelectCategoryAttributeField(field, categoryName)) {
      const selectedValues = splitCategoryAttributeValues(values[field.key]);
      return (
        <div className="col-md-12" key={field.key}>
          <div className="form-group">
            <label className="listing-field-label">{fieldLabelFromPlaceholder(displayLabel)}</label>
            <div className="row">
              {field.options?.map((option) => (
                <div className="col-md-4 col-sm-6" key={option}>
                  <CheckboxField
                    label={option}
                    checked={selectedValues.some((value) => namesMatch(value, option))}
                    onChange={(checked) => updateMultiSelectAttribute(field.key, option, checked)}
                  />
                </div>
              ))}
            </div>
            <FieldError message={error} />
          </div>
        </div>
      );
    }

    if (isUploadCategoryField(field)) {
      return (
        <FileUploadColumn
          key={field.key}
          label={fieldLabelFromPlaceholder(displayLabel)}
          accept={getUploadAcceptForField(field)}
          value={values[field.key] || ""}
          error={error}
          files={uploadFiles}
          onFilesChange={onUploadFilesChange}
          onChange={(value) => updateAttribute(field.key, value)}
        />
      );
    }

    return field.options?.length ? (
      <SelectColumn
        key={field.key}
        placeholder={displayLabel}
        value={values[field.key] || ""}
        error={error}
        options={field.options}
        onChange={(value) => updateAttribute(field.key, value)}
      />
    ) : field.type === "textarea" ? (
      <div className="col-md-12" key={field.key}>
        <div className="form-group">
          <label className="listing-field-label">{fieldLabelFromPlaceholder(displayLabel)}</label>
          <textarea
            className={`form-control${error ? " is-invalid" : ""}`}
            placeholder={cleanOptionalText(displayLabel)}
            value={values[field.key] || ""}
            rows={3}
            onChange={(event) => updateAttribute(field.key, event.target.value)}
          />
          <FieldError message={error} />
        </div>
      </div>
    ) : field.type === "checkbox" ? (
      <div className="col-md-6" key={field.key}>
        <CheckboxField
          label={fieldLabelFromPlaceholder(displayLabel)}
          checked={values[field.key] === "true"}
          error={error}
          onChange={(value) => updateAttribute(field.key, String(value))}
        />
      </div>
    ) : (
      <InputColumn
        key={field.key}
        placeholder={displayLabel}
        type={field.type || "text"}
        value={values[field.key] || ""}
        error={error}
        min={inputMin}
        step={inputStep}
        onChange={(value) => updateAttribute(field.key, value)}
      />
    );
  }

  return (
    <>
      {sectionEntries.map((entry) => <div key={entry.key}>{entry.content}</div>)}
    </>
  );
}

function SharedListingLocationFields({
  form,
  countries,
  states,
  cities,
  fieldErrors,
  updateField,
  updateCountry,
  updateState,
  updateCity,
  onAddressPlaceSelect,
}: {
  form: FormState;
  countries: CountryOption[];
  states: StateOption[];
  cities: CityOption[];
  fieldErrors: FieldErrors;
  updateField: (name: StringFormField, value: string) => void;
  updateCountry: (value: string) => void;
  updateState: (value: string) => void;
  updateCity: (value: string) => void;
  onAddressPlaceSelect: (addressDetails: ListingAddressDetails) => void;
}) {
  const isZipFirstLocation = form.categoryName === "Vehicles" || form.categoryName === "Care Services" || isElectronicsCategoryName(form.categoryName) || form.categoryName === "Pets & Animals";
  const isEventsLocation = form.categoryName === "Events & Tickets" || form.categoryName === "Tickets & Events";
  const useFullAddressLabel = isEventsLocation || form.categoryName === "Pets & Animals";

  if (isZipFirstLocation) {
    const updateZipFirstZipcode = (value: string) => {
      const zipcodeChanged = value.trim() !== form.pincode.trim();

      updateField("pincode", value);

      if (zipcodeChanged) {
        updateField("address", "");
        updateField("latitude", "");
        updateField("longitude", "");
      }
    };

    const updateZipFirstAddress = (value: string) => {
      if (value.trim() !== form.address.trim()) {
        updateField("latitude", "");
        updateField("longitude", "");
      }

      updateField("address", value);
    };

    return (
      <div>
        <h5 className="mt-3 mb-3">{getSharedListingLocationSectionTitle(form.categoryName)}</h5>
        <div className="row">
          <InputColumn placeholder="ZIP Code*" value={form.pincode} error={fieldErrors.pincode} onChange={updateZipFirstZipcode} />
          <SelectColumn placeholder="Country*" value={form.country} error={fieldErrors.country} options={includeCurrentValue(countries.map((country) => country.name), form.country)} onChange={updateCountry} />
        </div>
        <div className="row">
          <SelectColumn placeholder="State*" value={form.state} error={fieldErrors.state} options={includeCurrentValue(states.map((state) => state.name), form.state)} onChange={updateState} disabled={!form.country} />
          <SelectColumn placeholder="City*" value={form.city} error={fieldErrors.city} options={includeCurrentValue(cities.map((city) => city.name), form.city)} onChange={updateCity} disabled={!form.state} />
        </div>
        <AddressAutocompleteInput
          placeholder={form.categoryName === "Pets & Animals" ? "Full Address" : "Street Address"}
          value={form.address}
          country={form.country || "United States"}
          state={form.state}
          city={form.city}
          postalCode={form.pincode}
          onChange={updateZipFirstAddress}
          onPostalCodeDetected={updateZipFirstZipcode}
          onPlaceSelect={onAddressPlaceSelect}
        />
        <div className="row">
          <InputColumn placeholder="Latitude" type="number" value={form.latitude} onChange={(value) => updateField("latitude", value)} />
          <InputColumn placeholder="Longitude" type="number" value={form.longitude} onChange={(value) => updateField("longitude", value)} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h5 className="mt-3 mb-3">{getSharedListingLocationSectionTitle(form.categoryName)}</h5>
      <AddressAutocompleteInput
        placeholder={useFullAddressLabel ? "Full Address" : "Street Address"}
        value={form.address}
        country={form.country || "United States"}
        state={form.state}
        city={form.city}
        onChange={(value) => updateField("address", value)}
        onPostalCodeDetected={(postalCode) => updateField("pincode", postalCode)}
        onPlaceSelect={onAddressPlaceSelect}
      />
      <div className="row">
        <SelectColumn placeholder="Country*" value={form.country} error={fieldErrors.country} options={includeCurrentValue(countries.map((country) => country.name), form.country)} onChange={updateCountry} />
        <SelectColumn placeholder="State*" value={form.state} error={fieldErrors.state} options={includeCurrentValue(states.map((state) => state.name), form.state)} onChange={updateState} disabled={!form.country} />
      </div>
      <div className="row">
        <SelectColumn placeholder="City*" value={form.city} error={fieldErrors.city} options={includeCurrentValue(cities.map((city) => city.name), form.city)} onChange={updateCity} disabled={!form.state} />
        <InputColumn placeholder="ZIP Code*" value={form.pincode} error={fieldErrors.pincode} onChange={(value) => updateField("pincode", value)} />
      </div>
      <div className="row">
        <InputColumn placeholder="Latitude" type="number" value={form.latitude} onChange={(value) => updateField("latitude", value)} />
        <InputColumn placeholder="Longitude" type="number" value={form.longitude} onChange={(value) => updateField("longitude", value)} />
      </div>
    </div>
  );
}

function RealEstatePostingSections({
  form,
  sellerName,
  categoryAttributes,
  pricingPlans,
  currencyCountry,
  countries,
  states,
  cities,
  fieldErrors,
  galleryFiles,
  updateField,
  updateGalleryMedia,
  updateSellerName,
  updateCountry,
  updateState,
  updateCity,
  updateBooleanField,
  updateCategoryAttributes,
  handleAddressPlaceSelect,
  setGalleryFiles,
  onViewPlans,
  formStep,
}: {
  form: FormState;
  sellerName: string;
  categoryAttributes: CategoryAttributes;
  pricingPlans: PricingPlan[];
  currencyCountry: string;
  countries: CountryOption[];
  states: StateOption[];
  cities: CityOption[];
  fieldErrors: FieldErrors;
  profileImageFile: File | null;
  coverImageFile: File | null;
  galleryFiles: GalleryUploadFile[];
  updateField: (name: StringFormField, value: string) => void;
  updateGalleryMedia: (items: string[]) => void;
  updateSellerName: (value: string) => void;
  updateCountry: (value: string) => void;
  updateState: (value: string) => void;
  updateCity: (value: string) => void;
  updateBooleanField: (name: BooleanFormField, value: boolean) => void;
  updateCategoryAttributes: (value: CategoryAttributes) => void;
  handleAddressPlaceSelect: (addressDetails: ListingAddressDetails) => void;
  setGalleryFiles: (files: GalleryUploadFile[]) => void;
  onViewPlans: () => void;
  formStep?: number;
}) {
  const detailCategory = form.detailCategory.trim();

  function setAttribute(key: string, value: string) {
    updateCategoryAttributes({ ...categoryAttributes, [key]: value });
  }

  function setAttributes(values: CategoryAttributes) {
    updateCategoryAttributes({ ...categoryAttributes, ...values });
  }

  function attribute(key: string) {
    return categoryAttributes[key] || "";
  }

  const propertyTypeGroup = attribute("property_type_group");
  const isCommercial = propertyTypeGroup === "Commercial";
  const isResidential = propertyTypeGroup === "Residential";
  const isPg = ["PG", "PG / Co-living"].includes(form.subCategory);
  const isService = form.subCategory === "Real Estate Services";
  const isPlot = isPlotRealEstateCategory(form.subCategory, detailCategory);
  const showPlotDetails = isPlot && Boolean(propertyTypeGroup);
  const showResidential = isResidential && !isPg && !isService;
  const isRentListing = isRentRealEstateSubCategory(form.subCategory) && !isCommercial && !isPlot;
  const priceTypeOptions = getRealEstatePriceTypeOptions(form.subCategory);
  const selectedPriceType = attribute("price_type");
  const listingPlanOptions = includeCurrentValue(
    pricingPlans.length ? pricingPlans.map((plan) => plan.name) : listingTypeOptions,
    form.adType,
  );
  const selectedListingPlan = getSelectedPricingPlan(pricingPlans, form.adType);
  const featuredUntilDate = selectedListingPlan
    ? formatInputDate(addMonths(new Date(), selectedListingPlan.durationMonths))
    : attribute("featured_until_date");

  function setBooleanAttribute(key: string, value: boolean) {
    setAttribute(key, String(value));
  }

  function booleanAttributeValue(key: string) {
    return categoryAttributes[key] === "true" || categoryAttributes[key] === "Yes";
  }

  function updateNegotiable(value: string) {
    updateField("priceNegotiable", value === "No" ? "Fixed" : "Negotiable");
    setAttribute("price_negotiable", value);
  }

  const propertyImageFiles = galleryFiles.filter((item) => form.galleryMedia.includes(item.marker));

  useEffect(() => {
    if (selectedPriceType && !priceTypeOptions.includes(selectedPriceType)) {
      setAttribute("price_type", "");
    }
  }, [form.subCategory, selectedPriceType, priceTypeOptions]);

  function updatePropertyImageFiles(files: GalleryUploadFile[]) {
    const propertyImageMarkers = new Set(propertyImageFiles.map((item) => item.marker));
    setGalleryFiles([
      ...galleryFiles.filter((item) => !propertyImageMarkers.has(item.marker)),
      ...files,
    ]);
  }

  function shouldShowRealEstateStep(steps: number[]) {
    return formStep == null || steps.includes(formStep);
  }

  return (
    <>
      {shouldShowRealEstateStep([0]) ? (
        <>
      <h4>Property Title</h4>
      <Input placeholder="Listing Title*" value={form.title} error={fieldErrors.title} onChange={(value) => updateField("title", value)} />
      <Input placeholder="Short Tagline" value={form.description} onChange={(value) => updateField("description", value)} />

      <h4>Property Description</h4>
      <Textarea placeholder="Detailed Description*" value={form.businessDescription} error={fieldErrors.businessDescription} onChange={(value) => updateField("businessDescription", value)} />

      <h4>Property Location</h4>
      <AddressAutocompleteInput
        placeholder="Street Address*"
        value={form.address}
        error={fieldErrors.address}
        country={form.country}
        state={form.state}
        city={form.city}
        onChange={(value) => updateField("address", value)}
        onPostalCodeDetected={(postalCode) => updateField("pincode", postalCode)}
        onPlaceSelect={handleAddressPlaceSelect}
      />
      <Select placeholder="Select Country*" value={form.country} error={fieldErrors.country} options={includeCurrentValue(countries.map((country) => country.name), form.country)} onChange={updateCountry} />
      <Select placeholder="Select State*" value={form.state} error={fieldErrors.state} options={includeCurrentValue(states.map((state) => state.name), form.state)} onChange={updateState} disabled={!form.country} />
      <Select placeholder="Select City*" value={form.city} error={fieldErrors.city} options={includeCurrentValue(cities.map((city) => city.name), form.city)} onChange={updateCity} disabled={!form.state} />
      <Input placeholder="Zip Code*" value={form.pincode} error={fieldErrors.pincode} onChange={(value) => updateField("pincode", value)} />
      <div className="row">
        <InputColumn placeholder="Google Map Latitude" type="number" value={form.latitude} onChange={(value) => updateField("latitude", value)} />
        <InputColumn placeholder="Google Map Longitude" type="number" value={form.longitude} onChange={(value) => updateField("longitude", value)} />
      </div>
      <Input placeholder="Neighborhood" value={form.serviceLocations} onChange={(value) => updateField("serviceLocations", value)} />
        </>
      ) : null}

      {shouldShowRealEstateStep([1]) ? (
        <>
      <h4>Pricing</h4>
      <div className="row">
        <SelectColumn placeholder="Price Type*" value={attribute("price_type")} error={fieldErrors[categoryFieldErrorKey("price_type")]} options={priceTypeOptions} onChange={(value) => setAttribute("price_type", value)} />
        <InputColumn placeholder={labelWithCountryCurrency("Price*", currencyCountry || "United States")} type="number" value={form.price} error={fieldErrors.price} onChange={(value) => updateField("price", value)} />
      </div>
      {isRentListing ? (
        <Input placeholder={labelWithCountryCurrency("Security Deposit", currencyCountry || "United States")} type="number" value={form.securityDeposit} error={fieldErrors.securityDeposit} onChange={(value) => updateField("securityDeposit", value)} />
      ) : null}
      <div className="row">
        <InputColumn placeholder={labelWithCountryCurrency("HOA Fees", currencyCountry || "United States")} type="number" value={attribute("hoa_fees")} onChange={(value) => setAttribute("hoa_fees", value)} />
        <InputColumn placeholder={labelWithCountryCurrency("Property Tax", currencyCountry || "United States")} type="number" value={attribute("property_tax")} onChange={(value) => setAttribute("property_tax", value)} />
      </div>
      <Select placeholder="Negotiable" value={form.priceNegotiable === "Fixed" ? "No" : "Yes"} options={yesNoOptions} onChange={updateNegotiable} />

      <h4>Property Details</h4>
      <Select
        placeholder="Property Type*"
        value={propertyTypeGroup}
        error={fieldErrors[categoryFieldErrorKey("property_type_group")]}
        options={["Residential", "Commercial"]}
        onChange={(value) => {
          setAttribute("property_type_group", value);
          updateField("propertyType", "");
        }}
      />
      {showPlotDetails ? (
        <>
          <div className="row">
            <InputColumn placeholder="Lot Size*" type="number" value={form.plotArea} error={fieldErrors.plotArea} onChange={(value) => updateField("plotArea", value)} />
            <SelectColumn placeholder="Lot Size Unit" value={attribute("lot_size_unit") || attribute("area_unit")} options={["Sq Ft", "Acres"]} onChange={(value) => {
              setAttributes({ lot_size_unit: value, area_unit: value });
            }} />
          </div>
          <Select placeholder="Zoning Type" value={attribute("zoning_type")} options={["Residential", "Commercial", "Agricultural", "Industrial", "Mixed Use", "Other"]} onChange={(value) => setAttribute("zoning_type", value)} />
        </>
      ) : null}
      {showResidential ? (
        <>
          {!isPlot ? (
            <div className="row">
              <InputColumn placeholder="Bedrooms*" value={form.bhk} error={fieldErrors.bhk} onChange={(value) => updateField("bhk", value)} />
              <InputColumn placeholder="Bathrooms*" type="number" step="0.5" value={form.bathrooms} error={fieldErrors.bathrooms} onChange={(value) => updateField("bathrooms", value)} />
            </div>
          ) : null}
          <div className="row">
            {!isPlot ? <InputColumn placeholder="Balconies" type="number" value={form.balconies} onChange={(value) => updateField("balconies", value)} /> : null}
            {!isPlot ? <SelectColumn placeholder="Furnishing*" value={form.furnishingType} error={fieldErrors.furnishingType} options={["Furnished", "Semi-Furnished", "Unfurnished"]} onChange={(value) => updateField("furnishingType", value)} /> : null}
          </div>
          {!isPlot ? (
            <div className="row">
              <SelectColumn
                placeholder="Area*"
                value={attribute("area_unit")}
                error={fieldErrors[categoryFieldErrorKey("area_unit")]}
                options={["Sq Ft", "Acres"]}
                onChange={(value) => {
                  setAttribute("area_unit", value);
                  if (value === "Sq Ft") {
                    updateField("plotArea", "");
                  } else {
                    updateField("superBuiltUpArea", "");
                  }
                }}
              />
              {attribute("area_unit") ? (
                <InputColumn
                  placeholder={attribute("area_unit") === "Acres" ? "Area Acres*" : "Area Sq Ft*"}
                  type="number"
                  value={attribute("area_unit") === "Acres" ? form.plotArea : form.superBuiltUpArea}
                  error={fieldErrors[attribute("area_unit") === "Acres" ? "plotArea" : "superBuiltUpArea"]}
                  onChange={(value) => updateField(attribute("area_unit") === "Acres" ? "plotArea" : "superBuiltUpArea", value)}
                />
              ) : null}
            </div>
          ) : null}
          <div className="row">
            <InputColumn placeholder="Floor Number" type="number" value={form.floorNumber} onChange={(value) => updateField("floorNumber", value)} />
            <InputColumn placeholder="Total Floors" type="number" value={form.totalFloors} onChange={(value) => updateField("totalFloors", value)} />
          </div>
          <div className="row">
            <SelectColumn
              placeholder="Property Age"
              value={form.propertyAge || attribute("property_age")}
              error={fieldErrors.propertyAge || fieldErrors[categoryFieldErrorKey("property_age")]}
              options={["New", "Less than 1 year", "1-5 years", "5+ years"]}
              onChange={(value) => {
                updateField("propertyAge", value);
                setAttribute("property_age", value);
              }}
            />
            <SelectColumn
              placeholder="Facing"
              value={form.facing || attribute("facing")}
              error={fieldErrors.facing || fieldErrors[categoryFieldErrorKey("facing")]}
              options={["East", "West", "North", "South"]}
              onChange={(value) => {
                updateField("facing", value);
                setAttribute("facing", value);
              }}
            />
          </div>
          <Input placeholder="Year Built" type="number" value={attribute("year_built")} onChange={(value) => setAttribute("year_built", value)} />
        </>
      ) : null}
      {isCommercial && !isPlot ? (
        <>
          <Select placeholder="Commercial Type*" value={form.propertyType || attribute("commercial_type") || attribute("office_type")} options={["Office", "Shop", "Warehouse", "Showroom", "Industrial", "Other"]} onChange={(value) => {
            updateField("propertyType", value);
            setAttributes({ commercial_type: value, office_type: value });
          }} />
          <div className="row">
            <InputColumn placeholder="Office Capacity" type="number" value={attribute("office_capacity") || attribute("seating_capacity")} onChange={(value) => {
              setAttributes({ office_capacity: value, seating_capacity: value });
            }} />
            <InputColumn placeholder="Conference Rooms" type="number" value={attribute("conference_rooms")} onChange={(value) => setAttribute("conference_rooms", value)} />
          </div>
          <Input placeholder="Business Use" value={attribute("business_use")} onChange={(value) => setAttribute("business_use", value)} />
          <div className="row">
            <InputColumn placeholder="Pantry" value={attribute("pantry")} onChange={(value) => setAttribute("pantry", value)} />
            <InputColumn placeholder="Parking Spaces" type="number" value={attribute("parking_spaces")} onChange={(value) => setAttribute("parking_spaces", value)} />
          </div>
        </>
      ) : null}
      {isService ? (
        <div className="row">
          <InputColumn placeholder="Service Type" value={attribute("service_type")} onChange={(value) => setAttribute("service_type", value)} />
          <InputColumn placeholder="License Number" value={attribute("license_number")} onChange={(value) => setAttribute("license_number", value)} />
        </div>
      ) : null}

      {isRentListing ? (
        <>
          <h4>Rental / Roommate Fields</h4>
          <div className="row">
            <InputColumn placeholder="Available From Date" type="date" value={form.availabilityDate} onChange={(value) => updateField("availabilityDate", value)} />
            <InputColumn placeholder="Lease Terms" value={attribute("lease_terms") || attribute("lease_duration")} onChange={(value) => {
              setAttributes({ lease_terms: value, lease_duration: "" });
            }} />
          </div>
          <div className="row">
            <SelectColumn placeholder="Preferred Tenant" value={attribute("preferred_tenant")} options={["Family", "Students", "Professionals"]} onChange={(value) => setAttribute("preferred_tenant", value)} />
            <SelectColumn placeholder="Occupancy" value={form.roomType || attribute("occupancy")} options={["Single", "Shared"]} onChange={(value) => {
              updateField("roomType", value);
              setAttribute("occupancy", value);
            }} />
          </div>
          <div className="row listing-amenity-row">
            <div className="col-md-4"><CheckboxField label="Water" checked={booleanAttributeValue("utilities_water")} onChange={(value) => setBooleanAttribute("utilities_water", value)} /></div>
            <div className="col-md-4"><CheckboxField label="Electricity" checked={booleanAttributeValue("utilities_electricity")} onChange={(value) => setBooleanAttribute("utilities_electricity", value)} /></div>
            <div className="col-md-4"><CheckboxField label="Internet" checked={booleanAttributeValue("utilities_internet")} onChange={(value) => setBooleanAttribute("utilities_internet", value)} /></div>
          </div>
        </>
      ) : null}

        </>
      ) : null}

      {shouldShowRealEstateStep([2]) ? (
        <>
      <h4>Amenities</h4>
      <div className="row listing-amenity-row">
        <div className="col-md-6">
          <CheckboxField label="Parking" checked={form.amenityParking} onChange={(value) => updateBooleanField("amenityParking", value)} />
          <CheckboxField label="Gym" checked={form.amenityGym} onChange={(value) => updateBooleanField("amenityGym", value)} />
          <CheckboxField label="Swimming Pool" checked={form.amenitySwimmingPool} onChange={(value) => updateBooleanField("amenitySwimmingPool", value)} />
          <CheckboxField label="Elevator" checked={form.amenityLift} onChange={(value) => updateBooleanField("amenityLift", value)} />
          <CheckboxField label="Security" checked={form.amenitySecurity} onChange={(value) => updateBooleanField("amenitySecurity", value)} />
        </div>
        <div className="col-md-6">
          <CheckboxField label="Gated Community" checked={booleanAttributeValue("amenity_gated_community")} onChange={(value) => setBooleanAttribute("amenity_gated_community", value)} />
          <CheckboxField label="Pet Friendly" checked={booleanAttributeValue("amenity_pet_friendly")} onChange={(value) => setBooleanAttribute("amenity_pet_friendly", value)} />
          <CheckboxField label="Laundry" checked={booleanAttributeValue("amenity_laundry")} onChange={(value) => setBooleanAttribute("amenity_laundry", value)} />
          <CheckboxField label="Furnished Kitchen" checked={booleanAttributeValue("amenity_furnished_kitchen")} onChange={(value) => setBooleanAttribute("amenity_furnished_kitchen", value)} />
          <CheckboxField label="Air Conditioning" checked={booleanAttributeValue("amenity_air_conditioning")} onChange={(value) => setBooleanAttribute("amenity_air_conditioning", value)} />
        </div>
      </div>

      <h4>Media Upload</h4>
      <div className="form-group">
        <label>Property Images</label>
        <GalleryMediaEditor
          items={form.galleryMedia}
          files={propertyImageFiles}
          onChange={updateGalleryMedia}
          onFilesChange={updatePropertyImageFiles}
        />
      </div>
      <div className="row">
        <FileUploadColumn
          label="Videos"
          accept="video/*,.mp4,.mov,.webm,.m4v"
          value={form.listingVideo}
          files={galleryFiles}
          onFilesChange={setGalleryFiles}
          onChange={(value) => updateField("listingVideo", value)}
        />
        <FileUploadColumn
          label="Floor Plans"
          accept="image/*,.jpg,.jpeg,.png,.pdf"
          value={attribute("floor_plans")}
          files={galleryFiles}
          onFilesChange={setGalleryFiles}
          onChange={(value) => setAttribute("floor_plans", value)}
        />
      </div>
      <Input placeholder="Virtual Tour URL" value={attribute("virtual_tour_url")} onChange={(value) => setAttribute("virtual_tour_url", value)} />
      <FileUpload
        label="Brochure PDF"
        accept=".pdf,application/pdf"
        value={attribute("brochure_pdf")}
        files={galleryFiles}
        onFilesChange={setGalleryFiles}
        onChange={(value) => setAttribute("brochure_pdf", value)}
      />

        </>
      ) : null}

      {shouldShowRealEstateStep([3]) ? (
        <>
      <NearbyServicesEditor
        value={attribute(nearbyServicesAttributeKey)}
        error={fieldErrors[categoryFieldErrorKey(nearbyServicesAttributeKey)]}
        onChange={(value) => setAttribute(nearbyServicesAttributeKey, value)}
      />

      <h4>Contact Information</h4>
      <Input placeholder="Contact Person Name" value={sellerName} error={fieldErrors.sellerName} onChange={updateSellerName} />
      <div className="row">
        <InputColumn placeholder="Phone" value={form.mobileNumber} error={fieldErrors.mobileNumber} onChange={(value) => updateField("mobileNumber", value)} />
        <InputColumn placeholder="Email" type="email" value={form.email} error={fieldErrors.email} onChange={(value) => updateField("email", value)} />
      </div>
      <div className="row">
        <InputColumn placeholder="Agency Name" value={attribute("agency_name")} onChange={(value) => setAttribute("agency_name", value)} />
        <InputColumn placeholder="Website" value={form.website || attribute("contact_website")} onChange={(value) => {
          updateField("website", value);
          setAttribute("contact_website", value);
        }} />
      </div>

      <h4>Availability & Scheduling</h4>
      <div className="row">
        <SelectColumn placeholder="Property Availability Status" value={form.availabilityType || attribute("property_availability_status")} options={["Available", "Sold", "Rented"]} onChange={(value) => {
          updateField("availabilityType", value);
          setAttribute("property_availability_status", value);
        }} />
        <InputColumn placeholder="Open House Date" type="date" value={attribute("open_house_date")} onChange={(value) => setAttribute("open_house_date", value)} />
      </div>
      <Select placeholder="Schedule Visit" value={attribute("schedule_visit")} options={yesNoOptions} onChange={(value) => setAttribute("schedule_visit", value)} />

      <h4>Legal & Compliance</h4>
      <Select placeholder="Select Ownership Type*" value={form.sellerType} error={fieldErrors.sellerType} options={["Owner", "Agent", "Builder"]} onChange={(value) => updateField("sellerType", value)} />
      <div className="row">
        <InputColumn placeholder="MLS Number" value={attribute("mls_number")} onChange={(value) => setAttribute("mls_number", value)} />
        <FileUploadColumn
          label="Property Documents Upload"
          accept=".pdf,.doc,.docx,image/*,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          value={attribute("property_documents_upload")}
          files={galleryFiles}
          onFilesChange={setGalleryFiles}
          onChange={(value) => setAttribute("property_documents_upload", value)}
        />
      </div>
      <Input placeholder="RERA / License" value={form.reraNumber} onChange={(value) => updateField("reraNumber", value)} />

        </>
      ) : null}

      {shouldShowRealEstateStep([4]) ? (
        <>
      <h4>Listing Visibility & Promotions</h4>
      <div className="row">
        <SelectColumn placeholder="Listing Type" value={form.adType} options={listingPlanOptions} onChange={(value) => updateField("adType", value)} width="col-md-5" />
        <InputColumn placeholder="Featured Until Date" type="date" value={featuredUntilDate} disabled onChange={() => undefined} width="col-md-5" />
        <div className="col-md-2">
          <div className="form-group listing-plan-action">
            <label className="listing-field-label">&nbsp;</label>
            <button type="button" className="btn btn-primary listing-plan-action-btn" onClick={onViewPlans}>
              View Plans
            </button>
          </div>
        </div>
      </div>
      <Select placeholder="Boost Listing" value={attribute("boost_listing")} options={yesNoOptions} onChange={(value) => setAttribute("boost_listing", value)} />
        </>
      ) : null}
    </>
  );
}

function RestaurantOperationsFields({
  form,
  sellerName,
  contactInfo,
  webLinks,
  socialLinks,
  restaurantInfo,
  businessHours,
  categoryAttributes,
  fieldErrors,
  updateField,
  onSellerNameChange,
  onContactInfoChange,
  onWebLinksChange,
  onSocialLinksChange,
  onRestaurantInfoChange,
  onBusinessHoursChange,
  onCategoryAttributesChange,
  onAddressPlaceSelect,
}: {
  form: FormState;
  sellerName: string;
  contactInfo: ContactInfo;
  webLinks: WebLinks;
  socialLinks: SocialLinks;
  restaurantInfo: RestaurantInfo;
  businessHours: BusinessHour[];
  categoryAttributes: CategoryAttributes;
  fieldErrors: FieldErrors;
  updateField: (name: StringFormField, value: string) => void;
  onSellerNameChange: (value: string) => void;
  onContactInfoChange: (value: ContactInfo) => void;
  onWebLinksChange: (value: WebLinks) => void;
  onSocialLinksChange: (value: SocialLinks) => void;
  onRestaurantInfoChange: (value: RestaurantInfo) => void;
  onBusinessHoursChange: (value: BusinessHour[]) => void;
  onCategoryAttributesChange: (value: CategoryAttributes) => void;
  onAddressPlaceSelect: (addressDetails: ListingAddressDetails) => void;
}) {
  const selectedServiceTypes = getSelectedRestaurantServiceTypes(restaurantInfo, categoryAttributes);

  function serviceTypeSelectValue(key: string, label: string) {
    const explicitValue = categoryAttributes[key];

    if (explicitValue === "Yes" || explicitValue === "No") {
      return explicitValue;
    }

    return selectedServiceTypes.includes(label) ? "Yes" : "";
  }

  function updateServiceType(key: string, label: string, value: string) {
    const selectValue = value === "Yes" || value === "No" ? value : "";
    const nextAttributes = { ...categoryAttributes, [key]: selectValue };
    const nextServiceTypes = selectValue === "Yes"
      ? Array.from(new Set([...selectedServiceTypes, label]))
      : selectedServiceTypes.filter((item) => item !== label);

    if (label === "Reservations Accepted") {
      nextAttributes.table_booking = selectValue;
    }

    onCategoryAttributesChange(nextAttributes);
    onRestaurantInfoChange({
      ...restaurantInfo,
      serviceTypes: nextServiceTypes,
      deliveryAvailable: label === "Delivery" ? selectValue === "Yes" : restaurantInfo.deliveryAvailable,
      tableBooking: label === "Reservations Accepted" ? selectValue === "Yes" : restaurantInfo.tableBooking,
    });
  }

  const restaurantZipcode = contactInfo.zipcode || form.pincode;
  const restaurantAddress = contactInfo.streetAddress || form.address;

  function updateRestaurantZipcode(value: string) {
    const zipcodeChanged = value.trim() !== restaurantZipcode.trim();

    updateField("pincode", value);

    if (zipcodeChanged) {
      updateField("address", "");
      updateField("latitude", "");
      updateField("longitude", "");
      onContactInfoChange({ ...contactInfo, zipcode: value, streetAddress: "" });
      return;
    }

    onContactInfoChange({ ...contactInfo, zipcode: value });
  }

  function updateRestaurantAddress(value: string) {
    if (value.trim() !== restaurantAddress.trim()) {
      updateField("latitude", "");
      updateField("longitude", "");
    }

    updateField("address", value);
    onContactInfoChange({ ...contactInfo, streetAddress: value });
  }

  return (
    <>
      <h5 className="mt-3 mb-3">Location</h5>
      <div className="row">
        <InputColumn placeholder="ZIP Code*" value={restaurantZipcode} error={fieldErrors.restaurantZipcode} onChange={updateRestaurantZipcode} />
        <InputColumn placeholder="Country" value={form.country || "United States"} onChange={(value) => updateField("country", value || "United States")} />
      </div>
      <div className="row">
        <InputColumn placeholder="State*" value={contactInfo.state || form.state} error={fieldErrors.restaurantState} onChange={(value) => {
          updateField("state", value);
          onContactInfoChange({ ...contactInfo, state: value });
        }} />
        <InputColumn placeholder="City*" value={contactInfo.city || form.city} error={fieldErrors.restaurantCity} onChange={(value) => {
          updateField("city", value);
          onContactInfoChange({ ...contactInfo, city: value });
        }} />
      </div>
      <AddressAutocompleteInput
        placeholder="Street Address"
        value={restaurantAddress}
        error={fieldErrors.restaurantStreetAddress}
        country={form.country || "United States"}
        state={contactInfo.state || form.state}
        city={contactInfo.city || form.city}
        postalCode={restaurantZipcode}
        onChange={updateRestaurantAddress}
        onPostalCodeDetected={(postalCode) => {
          updateField("pincode", postalCode);
          onContactInfoChange({ ...contactInfo, zipcode: postalCode });
        }}
        onPlaceSelect={onAddressPlaceSelect}
      />
      <div className="row">
        <InputColumn placeholder="Latitude" value={form.latitude} onChange={(value) => updateField("latitude", value)} />
        <InputColumn placeholder="Longitude" value={form.longitude} onChange={(value) => updateField("longitude", value)} />
      </div>
      <Input placeholder="Delivery Radius (miles)" type="number" value={restaurantInfo.serviceRadiusMiles} error={fieldErrors.restaurantServiceRadiusMiles} onChange={(value) => onRestaurantInfoChange({ ...restaurantInfo, serviceRadiusMiles: value })} />

      <h5 className="mt-3 mb-3">Contact Information</h5>
      <Input placeholder="Contact Person Name*" value={sellerName} error={fieldErrors.sellerName} onChange={onSellerNameChange} />
      <div className="row">
        <InputColumn placeholder="Phone (OTP verified)*" value={contactInfo.mainPhone || form.mobileNumber} error={fieldErrors.restaurantPhone} onChange={(value) => onContactInfoChange({ ...contactInfo, mainPhone: value })} />
        <InputColumn placeholder="Email*" type="email" value={contactInfo.email || form.email} error={fieldErrors.restaurantEmail} onChange={(value) => onContactInfoChange({ ...contactInfo, email: value })} />
      </div>
      <Input placeholder="Website (optional)" value={webLinks.mainWebsite || form.website} onChange={(value) => onWebLinksChange({ ...webLinks, mainWebsite: value, displayWebsite: value })} />
      <div className="row">
        <InputColumn placeholder="Instagram" value={socialLinks.instagram} onChange={(value) => onSocialLinksChange({ ...socialLinks, instagram: value })} />
        <InputColumn placeholder="Facebook" value={socialLinks.facebook} onChange={(value) => onSocialLinksChange({ ...socialLinks, facebook: value })} />
      </div>

      <BusinessHoursEditor hours={businessHours} onChange={onBusinessHoursChange} title="Working Hours" />

      <h5 className="mt-3 mb-3">Service Type</h5>
      <FieldError message={fieldErrors.restaurantServiceTypes} />
      <div className="row">
        {restaurantServiceTypeOptions.map((option) => (
          <SelectColumn
            key={option.key}
            placeholder={option.label}
            emptyOptionLabel="Select"
            value={serviceTypeSelectValue(option.key, option.label)}
            options={yesNoOptions}
            onChange={(value) => updateServiceType(option.key, option.label, value)}
          />
        ))}
      </div>
    </>
  );
}

function RestaurantMenuPricingFields({
  form,
  currencyCountry,
  restaurantInfo,
  menuItems,
  uploadFiles,
  fieldErrors,
  onChange,
  onMenuItemsChange,
  onUploadFilesChange,
  onFieldErrorClear,
}: {
  form: FormState;
  currencyCountry: string;
  restaurantInfo: RestaurantInfo;
  menuItems: RestaurantMenuItem[];
  uploadFiles: GalleryUploadFile[];
  fieldErrors: FieldErrors;
  onChange: (value: RestaurantInfo) => void;
  onMenuItemsChange: (value: RestaurantMenuItem[]) => void;
  onUploadFilesChange: (files: GalleryUploadFile[]) => void;
  onFieldErrorClear: (name: string) => void;
}) {
  const isCloudKitchen = ["Cloud Kitchen", "Cloud Kitchen / Delivery Only"].includes(form.subCategory);
  const isCatering = ["Catering", "Catering Services"].includes(form.subCategory);
  const isFoodTruck = form.subCategory === "Food Trucks & Pop-ups";
  const isGrocery = form.subCategory === "Grocery & Specialty Food Stores";
  const showDeliveryFields = restaurantInfo.deliveryAvailable || restaurantInfo.serviceTypes.includes("Delivery") || isCloudKitchen;
  const showCatering = restaurantInfo.serviceTypes.includes("Catering") || isCatering;
  const amenityOptions = [
    ...(isCloudKitchen ? [] : ["Parking", "Outdoor Seating", "Private Dining"]),
    "WiFi",
    "Live Music",
    "Pet Friendly",
    "Family Friendly",
    "Wheelchair Accessible (ADA)",
    "Bar Available",
  ];

  function toggleRestaurantList(key: "thirdPartyIntegrations" | "amenities" | "eventTypes", value: string, checked: boolean) {
    const currentValues = restaurantInfo[key];
    onChange({ ...restaurantInfo, [key]: checked ? [...currentValues, value] : currentValues.filter((item) => item !== value) });
  }

  function updateMenuItem(index: number, value: RestaurantMenuItem, key?: keyof RestaurantMenuItem) {
    if (key) {
      onFieldErrorClear(restaurantMenuItemErrorKey(index, key));
    }
    onMenuItemsChange(updateArrayItem(menuItems, index, value));
  }

  return (
    <>
      <h5 className="mt-3 mb-3">Menu Management</h5>
      <FieldError message={fieldErrors.restaurantMenuItems} />
      {menuItems.map((item, index) => (
        <ListingSectionCard title={`Menu Item ${index + 1}`} key={index}>
          <div className="row">
            <InputColumn placeholder="Item Name*" value={item.itemName} error={fieldErrors[restaurantMenuItemErrorKey(index, "itemName")]} onChange={(value) => updateMenuItem(index, { ...item, itemName: value }, "itemName")} />
            <SelectColumn placeholder="Category*" value={item.menuCategory} error={fieldErrors[restaurantMenuItemErrorKey(index, "menuCategory")]} options={["Starter", "Main Course", "Dessert", "Beverage"]} onChange={(value) => updateMenuItem(index, { ...item, menuCategory: value }, "menuCategory")} />
          </div>
          <Textarea placeholder="Description" value={item.description} onChange={(value) => updateMenuItem(index, { ...item, description: value })} />
          <div className="row">
            <InputColumn placeholder={labelWithCountryCurrency("Price*", currencyCountry)} type="number" value={item.price} error={fieldErrors[restaurantMenuItemErrorKey(index, "price")]} onChange={(value) => updateMenuItem(index, { ...item, price: value }, "price")} />
            <InputColumn placeholder="Calories (optional)" type="number" value={item.calories} onChange={(value) => updateMenuItem(index, { ...item, calories: value }, "calories")} />
          </div>
          <div className="row">
            <SelectColumn placeholder="Veg / Non-Veg*" value={item.foodType} error={fieldErrors[restaurantMenuItemErrorKey(index, "foodType")]} options={["Veg", "Non-Veg", "Vegan"]} onChange={(value) => updateMenuItem(index, { ...item, foodType: value }, "foodType")} />
            <SelectColumn placeholder="Spice Level (optional)" value={item.spiceLevel} options={["Mild", "Medium", "Hot", "Extra Hot"]} onChange={(value) => updateMenuItem(index, { ...item, spiceLevel: value }, "spiceLevel")} />
          </div>
          <FileUploadColumn
            label="Item Image"
            accept="image/*,.jpg,.jpeg,.png,.webp"
            value={item.imageUrl}
            files={uploadFiles}
            onFilesChange={onUploadFilesChange}
            onChange={(value) => updateMenuItem(index, { ...item, imageUrl: value }, "imageUrl")}
          />
          {menuItems.length > 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => onMenuItemsChange(menuItems.filter((_, itemIndex) => itemIndex !== index))}>Remove Item</button>
          ) : null}
        </ListingSectionCard>
      ))}
      <button type="button" className="btn btn-primary" onClick={() => onMenuItemsChange([...menuItems, { ...initialRestaurantMenuItem, displayOrder: String(menuItems.length + 1) }])}>Add Menu Item</button>

      <h5 className="mt-3 mb-3">Pricing & Offers</h5>
      <div className="row">
        <InputColumn placeholder={labelWithCountryCurrency("Average Cost for Two", currencyCountry)} type="number" value={restaurantInfo.averageCostForTwo} onChange={(value) => onChange({ ...restaurantInfo, averageCostForTwo: value })} />
        <SelectColumn placeholder="Price Range" value={restaurantInfo.priceRange} options={["Budget", "Moderate", "Premium"]} onChange={(value) => onChange({ ...restaurantInfo, priceRange: value })} />
      </div>
      <Textarea placeholder="Offers / Discounts" value={restaurantInfo.discountsOffers} onChange={(value) => onChange({ ...restaurantInfo, discountsOffers: value })} />
      <div className="row">
        <InputColumn placeholder="Coupon Codes (optional)" value={restaurantInfo.couponCodes} onChange={(value) => onChange({ ...restaurantInfo, couponCodes: value })} />
        <InputColumn placeholder="Happy Hours" value={restaurantInfo.happyHours} onChange={(value) => onChange({ ...restaurantInfo, happyHours: value })} />
      </div>

      {showDeliveryFields ? (
        <>
          <h5 className="mt-3 mb-3">Delivery Details</h5>
          <div className="row">
            <InputColumn placeholder="Delivery Radius (miles)" type="number" value={restaurantInfo.serviceRadiusMiles} error={fieldErrors.restaurantServiceRadiusMiles} onChange={(value) => onChange({ ...restaurantInfo, serviceRadiusMiles: value })} />
            <InputColumn placeholder={labelWithCountryCurrency("Delivery Fee", currencyCountry)} type="number" value={restaurantInfo.deliveryFee} error={fieldErrors.restaurantDeliveryFee} onChange={(value) => onChange({ ...restaurantInfo, deliveryFee: value })} />
            <InputColumn placeholder={labelWithCountryCurrency("Minimum Order Amount", currencyCountry)} type="number" value={restaurantInfo.minimumOrderValue} error={fieldErrors.restaurantMinimumOrderValue} onChange={(value) => onChange({ ...restaurantInfo, minimumOrderValue: value })} />
            <InputColumn placeholder="Estimated Delivery Time" value={restaurantInfo.estimatedDeliveryTime} onChange={(value) => onChange({ ...restaurantInfo, estimatedDeliveryTime: value })} />
          </div>
          <MultiSelectCheckboxes title="Third-party Delivery" options={["DoorDash", "Uber Eats", "Grubhub"]} selected={restaurantInfo.thirdPartyIntegrations} onChange={(value, checked) => toggleRestaurantList("thirdPartyIntegrations", value, checked)} />
        </>
      ) : null}

      {showCatering ? (
        <>
          <h5 className="mt-3 mb-3">Catering Details</h5>
          <div className="row">
            <InputColumn placeholder="Catering Type" value={restaurantInfo.cateringType} onChange={(value) => onChange({ ...restaurantInfo, cateringType: value })} />
            <InputColumn placeholder="Minimum Guests" type="number" value={restaurantInfo.minimumGuests} onChange={(value) => onChange({ ...restaurantInfo, minimumGuests: value })} />
            <InputColumn placeholder="Maximum Guests" type="number" value={restaurantInfo.maximumGuests} onChange={(value) => onChange({ ...restaurantInfo, maximumGuests: value })} />
            <InputColumn placeholder={labelWithCountryCurrency("Per Plate Pricing", currencyCountry)} type="number" value={restaurantInfo.perPlatePricing} onChange={(value) => onChange({ ...restaurantInfo, perPlatePricing: value })} />
          </div>
          <MultiSelectCheckboxes title="Event Types" options={["Wedding", "Corporate", "Birthday", "Festival"]} selected={restaurantInfo.eventTypes} onChange={(value, checked) => toggleRestaurantList("eventTypes", value, checked)} />
          <Textarea placeholder="Bulk Pricing" value={restaurantInfo.bulkOrderNotes} onChange={(value) => onChange({ ...restaurantInfo, bulkOrderNotes: value })} />
        </>
      ) : null}

      {!isCloudKitchen ? (
        <MultiSelectCheckboxes title="Amenities" options={amenityOptions} selected={restaurantInfo.amenities} onChange={(value, checked) => toggleRestaurantList("amenities", value, checked)} />
      ) : null}

      {isFoodTruck ? (
        <>
          <h5 className="mt-3 mb-3">Food Truck Details</h5>
          <Textarea placeholder="Mobile Locations" value={restaurantInfo.mobileLocations} onChange={(value) => onChange({ ...restaurantInfo, mobileLocations: value })} />
          <Textarea placeholder="Operating Zones" value={restaurantInfo.operatingZones} onChange={(value) => onChange({ ...restaurantInfo, operatingZones: value })} />
        </>
      ) : null}
      {isGrocery ? <Textarea placeholder="Specialty products / departments" value={restaurantInfo.customOrderOptions} onChange={(value) => onChange({ ...restaurantInfo, customOrderOptions: value })} /> : null}
    </>
  );
}

function RestaurantMediaAndPlanSections({
  form,
  restaurantInfo,
  categoryAttributes,
  pricingPlans,
  galleryFiles,
  fieldErrors,
  updateField,
  updateRestaurantInfo,
  updateGalleryMedia,
  updateCategoryAttributes,
  setGalleryFiles,
  onViewPlans,
}: {
  form: FormState;
  restaurantInfo: RestaurantInfo;
  categoryAttributes: CategoryAttributes;
  pricingPlans: PricingPlan[];
  galleryFiles: GalleryUploadFile[];
  fieldErrors: FieldErrors;
  updateField: (name: StringFormField, value: string) => void;
  updateRestaurantInfo: (value: RestaurantInfo) => void;
  updateGalleryMedia: (items: string[]) => void;
  updateCategoryAttributes: (value: CategoryAttributes) => void;
  setGalleryFiles: (files: GalleryUploadFile[]) => void;
  onViewPlans: () => void;
}) {
  const showAlcohol = form.subCategory === "Bars & Beverages";
  function setAttribute(key: string, value: string) {
    updateCategoryAttributes({ ...categoryAttributes, [key]: value });
  }

  function attribute(key: string) {
    return categoryAttributes[key] || "";
  }

  const listingPlanOptions = includeCurrentValue(
    pricingPlans.length ? pricingPlans.map((plan) => plan.name) : listingTypeOptions,
    form.adType,
  );
  const selectedListingPlan = getSelectedPricingPlan(pricingPlans, form.adType);
  const featuredUntilDate = selectedListingPlan
    ? formatInputDate(addMonths(new Date(), selectedListingPlan.durationMonths))
    : attribute("featured_until_date");

  return (
    <>
      <h4>Media Upload</h4>
      <div className="form-group">
        <label>Restaurant Photos (multiple)</label>
        <GalleryMediaEditor
          items={form.galleryMedia}
          files={galleryFiles}
          onChange={updateGalleryMedia}
          onFilesChange={setGalleryFiles}
        />
      </div>
      <FileUpload
        label="Food Photos"
        accept="image/*,.jpg,.jpeg,.png,.webp"
        value={attribute("food_photos")}
        files={galleryFiles}
        onFilesChange={setGalleryFiles}
        onChange={(value) => setAttribute("food_photos", value)}
      />
      <FileUpload
        label="Videos"
        accept="video/*,.mp4,.mov,.webm,.m4v"
        value={form.listingVideo}
        files={galleryFiles}
        onFilesChange={setGalleryFiles}
        onChange={(value) => updateField("listingVideo", value)}
      />
      <FileUpload
        label="Menu PDF Upload"
        accept=".pdf,application/pdf"
        value={attribute("menu_pdf_upload")}
        files={galleryFiles}
        onFilesChange={setGalleryFiles}
        onChange={(value) => setAttribute("menu_pdf_upload", value)}
      />

      <h4>Compliance & Licensing</h4>
      <Input placeholder="Food License Number" value={restaurantInfo.foodLicenseNumber} onChange={(value) => updateRestaurantInfo({ ...restaurantInfo, foodLicenseNumber: value })} />
      <div className="row">
        <InputColumn placeholder="Health Inspection Rating" value={restaurantInfo.healthInspectionRating} onChange={(value) => updateRestaurantInfo({ ...restaurantInfo, healthInspectionRating: value })} />
        {showAlcohol ? <InputColumn placeholder="Alcohol License" value={restaurantInfo.alcoholLicenseNumber} error={fieldErrors.restaurantAlcoholLicenseNumber} onChange={(value) => updateRestaurantInfo({ ...restaurantInfo, alcoholLicenseNumber: value })} /> : null}
        <InputColumn placeholder="Business Registration Number" value={restaurantInfo.businessRegistrationNumber} onChange={(value) => updateRestaurantInfo({ ...restaurantInfo, businessRegistrationNumber: value })} />
      </div>
      {showAlcohol ? (
        <Input placeholder="Age Restriction" value={restaurantInfo.ageRestrictedNotice} onChange={(value) => updateRestaurantInfo({ ...restaurantInfo, ageRestrictedNotice: value })} />
      ) : null}

      <h4>Reservation & Booking</h4>
      <CheckboxField label="Table Reservation Enabled" checked={restaurantInfo.tableBooking} onChange={(value) => updateRestaurantInfo({ ...restaurantInfo, tableBooking: value })} />
      {restaurantInfo.tableBooking ? (
        <div className="row">
          <InputColumn placeholder="Reservation Capacity" type="number" value={restaurantInfo.reservationCapacity} onChange={(value) => updateRestaurantInfo({ ...restaurantInfo, reservationCapacity: value })} />
          <InputColumn placeholder="Online Booking URL (optional)" value={restaurantInfo.onlineBookingUrl} onChange={(value) => updateRestaurantInfo({ ...restaurantInfo, onlineBookingUrl: value })} />
        </div>
      ) : null}

      <h4>Listing Visibility & Promotions</h4>
      <div className="row">
        <SelectColumn placeholder="Listing Type" value={form.adType} options={listingPlanOptions} onChange={(value) => updateField("adType", value)} width="col-md-5" />
        <InputColumn placeholder="Featured Until Date" type="date" value={featuredUntilDate} disabled onChange={() => undefined} width="col-md-5" />
        <div className="col-md-2">
          <div className="form-group listing-plan-action">
            <label className="listing-field-label">&nbsp;</label>
            <button type="button" className="btn btn-primary listing-plan-action-btn" onClick={onViewPlans}>
              View Plans
            </button>
          </div>
        </div>
      </div>
      <Select placeholder="Sponsored Listing" value={attribute("sponsored_listing")} options={yesNoOptions} onChange={(value) => setAttribute("sponsored_listing", value)} />
      <Select placeholder="Boost Listing" value={attribute("boost_listing")} options={yesNoOptions} onChange={(value) => setAttribute("boost_listing", value)} />
    </>
  );
}

function DetailCategoryFields({
  form,
  updateField,
}: {
  form: FormState;
  updateField: (name: StringFormField, value: string) => void;
}) {
  const subCategory = form.subCategory.trim();
  const detailCategory = form.detailCategory.trim();
  if (!form.detailCategory) {
    return null;
  }

  if (isPlotRealEstateCategory(subCategory, detailCategory)) {
    return (
      <>
        <h5 className="mt-3 mb-3">Plot Details</h5>
        <div className="row">
          <InputColumn placeholder="Plot Area*" type="number" value={form.plotArea} onChange={(value) => updateField("plotArea", value)} />
          <InputColumn placeholder="Length" type="number" value={form.length} onChange={(value) => updateField("length", value)} />
        </div>
        <div className="row">
          <InputColumn placeholder="Breadth" type="number" value={form.breadth} onChange={(value) => updateField("breadth", value)} />
          <SelectColumn placeholder="Boundary Wall" value={form.boundaryWall} options={["Yes", "No"]} onChange={(value) => updateField("boundaryWall", value)} />
        </div>
        <div className="row">
          <SelectColumn placeholder="Facing" value={form.facing} options={["East", "West", "North", "South"]} onChange={(value) => updateField("facing", value)} />
          <SelectColumn placeholder="Approval Type" value={form.approvalType} options={["DTCP", "HMDA", "Other"]} onChange={(value) => updateField("approvalType", value)} />
        </div>
        <Input placeholder="Road Width" type="number" value={form.roadWidth} onChange={(value) => updateField("roadWidth", value)} />
      </>
    );
  }

  if (isResidentialRealEstateSubCategory(subCategory)) {
    return (
      <>
        <h5 className="mt-3 mb-3">Residential Details</h5>
        <Select placeholder="Property Type*" value={form.propertyType || form.detailCategory} options={includeCurrentValue(["Apartment", "Villa", "House"], form.detailCategory)} onChange={(value) => updateField("propertyType", value)} />
        <div className="row">
          <SelectColumn placeholder="BHK*" value={form.bhk} options={["1", "2", "3", "4+"]} onChange={(value) => updateField("bhk", value)} />
          <InputColumn placeholder="Bathrooms*" type="number" step="0.5" value={form.bathrooms} onChange={(value) => updateField("bathrooms", value)} />
        </div>
        <div className="row">
          <InputColumn placeholder="Balconies" type="number" value={form.balconies} onChange={(value) => updateField("balconies", value)} />
          <SelectColumn placeholder="Furnishing*" value={form.furnishingType} options={["Unfurnished", "Semi Furnished", "Fully Furnished"]} onChange={(value) => updateField("furnishingType", value)} />
        </div>
        <div className="row">
          <InputColumn placeholder="Super Built-up Area (sq ft)*" type="number" value={form.superBuiltUpArea} onChange={(value) => updateField("superBuiltUpArea", value)} />
          <InputColumn placeholder="Carpet Area (sq ft)" type="number" value={form.carpetArea} onChange={(value) => updateField("carpetArea", value)} />
        </div>
        <div className="row">
          <InputColumn placeholder="Floor Number*" type="number" value={form.floorNumber} onChange={(value) => updateField("floorNumber", value)} />
          <InputColumn placeholder="Total Floors*" type="number" value={form.totalFloors} onChange={(value) => updateField("totalFloors", value)} />
        </div>
        <div className="row">
          <SelectColumn placeholder="Property Age" value={form.propertyAge} options={["New", "Less than 1 year", "1-5 years", "5+ years"]} onChange={(value) => updateField("propertyAge", value)} />
          <SelectColumn placeholder="Facing" value={form.facing} options={["East", "West", "North", "South"]} onChange={(value) => updateField("facing", value)} />
        </div>
        <div className="row">
          <SelectColumn placeholder="Availability*" value={form.availabilityType} options={["Immediate", "Date"]} onChange={(value) => updateField("availabilityType", value)} />
          {form.availabilityType === "Date" ? (
            <InputColumn placeholder="Availability Date*" type="date" value={form.availabilityDate} onChange={(value) => updateField("availabilityDate", value)} />
          ) : null}
        </div>
      </>
    );
  }

  if (isPlotRealEstateCategory(subCategory, detailCategory)) {
    return (
      <>
        <h5 className="mt-3 mb-3">Plot Details</h5>
        <div className="row">
          <InputColumn placeholder="Plot Area*" type="number" value={form.plotArea} onChange={(value) => updateField("plotArea", value)} />
          <InputColumn placeholder="Length" type="number" value={form.length} onChange={(value) => updateField("length", value)} />
        </div>
        <div className="row">
          <InputColumn placeholder="Breadth" type="number" value={form.breadth} onChange={(value) => updateField("breadth", value)} />
          <SelectColumn placeholder="Boundary Wall" value={form.boundaryWall} options={["Yes", "No"]} onChange={(value) => updateField("boundaryWall", value)} />
        </div>
        <div className="row">
          <SelectColumn placeholder="Facing" value={form.facing} options={["East", "West", "North", "South"]} onChange={(value) => updateField("facing", value)} />
          <SelectColumn placeholder="Approval Type" value={form.approvalType} options={["DTCP", "HMDA", "Other"]} onChange={(value) => updateField("approvalType", value)} />
        </div>
        <Input placeholder="Road Width" type="number" value={form.roadWidth} onChange={(value) => updateField("roadWidth", value)} />
      </>
    );
  }

  if (isCommercialRealEstateSubCategory(subCategory)) {
    return (
      <>
        <h5 className="mt-3 mb-3">Commercial Details</h5>
        <Select placeholder="Commercial Type*" value={form.propertyType || form.detailCategory} options={includeCurrentValue(["Office Spaces", "Shops / Showrooms", "Office", "Shop", "Warehouse"], form.detailCategory)} onChange={(value) => updateField("propertyType", value)} />
        <div className="row">
          <InputColumn placeholder="Area (sq ft)*" type="number" value={form.area} onChange={(value) => updateField("area", value)} />
          <SelectColumn placeholder="Furnishing" value={form.furnishingType} options={["Furnished", "Unfurnished"]} onChange={(value) => updateField("furnishingType", value)} />
        </div>
        <div className="row">
          <InputColumn placeholder="Washrooms*" type="number" value={form.washrooms} onChange={(value) => updateField("washrooms", value)} />
          <SelectColumn placeholder="Parking" value={form.parking} options={["Yes", "No"]} onChange={(value) => updateField("parking", value)} />
        </div>
        <Select placeholder="Suitable For" value={form.suitableFor} options={["Office", "Retail", "Storage"]} onChange={(value) => updateField("suitableFor", value)} />
      </>
    );
  }

  if (["PG", "PG / Co-living"].includes(subCategory)) {
    return (
      <>
        <h5 className="mt-3 mb-3">PG / Co-living</h5>
        <Select placeholder="Room Type*" value={form.roomType} options={["Single", "Shared", "Co-living"]} onChange={(value) => updateField("roomType", value)} />
        <Select placeholder="Gender Preference*" value={form.genderPreference} options={["Male", "Female", "Any"]} onChange={(value) => updateField("genderPreference", value)} />
        <Select placeholder="Food Included" value={form.foodIncluded} options={["Yes", "No"]} onChange={(value) => updateField("foodIncluded", value)} />
        <PgAmenitiesCheckboxes value={form.pgAmenities} onChange={(value) => updateField("pgAmenities", value)} />
      </>
    );
  }

  return null;
}

function ListingPriceFields({
  form,
  currencyCountry,
  fieldErrors,
  updateField,
}: {
  form: FormState;
  currencyCountry: string;
  fieldErrors: FieldErrors;
  updateField: (name: StringFormField, value: string) => void;
}) {
  return (
    <>
      <h5 className="mt-3 mb-3">Price Details</h5>
      <div className="row">
        <InputColumn placeholder={labelWithCountryCurrency("Price*", currencyCountry)} type="number" value={form.price} error={fieldErrors.price} onChange={(value) => updateField("price", value)} />
        <SelectColumn placeholder="Price Type" value={form.priceNegotiable} options={["Negotiable", "Fixed"]} onChange={(value) => updateField("priceNegotiable", value)} />
      </div>
    </>
  );
}

function PriceAndAmenitiesFields({
  form,
  currencyCountry,
  updateField,
  updateBooleanField,
}: {
  form: FormState;
  currencyCountry: string;
  updateField: (name: StringFormField, value: string) => void;
  updateBooleanField: (name: BooleanFormField, value: boolean) => void;
}) {
  const isRent = isRentRealEstateSubCategory(form.subCategory);
  const isSale = isSaleRealEstateSubCategory(form.subCategory);
  const isPlot = isPlotRealEstateCategory(form.subCategory, form.detailCategory);
  const pricePlaceholder = isRent ? "Monthly Rent*" : "Total Price*";

  return (
    <>
      <h5 className="mt-3 mb-3">Price Details</h5>
      <div className="row">
        <InputColumn placeholder={labelWithCountryCurrency(pricePlaceholder, currencyCountry)} type="number" value={form.price} onChange={(value) => updateField("price", value)} />
        <SelectColumn placeholder="Price Type" value={form.priceNegotiable} options={["Negotiable", "Fixed"]} onChange={(value) => updateField("priceNegotiable", value)} />
      </div>
      {isRent ? (
        <div className="row">
          <InputColumn placeholder={labelWithCountryCurrency("Security Deposit*", currencyCountry)} type="number" value={form.securityDeposit} onChange={(value) => updateField("securityDeposit", value)} />
          <InputColumn placeholder={labelWithCountryCurrency("Maintenance Charges*", currencyCountry)} type="number" value={form.maintenanceCharges} onChange={(value) => updateField("maintenanceCharges", value)} />
        </div>
      ) : null}
      {isSale ? (
        <>
          <CheckboxField label="Loan Eligible" checked={form.loanEligible} onChange={(value) => updateBooleanField("loanEligible", value)} />
          <Input placeholder={labelWithCountryCurrency("Maintenance Charges", currencyCountry)} type="number" value={form.maintenanceCharges} onChange={(value) => updateField("maintenanceCharges", value)} />
        </>
      ) : null}
      {isPlot ? (
        <Input placeholder={labelWithCountryCurrency("Price per sq ft", currencyCountry)} type="number" value={form.pricePerSqFt} onChange={(value) => updateField("pricePerSqFt", value)} />
      ) : null}

      <h5 className="mt-3 mb-3">Amenities</h5>
      <div className="row listing-amenity-row">
        <div className="col-md-6">
          <CheckboxField label="Parking" checked={form.amenityParking} onChange={(value) => updateBooleanField("amenityParking", value)} />
          <CheckboxField label="Lift" checked={form.amenityLift} onChange={(value) => updateBooleanField("amenityLift", value)} />
          <CheckboxField label="Power Backup" checked={form.amenityPowerBackup} onChange={(value) => updateBooleanField("amenityPowerBackup", value)} />
          <CheckboxField label="Security" checked={form.amenitySecurity} onChange={(value) => updateBooleanField("amenitySecurity", value)} />
          <CheckboxField label="Gym" checked={form.amenityGym} onChange={(value) => updateBooleanField("amenityGym", value)} />
        </div>
        <div className="col-md-6">
          <CheckboxField label="CCTV" checked={form.amenityCctv} onChange={(value) => updateBooleanField("amenityCctv", value)} />
          <CheckboxField label="Swimming Pool" checked={form.amenitySwimmingPool} onChange={(value) => updateBooleanField("amenitySwimmingPool", value)} />
          <CheckboxField label="Garden" checked={form.amenityGarden} onChange={(value) => updateBooleanField("amenityGarden", value)} />
          <CheckboxField label="Children's Play Area" checked={form.amenityChildrensPlayArea} onChange={(value) => updateBooleanField("amenityChildrensPlayArea", value)} />
        </div>
      </div>
    </>
  );
}

function PgAmenitiesCheckboxes({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = new Set(value.split(",").map((item) => item.trim()).filter(Boolean));

  function toggle(amenity: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) {
      next.add(amenity);
    } else {
      next.delete(amenity);
    }

    onChange(Array.from(next).join(", "));
  }

  return (
    <>
      <h5 className="mt-3 mb-3">PG Amenities</h5>
      <div className="row listing-amenity-row">
        {["WiFi", "Laundry", "AC"].map((amenity) => (
          <div className="col-md-4" key={amenity}>
            <CheckboxField label={amenity} checked={selected.has(amenity)} onChange={(checked) => toggle(amenity, checked)} />
          </div>
        ))}
      </div>
    </>
  );
}

function NearbyServicesEditor({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [activeType, setActiveType] = useState(nearbyServiceTypes[0]);
  const services = parseNearbyServices(value);
  const activeItems = services[activeType]?.length ? services[activeType] : [""];

  function updateServices(nextServices: NearbyServices) {
    onChange(serializeNearbyServices(nextServices));
  }

  function updateItem(index: number, itemValue: string) {
    updateServices({
      ...services,
      [activeType]: updateArrayItem(activeItems, index, itemValue),
    });
  }

  function removeItem(index: number) {
    updateServices({
      ...services,
      [activeType]: activeItems.length > 1 ? activeItems.filter((_, itemIndex) => itemIndex !== index) : [""],
    });
  }

  function addItem() {
    updateServices({
      ...services,
      [activeType]: [...activeItems, ""],
    });
  }

  return (
    <div className={`listing-nearby-services-editor${error ? " is-invalid" : ""}`}>
      <h4>Nearby Services</h4>
      <div className="listing-nearby-tabs" role="tablist" aria-label="Nearby services">
        {nearbyServiceTypes.map((type) => (
          <button
            key={type}
            type="button"
            className={type === activeType ? "is-active" : ""}
            onClick={() => setActiveType(type)}
          >
            {type}
          </button>
        ))}
      </div>
      <div className="listing-nearby-panel">
        {activeItems.map((item, index) => (
          <div className="row" key={`${activeType}-${index}`}>
            <InputColumn
              width="col-md-10"
              placeholder={`${activeType} name or location`}
              value={item}
              onChange={(nextValue) => updateItem(index, nextValue)}
            />
            <div className="col-md-2">
              <button type="button" className="btn btn-danger" onClick={() => removeItem(index)}>X</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-success mt-2" onClick={addItem}>
          + Add {activeType}
        </button>
      </div>
      <FieldError message={error} />
    </div>
  );
}

void DetailCategoryFields;
void PriceAndAmenitiesFields;

function TemplateImageColumn({
  label,
  value,
  file,
  error,
  onFileChange,
}: {
  label: string;
  value: string;
  file: File | null;
  error?: string;
  onFileChange: (file: File | null) => void;
}) {
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setFileName(file.name);
      return () => URL.revokeObjectURL(objectUrl);
    }

    if (!value || value.startsWith("__")) {
      setPreviewUrl("");
      setFileName("");
      return;
    }

    setPreviewUrl(resolveListingImageUrl(value));
    setFileName(getFileNameFromPath(value));
    return undefined;
  }, [file, value]);

  function handleFileChange(files: FileList | null) {
    const file = files?.[0] || null;
    onFileChange(file);
  }

  function clearImage() {
    onFileChange(null);
  }

  return (
    <div className="col-md-6">
      <div className="form-group listing-image-upload">
        <label className="listing-field-label">{fieldLabelFromPlaceholder(label)}</label>
        <div className={`listing-image-upload-box${error ? " is-invalid" : ""}`}>
          <input
            id={inputId}
            type="file"
            accept="image/*,.jpg,.jpeg,.png"
            className="listing-image-upload-input"
            onChange={(event) => handleFileChange(event.target.files)}
          />
          <label className="listing-image-upload-button" htmlFor={inputId}>Choose file</label>
          <div className="listing-image-upload-name">{fileName || "No file chosen"}</div>
          {previewUrl ? (
            <div className="listing-image-upload-preview-wrap">
              <img className="listing-image-upload-preview" src={previewUrl} alt={`${fieldLabelFromPlaceholder(label)} preview`} />
              <button type="button" className="listing-image-upload-remove" onClick={clearImage}>Remove</button>
            </div>
          ) : (
            <div className="listing-image-upload-placeholder">Preview</div>
          )}
        </div>
        <FieldError message={error} />
      </div>
    </div>
  );
}

function FileUploadColumn(props: FileUploadProps) {
  return (
    <div className="col-md-6">
      <FileUpload {...props} />
    </div>
  );
}

type FileUploadProps = {
  label: string;
  accept: string;
  value: string;
  error?: string;
  files: GalleryUploadFile[];
  onFilesChange: (files: GalleryUploadFile[]) => void;
  onChange: (value: string) => void;
};

function FileUpload({
  label,
  accept,
  value,
  error,
  files,
  onFilesChange,
  onChange,
}: FileUploadProps) {
  const selectedFile = value.startsWith(galleryImageUploadMarkerPrefix)
    ? files.find((item) => item.marker === value)?.file
    : null;
  const savedFileName = !selectedFile && value && !value.startsWith("__")
    ? getFileNameFromPath(value)
    : "";
  const hasSelectedFile = Boolean(selectedFile || savedFileName);

  function handleFileChange(fileList: FileList | null) {
    const file = fileList?.[0] || null;
    const remainingFiles = value.startsWith(galleryImageUploadMarkerPrefix)
      ? files.filter((item) => item.marker !== value)
      : files;

    if (!file) {
      onFilesChange(remainingFiles);
      onChange("");
      return;
    }

    const marker = `${galleryImageUploadMarkerPrefix}${Date.now()}_${files.length}_${Math.random().toString(36).slice(2)}__`;
    onFilesChange([...remainingFiles, { file, marker }]);
    onChange(marker);
  }

  function clearFile() {
    onFilesChange(value.startsWith(galleryImageUploadMarkerPrefix)
      ? files.filter((item) => item.marker !== value)
      : files);
    onChange("");
  }

  return (
    <div className="form-group">
      <label>{fieldLabelFromPlaceholder(label)}</label>
      <input
        type="file"
        accept={accept}
        className={`form-control file-input${error ? " is-invalid" : ""}`}
        onChange={(event) => handleFileChange(event.target.files)}
      />
      {hasSelectedFile ? (
        <div className="listing-upload-meta">
          <span>{selectedFile ? selectedFile.name : savedFileName}</span>
          {selectedFile ? <small>{formatFileSize(selectedFile.size)}</small> : null}
          <button type="button" className="listing-upload-remove-button" onClick={clearFile}>Remove</button>
        </div>
      ) : null}
      {hasSelectedFile ? (
        <FileUploadPreview
          file={selectedFile || null}
          value={selectedFile ? "" : value}
          label={fieldLabelFromPlaceholder(label)}
        />
      ) : null}
      <FieldError message={error} />
    </div>
  );
}

function FileUploadPreview({
  file,
  value,
  label,
}: {
  file: File | null;
  value: string;
  label: string;
}) {
  const [objectUrl, setObjectUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setObjectUrl("");
      return;
    }

    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl(nextObjectUrl);
    return () => URL.revokeObjectURL(nextObjectUrl);
  }, [file]);

  const previewUrl = file ? objectUrl : resolveUploadFileUrl(value);
  const fileName = file?.name || getFileNameFromPath(value);

  if (!previewUrl) {
    return null;
  }

  const previewLabel = `${fieldLabelFromPlaceholder(label)} preview`;
  const isImage = isPreviewImageFile(file, fileName);
  const isVideo = isPreviewVideoFile(file, fileName);
  const isPdf = isPreviewPdfFile(file, fileName);
  const openPreview = () => {
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1200,height=850");
    if (!popup) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const escapedUrl = previewUrl.replace(/"/g, "&quot;");
    const escapedTitle = previewLabel.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const content = isImage
      ? `<img src="${escapedUrl}" alt="${escapedTitle}" />`
      : isVideo
        ? `<video src="${escapedUrl}" controls autoplay></video>`
        : `<iframe src="${escapedUrl}" title="${escapedTitle}"></iframe>`;

    popup.document.write(`<!doctype html>
<html>
<head>
  <title>${escapedTitle}</title>
  <style>
    html, body { margin: 0; width: 100%; height: 100%; background: #111827; }
    body { display: flex; align-items: center; justify-content: center; }
    img, video, iframe { max-width: 100%; max-height: 100%; width: 100%; height: 100%; object-fit: contain; border: 0; }
  </style>
</head>
<body>${content}</body>
</html>`);
    popup.document.close();
  };

  return (
    <div className="listing-upload-preview-card">
      <div className="listing-upload-preview-frame">
        {isImage ? (
          <img src={previewUrl} alt={previewLabel} />
        ) : isVideo ? (
          <video src={previewUrl} controls />
        ) : isPdf ? (
          <iframe src={previewUrl} title={previewLabel} />
        ) : (
          <div className="listing-upload-preview-file">
            <i className="material-icons">insert_drive_file</i>
            <span>Preview available in new tab</span>
          </div>
        )}
      </div>
      <button type="button" className="listing-upload-preview-link" onClick={openPreview}>
        Preview file
      </button>
    </div>
  );
}

function getFileNameFromPath(value: string) {
  const cleanValue = value.split("?")[0].split("#")[0];
  return cleanValue.split(/[\\/]/).filter(Boolean).pop() || "Uploaded file";
}

function resolveUploadFileUrl(value: string) {
  const uploadValue = value.trim();

  if (!uploadValue || uploadValue.startsWith("__")) {
    return "";
  }

  if (uploadValue.startsWith("uploads/")) {
    return resolveListingImageUrl(`/${uploadValue}`);
  }

  if (uploadValue.startsWith("/uploads/")) {
    return resolveListingImageUrl(uploadValue);
  }

  if (
    uploadValue.startsWith("/") ||
    uploadValue.startsWith("http://") ||
    uploadValue.startsWith("https://") ||
    uploadValue.startsWith("data:") ||
    uploadValue.startsWith("blob:")
  ) {
    return uploadValue;
  }

  return "";
}

function isPreviewImageFile(file: File | null, fileName: string) {
  return file?.type.startsWith("image/") || /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?|#|$)/i.test(fileName);
}

function isPreviewVideoFile(file: File | null, fileName: string) {
  return file?.type.startsWith("video/") || /\.(m4v|mov|mp4|webm)(\?|#|$)/i.test(fileName);
}

function isPreviewPdfFile(file: File | null, fileName: string) {
  return file?.type === "application/pdf" || /\.pdf(\?|#|$)/i.test(fileName);
}

function isUploadCategoryField(field: CategoryAttributeField) {
  if (field.type === "file") {
    return true;
  }

  const normalizedKey = normalizeFieldKey(field.key);
  const normalizedLabel = field.label.toLowerCase();
  const uploadKeyTokens = [
    "image",
    "photo",
    "picture",
    "logo",
    "banner",
    "menu_pdf",
    "brochure",
    "document",
    "certificate",
    "floor_plan",
  ];

  if (uploadKeyTokens.some((token) => normalizedKey.includes(token))) {
    return true;
  }

  return (
    /\b(image|photo|picture|logo|banner)\b/i.test(field.label) ||
    /\b(upload|pdf|document|certificate|brochure|floor plan)\b/i.test(normalizedLabel)
  );
}

function getUploadAcceptForField(field: CategoryAttributeField) {
  const searchable = `${field.key} ${field.label}`.toLowerCase();

  if (/\bpdf\b|brochure|menu_pdf/.test(searchable)) {
    return ".pdf,application/pdf";
  }

  if (/document|certificate/.test(searchable)) {
    return ".pdf,.doc,.docx,image/*,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "image/*,.jpg,.jpeg,.png,.webp";
}

function GalleryMediaEditor({
  files,
  items,
  error,
  onChange,
  onFilesChange,
}: {
  files: GalleryUploadFile[];
  items: string[];
  error?: string;
  onChange: (items: string[]) => void;
  onFilesChange: (files: GalleryUploadFile[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleFilesChange(fileList: FileList | null) {
    const selectedFiles = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (!selectedFiles.length) {
      return;
    }

    const nextFiles = selectedFiles.map((file, index) => ({
      file,
      marker: `${galleryImageUploadMarkerPrefix}${Date.now()}_${files.length + index}_${Math.random().toString(36).slice(2)}__`,
    }));

    onFilesChange([...files, ...nextFiles]);
    onChange([...items, ...nextFiles.map((item) => item.marker)]);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    handleFilesChange(event.dataTransfer.files);
  }

  function removeItem(value: string) {
    onFilesChange(files.filter((file) => file.marker !== value));
    onChange(items.filter((item) => item !== value));
  }

  const existingImages = items.filter((item) => item && !item.startsWith(galleryImageUploadMarkerPrefix));

  return (
    <div className="form-group">
      <input
        ref={inputRef}
        type="file"
        name="gallery_image[]"
        accept="image/*,.jpg,.jpeg,.png"
        multiple
        style={{ display: "none" }}
        onChange={(event) => handleFilesChange(event.target.files)}
      />
      <div
        className={`imageuploadify well listing-gallery-uploader${error ? " is-invalid" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="imageuploadify-overlay">
          <i className="fa fa-picture-o"></i>
        </div>
        <div className="imageuploadify-images-list text-center">
          <img src="/template-17/images/icon/upload.png" alt="" />
          <span className="imageuploadify-message">
            Drag&amp;Drop your image here or <button type="button" className="btn-default" onClick={() => inputRef.current?.click()}>select file to upload</button>
          </span>
          <span className="img-notes">Supports multiple JPG, JPEG, PNG and other image files</span>
          {(existingImages.length || files.length) ? (
            <div className="listing-gallery-preview-grid">
              {existingImages.map((imageUrl) => (
                <div className="listing-gallery-preview" key={imageUrl}>
                  <button type="button" className="btn btn-danger" onClick={() => removeItem(imageUrl)}>
                    <i className="material-icons">close</i>
                  </button>
                  <img src={resolveListingImageUrl(imageUrl)} alt="" />
                  <div className="listing-gallery-preview-meta">
                    <span>Saved image</span>
                  </div>
                </div>
              ))}
              {files.map((item) => (
                <GalleryFilePreview item={item} onRemove={() => removeItem(item.marker)} key={item.marker} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <FieldError message={error} />
    </div>
  );
}

function GalleryFilePreview({ item, onRemove }: { item: GalleryUploadFile; onRemove: () => void }) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [item.file]);

  return (
    <div className="listing-gallery-preview">
      <button type="button" className="btn btn-danger" onClick={onRemove}>
        <i className="material-icons">close</i>
      </button>
      {previewUrl ? <img src={previewUrl} alt="" /> : null}
      <div className="listing-gallery-preview-meta">
        <span>{item.file.name}</span>
        <small>{formatFileSize(item.file.size)}</small>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function RestaurantInfoFields({
  restaurantInfo,
  fieldErrors,
  onChange,
}: {
  restaurantInfo: RestaurantInfo;
  fieldErrors: FieldErrors;
  onChange: (value: RestaurantInfo) => void;
}) {
  const cuisineOptions = ["Indian", "Chinese", "Italian", "Mexican", "Thai", "Mediterranean", "American", "Vegan", "Korean", "Japanese", "Middle Eastern"];
  const selectedCuisines = restaurantInfo.cuisine
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  function toggleCuisine(value: string, checked: boolean) {
    const nextCuisines = checked
      ? [...selectedCuisines, value]
      : selectedCuisines.filter((item) => item !== value);

    onChange({ ...restaurantInfo, cuisine: Array.from(new Set(nextCuisines)).join(", ") });
  }

  function toggleFoodType(value: string, checked: boolean) {
    onChange({
      ...restaurantInfo,
      foodTypes: checked
        ? [...restaurantInfo.foodTypes, value]
        : restaurantInfo.foodTypes.filter((item) => item !== value),
    });
  }

  return (
    <>
      <h5 className="mt-3 mb-3">Restaurant / Business Information</h5>
      <div className="row">
        <InputColumn placeholder="Restaurant Name*" value={restaurantInfo.restaurantName} error={fieldErrors.restaurantName} onChange={(value) => onChange({ ...restaurantInfo, restaurantName: value })} />
        <InputColumn placeholder="Business Name (optional)" value={restaurantInfo.businessName} onChange={(value) => onChange({ ...restaurantInfo, businessName: value })} />
      </div>
      <div className="row">
        <SelectColumn placeholder="Business Type*" value={restaurantInfo.businessType} error={fieldErrors.restaurantBusinessType} options={["Restaurant", "Cafe", "Bar", "Cloud Kitchen", "Catering", "Food Truck", "Grocery", "Bakery", "Other"]} onChange={(value) => onChange({ ...restaurantInfo, businessType: value })} />
        <InputColumn placeholder="Year Established*" type="number" value={restaurantInfo.yearEstablished} error={fieldErrors.restaurantYearEstablished} onChange={(value) => onChange({ ...restaurantInfo, yearEstablished: value })} />
      </div>
      <div className="row">
        <InputColumn placeholder="Tagline (optional)" value={restaurantInfo.tagline} onChange={(value) => onChange({ ...restaurantInfo, tagline: value })} />
      </div>
      <Textarea placeholder="Description*" value={restaurantInfo.description} error={fieldErrors.restaurantDescription} onChange={(value) => onChange({ ...restaurantInfo, description: value })} />
      <MultiSelectCheckboxes title="Cuisine Information" options={cuisineOptions} selected={selectedCuisines} error={fieldErrors.restaurantCuisine} onChange={toggleCuisine} />
      <MultiSelectCheckboxes title="Food Type" options={["Veg", "Non-Veg", "Vegan", "Halal", "Kosher", "Gluten-Free"]} selected={restaurantInfo.foodTypes} error={fieldErrors.restaurantFoodTypes} onChange={toggleFoodType} />
    </>
  );
}

function MultiSelectCheckboxes({
  title,
  options,
  selected,
  error,
  onChange,
}: {
  title: string;
  options: string[];
  selected: string[];
  error?: string;
  onChange: (value: string, checked: boolean) => void;
}) {
  return (
    <>
      <h5 className="mt-3 mb-3">{title}</h5>
      <FieldError message={error} />
      <div className="row listing-amenity-row">
        {options.map((option) => (
          <div className="col-md-6" key={option}>
            <CheckboxField label={option} checked={selected.includes(option)} onChange={(checked) => onChange(option, checked)} />
          </div>
        ))}
      </div>
    </>
  );
}

function BusinessHoursEditor({
  hours,
  onChange,
  title = "Business Hours",
}: {
  hours: BusinessHour[];
  onChange: (value: BusinessHour[]) => void;
  title?: string;
}) {
  const [bulkHour, setBulkHour] = useState({ status: "Open", open: "", close: "", is24Hours: false });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  function updateHour(index: number, value: BusinessHour) {
    onChange(updateArrayItem(hours, index, value));
  }

  function applyHours(targetDays: string[]) {
    if (!targetDays.length) {
      return;
    }

    onChange(hours.map((hour) => (
      targetDays.includes(hour.day)
        ? { ...hour, status: bulkHour.status, open: bulkHour.open, close: bulkHour.close, is24Hours: bulkHour.is24Hours }
        : hour
    )));
  }

  function toggleSelectedDay(day: string) {
    setSelectedDays((items) => (
      items.includes(day)
        ? items.filter((item) => item !== day)
        : [...items, day]
    ));
  }

  return (
    <ListingSectionCard title={title}>
      <div className="listing-hours-tools">
        <div className="listing-hours-bulk">
          <div className="listing-hours-bulk-row">
            <div className="listing-hours-bulk-fields">
              <div className="listing-hours-field">
                <label className="listing-field-label">Status</label>
                <select className="form-control" value={bulkHour.status} onChange={(event) => setBulkHour((value) => ({ ...value, status: event.target.value }))}>
                  <option>Open</option>
                  <option>Closed</option>
                </select>
              </div>
              <div className="listing-hours-field">
                <label className="listing-field-label">Open Time</label>
                <input type="time" className="form-control" value={bulkHour.open} disabled={bulkHour.status === "Closed"} onChange={(event) => setBulkHour((value) => ({ ...value, open: event.target.value }))} />
              </div>
              <div className="listing-hours-field">
                <label className="listing-field-label">Close Time</label>
                <input type="time" className="form-control" value={bulkHour.close} disabled={bulkHour.status === "Closed"} onChange={(event) => setBulkHour((value) => ({ ...value, close: event.target.value }))} />
              </div>
              <label className="listing-inline-check"><input type="checkbox" checked={bulkHour.is24Hours} disabled={bulkHour.status === "Closed"} onChange={(event) => setBulkHour((value) => ({ ...value, is24Hours: event.target.checked }))} /> 24/7</label>
            </div>
          </div>
          <div className="listing-hours-bulk-row">
            <div className="listing-hours-day-select">
              {hours.map((hour) => (
                <div className="chbox" key={`selected-${hour.day}`}>
                  <input
                    id={`business-hour-${hour.day.toLowerCase()}`}
                    type="checkbox"
                    checked={selectedDays.includes(hour.day)}
                    onChange={() => toggleSelectedDay(hour.day)}
                  />
                  <label htmlFor={`business-hour-${hour.day.toLowerCase()}`}>{hour.day.slice(0, 3).toUpperCase()}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="listing-hours-action-row">
            <button type="button" className="btn btn-primary" onClick={() => applyHours(hours.map((hour) => hour.day))}>
              Apply all
            </button>
            <button type="button" className="btn btn-primary" onClick={() => applyHours(selectedDays)}>
              Apply selected
            </button>
          </div>
        </div>
      </div>
      <div className="listing-hours-grid">
        {hours.map((hour, index) => (
          <div className="listing-hours-row" key={hour.day}>
            <div className="listing-hours-day">{hour.day}</div>
            <div className="listing-hours-field">
              <label className="listing-field-label">Status</label>
              <select className="form-control" value={hour.status} onChange={(event) => updateHour(index, { ...hour, status: event.target.value })}>
                <option>Open</option>
                <option>Closed</option>
              </select>
            </div>
            <div className="listing-hours-field">
              <label className="listing-field-label">Open Time</label>
              <input type="time" className="form-control" value={hour.open} disabled={hour.status === "Closed" || hour.is24Hours} onChange={(event) => updateHour(index, { ...hour, open: event.target.value })} />
            </div>
            <div className="listing-hours-field">
              <label className="listing-field-label">Close Time</label>
              <input type="time" className="form-control" value={hour.close} disabled={hour.status === "Closed" || hour.is24Hours} onChange={(event) => updateHour(index, { ...hour, close: event.target.value })} />
            </div>
          </div>
        ))}
      </div>
    </ListingSectionCard>
  );
}

function ContactLocationFields({
  contactInfo,
  country,
  fallbackState,
  fallbackCity,
  onChange,
  showAddress = true,
}: {
  contactInfo: ContactInfo;
  country: string;
  fallbackState: string;
  fallbackCity: string;
  onChange: (value: ContactInfo) => void;
  showAddress?: boolean;
}) {
  const searchState = contactInfo.state || fallbackState;
  const searchCity = contactInfo.city || fallbackCity;

  useEffect(() => {
    const zipcode = contactInfo.zipcode.trim();

    if (!/^\d{5}$/.test(zipcode) && !/^\d{6}$/.test(zipcode)) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      lookupPostalCodeLocation(
        zipcode,
        zipcode.length === 6 ? "India" : "US",
        controller.signal,
      )
        .then((location) => {
          if (!location || contactInfo.zipcode.trim() !== zipcode) {
            return;
          }

          onChange({
            ...contactInfo,
            city: location.city || contactInfo.city,
            state: location.state || contactInfo.state,
          });
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
        });
    }, 500);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [contactInfo.zipcode, onChange]);

  return (
    <>
      <ListingSectionCard title="Contact & Location">
        <div className="row">
          <LabeledInputColumn label="Main Phone *" placeholder="" value={contactInfo.mainPhone} onChange={(value) => onChange({ ...contactInfo, mainPhone: value })} />
          <LabeledInputColumn label="Alternate Phone" placeholder="" value={contactInfo.alternatePhone} onChange={(value) => onChange({ ...contactInfo, alternatePhone: value })} />
        </div>
        <div className="row">
          <LabeledInputColumn label="Toll Free" placeholder="" value={contactInfo.tollFree} onChange={(value) => onChange({ ...contactInfo, tollFree: value })} />
          <LabeledInputColumn label="Email *" placeholder="" type="email" value={contactInfo.email} onChange={(value) => onChange({ ...contactInfo, email: value })} />
        </div>
      </ListingSectionCard>
      {showAddress ? <ListingSectionCard title="Address" className="listing-address-card">
        <AddressAutocompleteInput
          placeholder="Street Address"
          value={contactInfo.streetAddress}
          country={country}
          state={searchState}
          city={searchCity}
          onChange={(value) => onChange({ ...contactInfo, streetAddress: value })}
          onPostalCodeDetected={(postalCode) => onChange({ ...contactInfo, zipcode: postalCode })}
          onPlaceSelect={(addressDetails) => onChange({
            ...contactInfo,
            streetAddress: addressDetails.address || contactInfo.streetAddress,
            zipcode: addressDetails.pincode || contactInfo.zipcode,
            city: contactInfo.city || searchCity,
            state: contactInfo.state || searchState,
          })}
        />
        <Input placeholder="Suite No Flat No" value={contactInfo.suite} onChange={(value) => onChange({ ...contactInfo, suite: value })} />
        <Input placeholder="Zipcode" value={contactInfo.zipcode} onChange={(value) => onChange({ ...contactInfo, zipcode: value })} />
        <div className="row">
          <InputColumn placeholder="City" value={contactInfo.city} onChange={(value) => onChange({ ...contactInfo, city: value })} />
          <InputColumn placeholder="State" value={contactInfo.state} onChange={(value) => onChange({ ...contactInfo, state: value })} />
        </div>
      </ListingSectionCard> : null}
    </>
  );
}

function WebLinksFields({
  webLinks,
  onChange,
}: {
  webLinks: WebLinks;
  onChange: (value: WebLinks) => void;
}) {
  return (
    <>
      <div className="row">
        <h4 className="mt-2">Websites</h4>
        <InputColumnWithLabel label="Main Website" placeholder="https://example.com" type="url" value={webLinks.mainWebsite} onChange={(value) => onChange({ ...webLinks, mainWebsite: value })} />
        <InputColumnWithLabel label="Display Website" placeholder="https://example.com" type="url" value={webLinks.displayWebsite} onChange={(value) => onChange({ ...webLinks, displayWebsite: value })} />
        <InputColumnWithLabel label="iOS App URL" placeholder="App Store link" type="url" value={webLinks.iosApp} onChange={(value) => onChange({ ...webLinks, iosApp: value })} />
        <InputColumnWithLabel label="Android App URL" placeholder="Play Store link" type="url" value={webLinks.androidApp} onChange={(value) => onChange({ ...webLinks, androidApp: value })} />
      </div>
    </>
  );
}

function SocialLinksFields({
  socialLinks,
  onChange,
}: {
  socialLinks: SocialLinks;
  onChange: (value: SocialLinks) => void;
}) {
  return (
    <div className="row">
      <h4 className="mt-2">Social Media</h4>
      <InputColumnWithLabel label="Facebook" placeholder="Facebook link" value={socialLinks.facebook} onChange={(value) => onChange({ ...socialLinks, facebook: value })} />
      <InputColumnWithLabel label="Instagram" placeholder="Instagram link" value={socialLinks.instagram} onChange={(value) => onChange({ ...socialLinks, instagram: value })} />
      <InputColumnWithLabel label="Twitter" placeholder="Twitter link" value={socialLinks.twitter} onChange={(value) => onChange({ ...socialLinks, twitter: value })} />
      <InputColumnWithLabel label="YouTube" placeholder="YouTube link" value={socialLinks.youtube} onChange={(value) => onChange({ ...socialLinks, youtube: value })} />
      <InputColumnWithLabel label="LinkedIn" placeholder="LinkedIn link" value={socialLinks.linkedin} onChange={(value) => onChange({ ...socialLinks, linkedin: value })} />
    </div>
  );
}

function InputColumnWithLabel({ label, placeholder, value, onChange, type = "text" }: FieldProps & { label: string; type?: string }) {
  return (
    <div className="col-md-6">
      <div className="form-group">
        <label>{fieldLabelFromPlaceholder(label)}</label>
        <input className="form-control" type={type} value={value} placeholder={cleanOptionalText(placeholder)} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

function ProductsServicesFields({
  products,
  services,
  brands,
  onProductsChange,
  onServicesChange,
  onBrandsChange,
}: {
  products: string[];
  services: ServiceItem[];
  brands: string[];
  onProductsChange: (value: string[]) => void;
  onServicesChange: (value: ServiceItem[]) => void;
  onBrandsChange: (value: string[]) => void;
}) {
  return (
    <>
      <DynamicTextList title="Products" addLabel="+ Add Product" placeholder="Enter product" items={products} onChange={onProductsChange} />
      <DynamicTextList
        title="Services"
        addLabel="+ Add Service"
        placeholder="Enter service"
        items={services.map((service) => service.name)}
        onChange={(items) => onServicesChange(items.map((name, index) => ({ name, imageName: services[index]?.imageName || "" })))}
      />
      <DynamicTextList title="Brands" addLabel="+ Add brands" placeholder="Enter brand" items={brands} onChange={onBrandsChange} />
    </>
  );
}

function DynamicTextList({
  title,
  addLabel,
  placeholder,
  items,
  onChange,
}: {
  title: string;
  addLabel: string;
  placeholder: string;
  items: string[];
  onChange: (value: string[]) => void;
}) {
  const normalizedItems = items.length ? items : [""];

  function updateItem(index: number, value: string) {
    onChange(updateArrayItem(normalizedItems, index, value));
  }

  function removeItem(index: number) {
    onChange(normalizedItems.length > 1 ? normalizedItems.filter((_, itemIndex) => itemIndex !== index) : [""]);
  }

  return (
    <li>
      <h4 className="mt-4">{title}</h4>
      {normalizedItems.map((item, index) => (
        <div className="row" key={`${title}-${index}`}>
          <InputColumn width="col-md-10" placeholder={placeholder} value={item} onChange={(value) => updateItem(index, value)} />
          <div className="col-md-2">
            <button type="button" className="btn btn-danger" onClick={() => removeItem(index)}>X</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-success mt-2" onClick={() => onChange([...normalizedItems, ""])}>
        {addLabel}
      </button>
    </li>
  );
}

function PaymentMethodsFields({
  paymentMethods,
  onChange,
}: {
  paymentMethods: PaymentMethods;
  onChange: (value: PaymentMethods) => void;
}) {
  return (
    <>
      <h4 className="mt-4">Payment Methods</h4>
      <div className="row listing-amenity-row">
        <div className="col-md-6">
          <CheckboxField label="Credit Card" checked={paymentMethods.creditCard} onChange={(value) => onChange({ ...paymentMethods, creditCard: value })} />
          <CheckboxField label="Cash" checked={paymentMethods.cash} onChange={(value) => onChange({ ...paymentMethods, cash: value })} />
          <CheckboxField label="UPI" checked={paymentMethods.upi} onChange={(value) => onChange({ ...paymentMethods, upi: value })} />
        </div>
        <div className="col-md-6">
          <CheckboxField label="Google Pay" checked={paymentMethods.googlePay} onChange={(value) => onChange({ ...paymentMethods, googlePay: value })} />
          <CheckboxField label="Apple Pay" checked={paymentMethods.applePay} onChange={(value) => onChange({ ...paymentMethods, applePay: value })} />
          <CheckboxField label="Insurance" checked={paymentMethods.insurance} onChange={(value) => onChange({ ...paymentMethods, insurance: value })} />
        </div>
      </div>
    </>
  );
}

function StepNavigation({
  isFirst = false,
  onCancel,
  onPrevious,
  onNext,
  onSkip,
  nextLabel = "Next",
  nextDisabled = false,
  progress,
}: {
  isFirst?: boolean;
  onCancel?: () => void;
  onPrevious?: () => void;
  onNext: () => void | Promise<void>;
  onSkip?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  progress: number;
}) {
  return (
    <>
      <div className="row">
        <div className={isFirst ? "col-md-6" : "col-md-6"}>
          <button type="button" className="btn btn-primary" onClick={isFirst ? onCancel : onPrevious}>
            {isFirst ? "Cancel" : "Previous"}
          </button>
        </div>
        <div className="col-md-6">
          <button type="button" className="btn btn-primary" onClick={onNext} disabled={nextDisabled}>{nextLabel}</button>
        </div>
        {onSkip ? (
          <div className="col-md-12">
            <a href="#skip" className="skip" onClick={(event) => { event.preventDefault(); onSkip(); }}>Skip this &gt;&gt;</a>
          </div>
        ) : null}
      </div>
      <Progress value={progress} />
    </>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="progress biz-prog">
      <div className="progress-bar bg-success progress-bar-striped progress-bar-animated" style={{ width: `${value}%` }}>{value}%</div>
    </div>
  );
}

function PlansSelectionModal({
  plans,
  selectedPlanName,
  activePlanCode,
  message,
  isLoading,
  selectingPlanCode,
  country,
  onSelect,
  onClose,
}: {
  plans: PricingPlan[];
  selectedPlanName: string;
  activePlanCode: string;
  message: string;
  isLoading: boolean;
  selectingPlanCode: string;
  country: string;
  onSelect: (plan: PricingPlan) => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <div className="listing-plan-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="listing-plan-modal" role="dialog" aria-modal="true" aria-label="Select listing plan" onMouseDown={(event) => event.stopPropagation()}>
        <div className="listing-plan-modal-head">
          <h3>View Plans</h3>
          <button type="button" className="listing-plan-modal-close" aria-label="Close plans" onClick={onClose}>x</button>
        </div>
        {message ? <div className="listing-plan-modal-message">{message}</div> : null}
        <div className="listing-plan-modal-grid">
          {isLoading ? (
            <div className="listing-plan-modal-empty">Loading plans...</div>
          ) : plans.length ? plans.map((plan) => {
            const isSelected = Boolean(getSelectedPricingPlan([plan], selectedPlanName)) || normalizePlanValue(activePlanCode) === normalizePlanValue(plan.code);
            return (
              <article className={`listing-plan-modal-card${plan.isHighlighted ? " is-highlighted" : ""}`} key={plan.code}>
                <div>
                  <h4>{plan.name}</h4>
                  <p>{plan.tagline}</p>
                </div>
                <strong>{plan.price === 0 ? "Free" : formatCurrencyAmount(plan.price, country)}</strong>
                <span>{plan.durationMonths} month{plan.durationMonths === 1 ? "" : "s"} - {plan.listingLimit < 0 ? "Unlimited" : plan.listingLimit} listings</span>
                <ul>
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <button type="button" className="btn btn-primary" disabled={selectingPlanCode === plan.code} onClick={() => onSelect(plan)}>
                  {selectingPlanCode === plan.code ? "Selecting..." : isSelected ? "Selected" : "Select Plan"}
                </button>
              </article>
            );
          }) : (
            <div className="listing-plan-modal-empty">Plans are not available right now.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildListingPayload(
  form: FormState,
  services: ServiceItem[],
  offers: OfferItem[],
  infoItems: InfoItem[],
  sellerName: string,
  businessHours: BusinessHour[],
  contactInfo: ContactInfo,
  webLinks: WebLinks,
  socialLinks: SocialLinks,
  products: string[],
  brands: string[],
  paymentMethods: PaymentMethods,
  restaurantInfo: RestaurantInfo,
  restaurantMenuItems: RestaurantMenuItem[],
  categoryAttributes: CategoryAttributes,
  mode: ListingFormMode = "listing",
): UpsertListingPayload {
  const isClassifiedMode = mode === "classified";
  const careServiceTitle = form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "serviceTitle", "service_title").trim() : "";
  const careServiceDescription = form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "description", "serviceDescription", "service_description").trim() : "";
  const isEventsTicketsPayload = form.categoryName === "Events & Tickets" || form.categoryName === "Tickets & Events";
  const eventTitle = isEventsTicketsPayload ? getAttributeValue(categoryAttributes, "event_title", "eventTitle").trim() : "";
  const eventDescription = isEventsTicketsPayload ? getAttributeValue(categoryAttributes, "event_description", "eventDescription").trim() : "";
  const isRoommatesRentalsPayload = form.categoryName === "Roommates & Rentals";
  const roommatesRentalTitle = isRoommatesRentalsPayload ? getAttributeValue(categoryAttributes, "listing_title", "listingTitle").trim() : "";
  const roommatesRentalDescription = isRoommatesRentalsPayload ? getAttributeValue(categoryAttributes, "description").trim() : "";
  const isJobsPayload = form.categoryName === "Jobs";
  const jobTitle = isJobsPayload ? getAttributeValue(categoryAttributes, "job_title", "jobTitle").trim() : "";
  const jobDescription = isJobsPayload ? getAttributeValue(categoryAttributes, "job_description", "jobDescription").trim() : "";
  const isElectronicsPayload = isElectronicsCategoryName(form.categoryName);
  const electronicsTitle = isElectronicsPayload ? getAttributeValue(categoryAttributes, "listing_title", "listingTitle").trim() : "";
  const electronicsDescription = isElectronicsPayload ? getAttributeValue(categoryAttributes, "description").trim() : "";
  const isPetsPayload = form.categoryName === "Pets & Animals";
  const petTitle = isPetsPayload ? getAttributeValue(categoryAttributes, "listing_title", "listingTitle").trim() : "";
  const petDescription = isPetsPayload ? getAttributeValue(categoryAttributes, "description").trim() : "";
  const listingDescription = careServiceDescription || roommatesRentalDescription || jobDescription || electronicsDescription || petDescription || form.description.trim() || form.businessDescription.trim();
  const businessDescription = form.businessDescription.trim() || form.description.trim();
  const listingPrice =
    numberAttribute(categoryAttributes, "price", "listing_price", "total_price", "monthly_rent", "sale_price", "vehicle_price") ??
    numberOrNull(form.price) ??
    numberOrNull(offers[0]?.price) ??
    0;
  const priceNegotiableValue = getAttributeValue(categoryAttributes, "price_negotiable", "priceNegotiable", "negotiable").trim();
  const vehicleMapLocation = parseLatLong(getAttributeValue(categoryAttributes, "map_lat_long", "mapLatLong", "google_map_lat_long").trim());
  const vehicleAreaLocality = getAttributeValue(categoryAttributes, "area_locality", "areaLocality").trim();
  const isEvVehiclePayload = isVehicleEvSelection(form.subCategory, form.detailCategory);
  const isChargingStationPayload = form.detailCategory === "Charging Stations";
  const isCarsVehiclePayload = form.subCategory === "Cars";
  const isCareServicesPayload = form.categoryName === "Care Services";
  const vehicleTitle = getAttributeValue(categoryAttributes, "listing_title", "listingTitle").trim() || form.title.trim();
  const vehicleDescription = getAttributeValue(categoryAttributes, "description").trim() || form.businessDescription.trim() || form.description.trim();
  const careContactName = getAttributeValue(categoryAttributes, "contactName", "contact_name").trim();
  const careContactPhone = getAttributeValue(categoryAttributes, "contactPhone", "contact_phone").trim();
  const careContactEmail = getAttributeValue(categoryAttributes, "contactEmail", "contact_email").trim();
  const careContactWebsite = getAttributeValue(categoryAttributes, "contactWebsite", "contact_website").trim();
  const roommatesContactName = isRoommatesRentalsPayload ? getAttributeValue(categoryAttributes, "contact_name", "contactName").trim() : "";
  const roommatesContactPhone = isRoommatesRentalsPayload ? getAttributeValue(categoryAttributes, "phone", "contact_phone", "contactPhone").trim() : "";
  const roommatesContactEmail = isRoommatesRentalsPayload ? getAttributeValue(categoryAttributes, "email", "contact_email", "contactEmail").trim() : "";
  const jobContactName = isJobsPayload ? getAttributeValue(categoryAttributes, "contact_name", "contactName").trim() : "";
  const jobContactPhone = isJobsPayload ? getAttributeValue(categoryAttributes, "phone", "contact_phone", "contactPhone").trim() : "";
  const jobContactEmail = isJobsPayload ? getAttributeValue(categoryAttributes, "email", "contact_email", "contactEmail").trim() : "";
  const electronicsSellerName = isElectronicsPayload ? getAttributeValue(categoryAttributes, "seller_name", "sellerName").trim() : "";
  const electronicsSellerPhone = isElectronicsPayload ? getAttributeValue(categoryAttributes, "phone", "contact_phone", "contactPhone").trim() : "";
  const electronicsSellerEmail = isElectronicsPayload ? getAttributeValue(categoryAttributes, "email", "contact_email", "contactEmail").trim() : "";
  const electronicsSellerWebsite = isElectronicsPayload ? getAttributeValue(categoryAttributes, "website").trim() : "";
  const electronicsVideoUrl = isElectronicsPayload ? getAttributeValue(categoryAttributes, "product_video_url", "productVideoUrl").trim() : "";
  const petContactName = isPetsPayload ? getAttributeValue(categoryAttributes, "contact_name", "contactName").trim() : "";
  const petContactPhone = isPetsPayload ? getAttributeValue(categoryAttributes, "phone", "contact_phone", "contactPhone").trim() : "";
  const petContactEmail = isPetsPayload ? getAttributeValue(categoryAttributes, "email", "contact_email", "contactEmail").trim() : "";
  const petWebsite = isPetsPayload ? getAttributeValue(categoryAttributes, "website").trim() : "";
  const petVideoUrl = isPetsPayload ? getAttributeValue(categoryAttributes, "pet_video_url", "petVideoUrl").trim() : "";
  const adDurationDays =
    numberAttribute(categoryAttributes, "ad_duration_days", "adDurationDays", "ad_duration") ??
    numberOrNull(form.adDurationDays) ??
    30;
  const sellerType = getAttributeValue(categoryAttributes, "seller_type", "sellerType").trim() || form.sellerType.trim();
  const restaurantServiceTypes = getSelectedRestaurantServiceTypes(restaurantInfo, categoryAttributes);
  const isRestaurantCloudKitchen = ["Cloud Kitchen", "Cloud Kitchen / Delivery Only"].includes(form.subCategory);
  const restaurantTitle = restaurantInfo.restaurantName.trim() || getAttributeValue(categoryAttributes, "restaurant_name", "restaurantName").trim() || form.title.trim();
  const restaurantDescription = restaurantInfo.description.trim() || getAttributeValue(categoryAttributes, "description").trim();
  const restaurantAmenities = [
    ["WiFi", "wifi"],
    ["Parking", "parking"],
    ["Outdoor Seating", "outdoor_seating"],
    ["Live Music", "live_music"],
    ["Family Friendly", "family_friendly"],
    ["Pet Friendly", "pet_friendly"],
    ["Wheelchair Accessible / ADA Compliance", "wheelchair_accessible"],
  ]
    .filter(([, key]) => boolAttribute(categoryAttributes, key) === true)
    .map(([label]) => label);

  return {
    title: form.categoryName === "Restaurants & Food" ? restaurantTitle : form.categoryName === "Vehicles" ? vehicleTitle : eventTitle || roommatesRentalTitle || jobTitle || electronicsTitle || petTitle || careServiceTitle || form.title.trim(),
    description: form.categoryName === "Restaurants & Food" ? restaurantDescription : form.categoryName === "Vehicles" ? vehicleDescription : eventDescription || listingDescription,
    categoryName: isClassifiedMode ? "Classifieds" : form.categoryName.trim(),
    subCategory: isClassifiedMode ? form.categoryName.trim() : form.subCategory.trim(),
    detailCategory: isClassifiedMode ? form.detailCategory.trim() : form.detailCategory.trim() || form.subCategory.trim(),
    propertyDetails: {
      listingKind: isClassifiedMode ? "Classified" : getListingKind(form.categoryName, form.subCategory, form.detailCategory),
      propertyType: isClassifiedMode ? form.categoryName.trim() : form.propertyType.trim() || getAttributeValue(categoryAttributes, "property_type", "propertyType", "commercial_property_type", "commercialPropertyType").trim() || form.detailCategory.trim(),
      bhk: form.bhk.trim() || getAttributeValue(categoryAttributes, "bhk", "bedrooms", "number_of_bedrooms").trim(),
      bathrooms: numberOrNull(form.bathrooms) ?? numberAttribute(categoryAttributes, "bathrooms"),
      balconies: numberOrNull(form.balconies) ?? numberAttribute(categoryAttributes, "balconies"),
      furnishingType: form.furnishingType.trim() || getAttributeValue(categoryAttributes, "furnishing_type", "furnishingType", "commercial_furnishing").trim(),
      superBuiltUpArea: numberOrNull(form.superBuiltUpArea) ?? (getAttributeValue(categoryAttributes, "area_unit") === "Acres" ? numberOrNull(form.plotArea) : null) ?? numberAttribute(categoryAttributes, "super_built_up_area", "superBuiltUpArea"),
      carpetArea: numberOrNull(form.carpetArea) ?? numberAttribute(categoryAttributes, "carpet_area", "carpetArea"),
      floorNumber: numberOrNull(form.floorNumber) ?? numberAttribute(categoryAttributes, "floor_number", "floorNumber"),
      totalFloors: numberOrNull(form.totalFloors) ?? numberAttribute(categoryAttributes, "total_floors", "totalFloors"),
      propertyAge: form.propertyAge.trim() || getAttributeValue(categoryAttributes, "property_age", "propertyAge").trim(),
      facing: form.facing.trim() || getAttributeValue(categoryAttributes, "facing", "facing_detail").trim(),
      availability: form.availabilityType.trim() || getAttributeValue(categoryAttributes, "availability", "availability_type").trim(),
      availabilityDate: form.availabilityDate.trim() || getAttributeValue(categoryAttributes, "availability_date", "availabilityDate", "available_from", "availableFrom").trim() || null,
      plotArea: numberOrNull(form.plotArea) ?? numberAttribute(categoryAttributes, "plot_area", "plot_area_detail", "plotArea"),
      length: numberOrNull(form.length) ?? numberAttribute(categoryAttributes, "length", "length_detail"),
      breadth: numberOrNull(form.breadth) ?? numberAttribute(categoryAttributes, "breadth", "breadth_detail"),
      boundaryWall: boolOrNull(form.boundaryWall) ?? boolAttribute(categoryAttributes, "boundary_wall", "boundary_wall_detail", "boundaryWall"),
      approvalType: form.approvalType.trim() || getAttributeValue(categoryAttributes, "approval_type", "approval_type_detail", "approvalType").trim(),
      roadWidth: numberOrNull(form.roadWidth) ?? numberAttribute(categoryAttributes, "road_width", "road_width_detail", "roadWidth"),
      area: numberOrNull(form.area) ?? numberAttribute(categoryAttributes, "area", "commercial_area", "room_size_sqft", "roomSizeSqft", "room_size"),
      washrooms: numberOrNull(form.washrooms) ?? numberAttribute(categoryAttributes, "washrooms"),
      parking: boolOrNull(form.parking) ?? boolAttribute(categoryAttributes, "parking", "parking_available"),
      suitableFor: form.suitableFor.trim() || getAttributeValue(categoryAttributes, "suitable_for", "suitableFor", "preferred_occupation", "preferredOccupation").trim(),
      roomType: form.roomType.trim() || getAttributeValue(categoryAttributes, "room_type", "room_type_detail", "roomType").trim(),
      genderPreference: form.genderPreference.trim() || getAttributeValue(categoryAttributes, "gender_preference", "gender_preference_detail", "genderPreference", "preferred_gender", "preferredGender").trim(),
      foodIncluded: form.foodIncluded ? form.foodIncluded === "Yes" : boolAttribute(categoryAttributes, "food_included", "food_included_detail", "foodIncluded"),
      pgAmenities: form.pgAmenities.trim() || getAttributeValue(categoryAttributes, "pg_amenities", "pg_amenities_detail", "pgAmenities").trim(),
      services: JSON.stringify(services.filter((item) => item.name.trim())),
      offers: JSON.stringify(offers.filter((item) => item.name.trim() || item.price.trim() || item.detail.trim())),
      otherInformation: JSON.stringify({
        items: infoItems.filter((item) => item.question.trim() || item.answer.trim()),
        classifiedCategory: isClassifiedMode ? form.categoryName.trim() : undefined,
        classifiedSubCategory: isClassifiedMode ? form.subCategory.trim() : undefined,
        classifiedDetailCategory: isClassifiedMode ? form.detailCategory.trim() : undefined,
        categoryAttributes: trimCategoryAttributes(categoryAttributes),
        customFields: isClassifiedMode ? trimCategoryAttributes(categoryAttributes) : undefined,
      }),
      businessDescription,
      businessHours: !isClassifiedMode && isRealEstateCategory(form.categoryName)
        ? ""
        : JSON.stringify(businessHours.filter((item) => item.status || item.open || item.close)),
      additionalContactInfo: JSON.stringify(contactInfo),
      webLinks: JSON.stringify(webLinks),
      socialLinks: JSON.stringify(socialLinks),
      products: JSON.stringify(products.map((item) => item.trim()).filter(Boolean)),
      brands: JSON.stringify(brands.map((item) => item.trim()).filter(Boolean)),
      paymentMethods: JSON.stringify(paymentMethods),
      restaurantInfo: JSON.stringify(restaurantInfo),
    },
    priceDetails: {
      price: listingPrice,
      priceNegotiable: parsePriceNegotiable(priceNegotiableValue, form.priceNegotiable !== "Fixed"),
      maintenanceCharges: numberOrNull(form.maintenanceCharges) ?? numberAttribute(categoryAttributes, "maintenance_charges", "maintenanceCharges"),
      securityDeposit: numberOrNull(form.securityDeposit) ?? numberAttribute(categoryAttributes, "security_deposit", "security_deposit_detail", "security_deposit_vehicle", "securityDeposit"),
      loanEligible: form.loanEligible || boolAttribute(categoryAttributes, "loan_eligible", "loan_eligible_detail", "loanEligible") === true,
      pricePerSqFt: numberOrNull(form.pricePerSqFt) ?? numberAttribute(categoryAttributes, "price_per_sq_ft", "pricePerSqFt"),
    },
    locationDetails: {
      countryId: form.countryId,
      stateId: form.stateId,
      cityId: form.cityId,
      country: (form.categoryName === "Restaurants & Food" ? form.country || "USA" : form.country).trim(),
      state: (form.categoryName === "Restaurants & Food" ? contactInfo.state || form.state : form.state).trim(),
      city: (form.categoryName === "Restaurants & Food" ? contactInfo.city || form.city : form.city).trim(),
      locality: form.categoryName === "Restaurants & Food" ? (contactInfo.streetAddress || form.address).trim() : vehicleAreaLocality || form.address.trim(),
      landmark: form.serviceLocations.trim(),
      pincode: (form.categoryName === "Restaurants & Food" ? contactInfo.zipcode || form.pincode : form.pincode).trim(),
      latitude: numberOrNull(form.latitude) ?? vehicleMapLocation?.latitude ?? null,
      longitude: numberOrNull(form.longitude) ?? vehicleMapLocation?.longitude ?? null,
    },
    amenities: {
      parking: form.amenityParking,
      lift: form.amenityLift,
      powerBackup: form.amenityPowerBackup,
      security: form.amenitySecurity,
      gym: form.amenityGym,
      cctv: form.amenityCctv,
      swimmingPool: form.amenitySwimmingPool,
      garden: form.amenityGarden,
      childrensPlayArea: form.amenityChildrensPlayArea,
    },
      media: {
      imageUrls: [
        form.profileImageName,
        form.coverImageName,
        ...form.galleryMedia,
      ].map((value) => value.trim()).filter((value) => value && !isVideoValue(value)),
      videoUrl: electronicsVideoUrl || petVideoUrl || form.listingVideo.trim() || form.galleryMedia.find(isVideoValue) || "",
      logoUrl: form.profileImageName.trim(),
      coverBannerUrl: form.coverImageName.trim(),
    },
    sellerInformation: {
      name: (isCareServicesPayload ? careContactName || sellerName : isRoommatesRentalsPayload ? roommatesContactName || sellerName : isJobsPayload ? jobContactName || sellerName : isElectronicsPayload ? electronicsSellerName || sellerName : isPetsPayload ? petContactName || sellerName : sellerName).trim() || form.title.trim(),
      mobileNumber: (form.categoryName === "Restaurants & Food" ? contactInfo.mainPhone || form.mobileNumber : isCareServicesPayload ? careContactPhone || form.mobileNumber : isRoommatesRentalsPayload ? roommatesContactPhone || form.mobileNumber : isJobsPayload ? jobContactPhone || form.mobileNumber : isElectronicsPayload ? electronicsSellerPhone || form.mobileNumber : isPetsPayload ? petContactPhone || form.mobileNumber : form.mobileNumber).trim(),
      email: (form.categoryName === "Restaurants & Food" ? contactInfo.email || form.email : isCareServicesPayload ? careContactEmail || form.email : isRoommatesRentalsPayload ? roommatesContactEmail || form.email : isJobsPayload ? jobContactEmail || form.email : isElectronicsPayload ? electronicsSellerEmail || form.email : isPetsPayload ? petContactEmail || form.email : form.email).trim(),
      whatsAppNumber: form.whatsapp.trim(),
      websiteUrl: (form.categoryName === "Restaurants & Food" ? webLinks.mainWebsite || form.website : isCareServicesPayload ? careContactWebsite || form.website : isElectronicsPayload ? electronicsSellerWebsite || form.website : isPetsPayload ? petWebsite || form.website : form.website).trim(),
      sellerType,
      isMobileOtpVerified: false,
      reraNumber: form.reraNumber.trim() || getAttributeValue(categoryAttributes, "rera_number", "reraNumber").trim(),
      ownershipType: form.ownershipType.trim() || getAttributeValue(categoryAttributes, "ownership_type", "ownershipType").trim(),
    },
    settings: {
      adType: getAttributeValue(categoryAttributes, "ad_type", "listing_type", "adType").trim() || form.adType.trim() || "Free",
      adDurationDays,
      autoRenew: form.autoRenew,
      metaTitle: form.metaTitle.trim(),
      metaDescription: form.metaDescription.trim(),
      verifiedByAdmin: false,
      careBusinessCaregiverName: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "businessCaregiverName", "business_caregiver_name").trim() : "",
      careTagline: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "tagline").trim() : "",
      careMinimumHoursRequired: form.categoryName === "Care Services" ? numberAttribute(categoryAttributes, "minimumHoursRequired", "minimum_hours_required") : null,
      carePriceNegotiable: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "price_negotiable", "priceNegotiable", "negotiable").trim() : "",
      careSmokingAllowed: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "smokingAllowed", "smoking_allowed").trim() : "",
      carePetFriendly: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "petFriendly", "pet_friendly").trim() : "",
      careBusinessLogo: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "businessLogo", "business_logo").trim() : "",
      careHipaaCompliance: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "hipaaCompliance", "hipaa_compliance").trim() : "",
      careOnlineConsultation: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "onlineConsultation", "online_consultation").trim() : "",
      careEmergencyAvailability: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "emergencyAvailability", "emergency_availability").trim() : "",
      careChildAgeGroup: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "childAgeGroup", "child_age_group").trim() : "",
      careSchoolPickupOption: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "schoolPickupOption", "school_pickup_option").trim() : "",
      careMobilityAssistance: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "mobilityAssistance", "mobility_assistance").trim() : "",
      careDementiaCareExperience: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "dementiaCareExperience", "dementia_care_experience").trim() : "",
      carePetTypeExperience: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "petTypeExperience", "pet_type_experience").trim() : "",
      careStaffCount: form.categoryName === "Care Services" ? numberAttribute(categoryAttributes, "staffCount", "staff_count") : null,
      careSponsoredListing: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "sponsoredListing", "sponsored_listing").trim() : "",
      careBoostListing: form.categoryName === "Care Services" ? getAttributeValue(categoryAttributes, "boostListing", "boost_listing").trim() : "",
    },
    restaurantFoodDetails: {
      restaurantName: restaurantTitle,
      businessName: restaurantInfo.businessName.trim() || restaurantTitle,
      tagline: restaurantInfo.tagline.trim(),
      description: restaurantDescription,
      cuisineType: restaurantInfo.cuisine.trim() || getAttributeValue(categoryAttributes, "cuisine_type", "cuisine").trim(),
      businessType: restaurantInfo.businessType.trim() || getAttributeValue(categoryAttributes, "business_type", "businessType").trim(),
      yearEstablished: numberOrNull(restaurantInfo.yearEstablished) ?? numberAttribute(categoryAttributes, "year_established", "yearEstablished"),
      numberOfStaff: numberOrNull(restaurantInfo.staffCount) ?? numberAttribute(categoryAttributes, "number_of_staff", "staff_count", "staffCount"),
      serviceTypes: restaurantServiceTypes,
      serviceRadiusMiles: numberOrNull(restaurantInfo.serviceRadiusMiles) ?? numberAttribute(categoryAttributes, "delivery_radius", "service_radius", "service_radius_miles", "serviceRadiusMiles"),
      instagramUrl: socialLinks.instagram.trim() || getAttributeValue(categoryAttributes, "instagram_url", "instagram").trim(),
      facebookUrl: socialLinks.facebook.trim() || getAttributeValue(categoryAttributes, "facebook_url", "facebook").trim(),
      tikTokUrl: getAttributeValue(categoryAttributes, "tiktok_url", "tikTokUrl", "tiktok").trim(),
      twitterUrl: socialLinks.twitter.trim(),
      youTubeUrl: socialLinks.youtube.trim(),
      averageCostForTwo: numberOrNull(restaurantInfo.averageCostForTwo) ?? numberAttribute(categoryAttributes, "average_cost_for_two", "averageCostForTwo"),
      discountsOffers: restaurantInfo.discountsOffers.trim() || getAttributeValue(categoryAttributes, "discounts_offers", "discountsOffers").trim(),
      couponCodes: restaurantInfo.couponCodes.trim() || getAttributeValue(categoryAttributes, "coupon_codes", "couponCodes").trim(),
      happyHours: restaurantInfo.happyHours.trim() || getAttributeValue(categoryAttributes, "happy_hours", "happyHours").trim(),
      deliveryAvailable: restaurantInfo.deliveryAvailable || isRestaurantCloudKitchen || boolAttribute(categoryAttributes, "delivery_available", "deliveryAvailable") === true,
      deliveryFee: numberOrNull(restaurantInfo.deliveryFee) ?? numberAttribute(categoryAttributes, "delivery_fee", "deliveryFee"),
      minimumOrderValue: numberOrNull(restaurantInfo.minimumOrderValue) ?? numberAttribute(categoryAttributes, "minimum_order_value", "minimumOrderValue"),
      onlineOrderingAvailable: restaurantInfo.onlineOrdering || boolAttribute(categoryAttributes, "online_ordering", "onlineOrdering") === true,
      thirdPartyIntegrations: restaurantInfo.thirdPartyIntegrations.length ? restaurantInfo.thirdPartyIntegrations : splitAttributeList(categoryAttributes, "third_party_integration", "third_party_integrations"),
      amenities: restaurantInfo.amenities.length ? restaurantInfo.amenities : restaurantAmenities,
      foodLicenseNumber: restaurantInfo.foodLicenseNumber.trim() || getAttributeValue(categoryAttributes, "food_license_number", "foodLicenseNumber").trim(),
      healthInspectionRating: restaurantInfo.healthInspectionRating.trim() || getAttributeValue(categoryAttributes, "health_inspection_rating", "healthInspectionRating").trim(),
      alcoholLicenseNumber: restaurantInfo.alcoholLicenseNumber.trim() || getAttributeValue(categoryAttributes, "alcohol_license_number", "alcohol_license", "alcoholLicenseNumber").trim(),
      taxIdInternal: restaurantInfo.businessRegistrationNumber.trim() || getAttributeValue(categoryAttributes, "business_registration_number", "tax_id", "taxId").trim(),
      tableBookingEnabled: restaurantInfo.tableBooking || boolAttribute(categoryAttributes, "table_booking", "tableBooking", "reservations_accepted") === true,
      orderNowEnabled: restaurantInfo.orderNow || boolAttribute(categoryAttributes, "order_now_button", "orderNow") === true,
      enableChat: restaurantInfo.enableChat && boolAttribute(categoryAttributes, "enable_chat", "enableChat") !== false,
      enableCall: restaurantInfo.enableCall && boolAttribute(categoryAttributes, "enable_call", "enableCall") !== false,
      bulkOrderNotes: restaurantInfo.bulkOrderNotes.trim() || getAttributeValue(categoryAttributes, "bulk_order_notes", "bulkOrderNotes").trim(),
      customOrderOptions: restaurantInfo.customOrderOptions.trim() || getAttributeValue(categoryAttributes, "custom_order_options", "customOrderOptions").trim(),
      eventLocationNotes: restaurantInfo.eventLocationNotes.trim() || getAttributeValue(categoryAttributes, "event_location_notes", "eventLocationNotes").trim(),
      ageRestrictedNotice: restaurantInfo.ageRestrictedNotice.trim() || getAttributeValue(categoryAttributes, "age_restricted_notice", "age_restriction", "ageRestrictedNotice").trim(),
    },
    vehicleDetails: {
      brand: getAttributeValue(categoryAttributes, "brand").trim() || (isChargingStationPayload ? "Charging Station" : ""),
      model: getAttributeValue(categoryAttributes, "model").trim() || getAttributeValue(categoryAttributes, "chargingStationType", "charging_station_type").trim(),
      variant: getAttributeValue(categoryAttributes, "variant").trim(),
      yearOfManufacture: numberAttribute(categoryAttributes, "yearOfManufacture", "year_of_manufacture") ?? (isChargingStationPayload ? new Date().getFullYear() : null),
      registrationYear: numberAttribute(categoryAttributes, "registrationYear", "registration_year"),
      vehicleCondition: getAttributeValue(categoryAttributes, "vehicleCondition", "vehicle_condition", "condition").trim() || (isChargingStationPayload ? "New" : ""),
      fuelType: getAttributeValue(categoryAttributes, "fuelType", "fuel_type").trim() || (isEvVehiclePayload ? "Electric" : ""),
      transmission: getAttributeValue(categoryAttributes, "transmission").trim(),
      kmDriven: numberAttribute(categoryAttributes, "kilometersDriven", "kilometers_driven", "kmDriven", "km_driven"),
      numberOfOwners: numberAttribute(categoryAttributes, "ownerCount", "owner_count", "numberOfOwners", "number_of_owners"),
      insuranceStatus: getAttributeValue(categoryAttributes, "insurance", "insuranceStatus", "insurance_status").trim(),
      insuranceValidTill: getAttributeValue(categoryAttributes, "insuranceValidTill", "insurance_valid_till").trim() || null,
      registrationState: getAttributeValue(categoryAttributes, "registrationState", "registration_state").trim(),
      rto: getAttributeValue(categoryAttributes, "rto").trim(),
      color: getAttributeValue(categoryAttributes, "color").trim() || (isChargingStationPayload ? "N/A" : ""),
      bodyType: getAttributeValue(categoryAttributes, "bodyType", "body_type").trim() || (isCarsVehiclePayload ? "Car" : ""),
      seatingCapacity: numberAttribute(categoryAttributes, "seatingCapacity", "seating_capacity") ?? (isCarsVehiclePayload ? 5 : null),
      bootSpace: getAttributeValue(categoryAttributes, "bootSpace", "boot_space").trim(),
      mileage: numberAttribute(categoryAttributes, "mileage"),
      engineCapacityCc: numberAttribute(categoryAttributes, "engineCapacity", "engine_capacity", "engineCapacityCc", "engine_capacity_cc"),
      bikeType: getAttributeValue(categoryAttributes, "bikeType", "bike_type").trim(),
      commercialVehicleType: getAttributeValue(categoryAttributes, "vehicleType", "vehicle_type", "commercialVehicleType", "commercial_vehicle_type").trim(),
      loadCapacity: numberAttribute(categoryAttributes, "loadCapacity", "load_capacity"),
      numberOfWheels: numberAttribute(categoryAttributes, "numberOfWheels", "number_of_wheels"),
      permitType: getAttributeValue(categoryAttributes, "permitType", "permit_type").trim(),
      rentalType: getAttributeValue(categoryAttributes, "rentalType", "rental_type").trim(),
      pricePerHour: numberAttribute(categoryAttributes, "pricePerHour", "price_per_hour"),
      pricePerDay: numberAttribute(categoryAttributes, "pricePerDay", "price_per_day", "daily_price"),
      securityDeposit: numberAttribute(categoryAttributes, "securityDepositVehicle", "security_deposit_vehicle"),
      partType: getAttributeValue(categoryAttributes, "partType", "part_type", "itemType", "item_type").trim(),
      compatibleModels: getAttributeValue(categoryAttributes, "compatibleModels", "compatible_models", "compatible_brands_models").trim(),
      partCondition: getAttributeValue(categoryAttributes, "partCondition", "part_condition", "condition").trim(),
      rcAvailable: boolAttribute(categoryAttributes, "rcAvailable", "rc_available"),
      pucAvailable: boolAttribute(categoryAttributes, "pucAvailable", "puc_available"),
      serviceHistoryStatus: getAttributeValue(categoryAttributes, "serviceHistory", "service_history", "serviceHistoryStatus", "service_history_status").trim(),
      loanStatus: getAttributeValue(categoryAttributes, "loanStatus", "loan_status").trim(),
      features: vehicleFeatureValues(categoryAttributes),
    },
    electronicsDetails: {
      listingTitle: electronicsTitle,
      productName: getAttributeValue(categoryAttributes, "product_name", "productName").trim(),
      description: electronicsDescription,
      brand: getAttributeValue(categoryAttributes, "brand").trim(),
      modelNameNumber: getAttributeValue(categoryAttributes, "modelNameNumber", "model_name_number", "model").trim(),
      condition: getAttributeValue(categoryAttributes, "condition").trim(),
      purchaseYear: numberAttribute(categoryAttributes, "purchaseYear", "purchase_year"),
      billAvailable: boolAttribute(categoryAttributes, "billAvailable", "bill_available"),
      warranty: boolAttribute(categoryAttributes, "warranty"),
      warrantyRemainingMonths: numberAttribute(categoryAttributes, "warrantyRemainingMonths", "warranty_remaining_months"),
      color: getAttributeValue(categoryAttributes, "color").trim(),
      usageDuration: getAttributeValue(categoryAttributes, "usageDuration", "usage_duration").trim(),
      ram: getAttributeValue(categoryAttributes, "ram").trim(),
      storage: getAttributeValue(categoryAttributes, "storage", "storage_type", "storageType").trim(),
      processor: getAttributeValue(categoryAttributes, "processor").trim(),
      screenSize: getAttributeValue(categoryAttributes, "screenSize", "screen_size").trim(),
      batteryHealth: getAttributeValue(categoryAttributes, "batteryHealth", "battery_health").trim(),
      network: getAttributeValue(categoryAttributes, "network", "carrierStatus", "carrier_status").trim(),
      graphicsCard: getAttributeValue(categoryAttributes, "graphicsCard", "graphics_card").trim(),
      operatingSystem: getAttributeValue(categoryAttributes, "operatingSystem", "operating_system").trim(),
      displayType: getAttributeValue(categoryAttributes, "displayType", "display_type").trim(),
      resolution: getAttributeValue(categoryAttributes, "resolution").trim(),
      smartTv: boolAttribute(categoryAttributes, "smartTv", "smart_tv"),
      applianceType: getAttributeValue(categoryAttributes, "applianceType", "appliance_type").trim(),
      capacity: getAttributeValue(categoryAttributes, "capacity").trim(),
      energyRating: getAttributeValue(categoryAttributes, "energyRating", "energy_rating").trim(),
      inverterTechnology: boolAttribute(categoryAttributes, "inverterTechnology", "inverter_technology"),
      powerConsumption: getAttributeValue(categoryAttributes, "powerConsumption", "power_consumption").trim(),
      accessoryType: getAttributeValue(categoryAttributes, "accessoryType", "accessory_type").trim(),
      compatibility: getAttributeValue(categoryAttributes, "compatibility", "compatibleWith", "compatible_with").trim(),
      connectivity: getAttributeValue(categoryAttributes, "connectivity").trim(),
      features: electronicsFeatureValues(categoryAttributes),
    },
    careServiceDetails: {
      providerType: getAttributeValue(categoryAttributes, "providerType", "provider_type").trim(),
      experienceYears: numberAttribute(categoryAttributes, "experienceYears", "experience_years"),
      languagesSpoken: splitAttributeList(categoryAttributes, "languagesSpoken", "languages_spoken"),
      servicesOffered: careServiceValues(categoryAttributes),
      availabilityType: getAttributeValue(categoryAttributes, "availabilityType", "availability_type").trim(),
      availableDays: splitAttributeList(categoryAttributes, "availableDays", "available_days"),
      availableTimeSlots: getAttributeValue(categoryAttributes, "availableTimeSlots", "available_time_slots").trim(),
      startDate: getAttributeValue(categoryAttributes, "startDate", "start_date").trim() || null,
      rateType: getAttributeValue(categoryAttributes, "rateType", "rate_type").trim(),
      willingToTravel: boolAttribute(categoryAttributes, "willingToTravel", "willing_to_travel"),
      serviceRadiusMiles: numberAttribute(categoryAttributes, "serviceRadiusMiles", "service_radius_miles"),
      cprCertified: boolAttribute(categoryAttributes, "cprCertified", "cpr_certified"),
      firstAidCertified: boolAttribute(categoryAttributes, "firstAidCertified", "first_aid_certified"),
      cnaCertified: boolAttribute(categoryAttributes, "cnaCertified", "cna_certified"),
      rnLpn: boolAttribute(categoryAttributes, "rnLpn", "rn_lpn"),
      licenseNumber: getAttributeValue(categoryAttributes, "licenseNumber", "license_number").trim(),
      backgroundCheck: boolAttribute(categoryAttributes, "backgroundCheck", "background_check"),
      referencesAvailable: null,
      specialSkills: getAttributeValue(categoryAttributes, "specialSkills", "special_skills").trim(),
      previousEmployer: getAttributeValue(categoryAttributes, "previousEmployer", "previous_employer").trim(),
      education: getAttributeValue(categoryAttributes, "education").trim(),
      ageGroups: splitAttributeList(categoryAttributes, "ageGroups", "age_groups"),
      genderPreference: getAttributeValue(categoryAttributes, "genderPreference", "gender_preference").trim(),
      specialNeedsExperience: boolAttribute(categoryAttributes, "specialNeedsExperience", "special_needs_experience"),
      certificationDocuments: splitAttributeList(categoryAttributes, "certificationDocuments", "certification_documents"),
      videoIntroductionUrl: getAttributeValue(categoryAttributes, "videoIntroductionUrl", "video_introduction_url").trim(),
      chatEnabled: boolAttribute(categoryAttributes, "chatEnabled", "chat_enabled") !== false,
      callEnabled: boolAttribute(categoryAttributes, "callEnabled", "call_enabled") !== false,
      scheduleInterview: boolAttribute(categoryAttributes, "scheduleInterview", "schedule_interview") === true,
      identityVerification: boolAttribute(categoryAttributes, "identityVerification", "identity_verification") === true,
      backgroundVerification: boolAttribute(categoryAttributes, "backgroundVerification", "background_verification") === true,
      serviceDisclaimer: getAttributeValue(categoryAttributes, "serviceDisclaimer", "service_disclaimer").trim(),
      insurance: getAttributeValue(categoryAttributes, "insurance").trim(),
    },
    restaurantMenuItems: restaurantMenuItems
      .filter((item) => item.itemName.trim() || item.menuCategory.trim() || item.price.trim())
      .map((item, index) => ({
        itemName: item.itemName.trim(),
        menuCategory: item.menuCategory.trim(),
        description: item.description.trim(),
        price: numberOrNull(item.price) ?? 0,
        foodType: item.foodType.trim(),
        spiceLevel: item.spiceLevel.trim(),
        calories: numberOrNull(item.calories),
        imageUrl: item.imageUrl.trim(),
        displayOrder: numberOrNull(item.displayOrder) ?? index + 1,
        isAvailable: item.isAvailable,
      })),
    restaurantOperatingHours: businessHours.map((hour) => ({
      dayOfWeek: hour.day,
      isOpen: hour.status !== "Closed",
      openTime: hour.open ? `${hour.open}:00` : null,
      closeTime: hour.close ? `${hour.close}:00` : null,
      is24Hours: hour.is24Hours,
      specialHoursNote: hour.specialHoursNote || null,
    })),
  };
}

function mapListingToForm(listing: ListingSummary, currentForm: FormState, isDuplicate: boolean, mode: ListingFormMode = "listing"): FormState {
  const propertyDetails = listing.propertyDetails || {};
  const priceDetails = listing.priceDetails || {};
  const locationDetails = listing.locationDetails || {};
  const amenities = listing.amenities || {};
  const sellerInformation = listing.sellerInformation || {};
  const settings = listing.settings || {};
  const imageUrls = listing.imageUrls || [];
  const profileImageName = stringValue(listing.logoUrl) || imageUrls[0] || "";
  const coverImageName = stringValue(listing.coverBannerUrl) || imageUrls.find((url) => url !== profileImageName) || "";
  const galleryMedia = imageUrls.filter((url) => url && url !== profileImageName && url !== coverImageName);
  const otherInformation = parseJsonObject<Record<string, unknown>>(propertyDetails.otherInformation, {});
  const isClassifiedMode = mode === "classified";
  const classifiedCategory = stringValue(otherInformation.classifiedCategory) || listing.subCategory || stringValue(propertyDetails.propertyType);
  const classifiedSubCategory = stringValue(otherInformation.classifiedSubCategory) || listing.detailCategory || "";
  const classifiedDetailCategory = stringValue(otherInformation.classifiedDetailCategory) || listing.detailCategory || "";

  return {
    ...currentForm,
    title: isDuplicate ? "" : listing.title || "",
    mobileNumber: stringValue(sellerInformation.mobileNumber) || currentForm.mobileNumber,
    email: stringValue(sellerInformation.email) || currentForm.email,
    whatsapp: stringValue(sellerInformation.whatsAppNumber),
    website: stringValue(sellerInformation.websiteUrl),
    address: stringValue(locationDetails.locality),
    countryId: numberOrNull(stringValue(locationDetails.countryId)),
    stateId: numberOrNull(stringValue(locationDetails.stateId)),
    cityId: numberOrNull(stringValue(locationDetails.cityId)),
    country: stringValue(locationDetails.country),
    state: stringValue(locationDetails.state),
    city: stringValue(locationDetails.city || listing.city),
    pincode: stringValue(locationDetails.pincode),
    categoryName: isClassifiedMode ? classifiedCategory : listing.categoryName || "",
    subCategory: isClassifiedMode ? classifiedSubCategory : listing.subCategory || "",
    detailCategory: isClassifiedMode ? classifiedDetailCategory : listing.detailCategory || "",
    description: listing.description || "",
    businessDescription: stringValue(propertyDetails.businessDescription) || listing.description || "",
    profileImageName,
    coverImageName,
    serviceLocations: isDuplicate ? "" : stringValue(locationDetails.landmark),
    listingVideo: listing.videoUrl || "",
    galleryMedia,
    propertyType: stringValue(propertyDetails.propertyType) || listing.detailCategory || "",
    bhk: stringValue(propertyDetails.bhk),
    bathrooms: stringValue(propertyDetails.bathrooms),
    balconies: stringValue(propertyDetails.balconies),
    furnishingType: stringValue(propertyDetails.furnishingType),
    superBuiltUpArea: stringValue(propertyDetails.superBuiltUpArea),
    carpetArea: stringValue(propertyDetails.carpetArea),
    floorNumber: stringValue(propertyDetails.floorNumber),
    totalFloors: stringValue(propertyDetails.totalFloors),
    propertyAge: stringValue(propertyDetails.propertyAge),
    availabilityType: stringValue(propertyDetails.availability),
    availabilityDate: stringValue(propertyDetails.availabilityDate).slice(0, 10),
    plotArea: stringValue(propertyDetails.plotArea),
    length: stringValue(propertyDetails.length),
    breadth: stringValue(propertyDetails.breadth),
    boundaryWall: booleanSelectValue(propertyDetails.boundaryWall),
    facing: stringValue(propertyDetails.facing),
    approvalType: stringValue(propertyDetails.approvalType),
    roadWidth: stringValue(propertyDetails.roadWidth),
    area: stringValue(propertyDetails.area),
    washrooms: stringValue(propertyDetails.washrooms),
    parking: booleanSelectValue(propertyDetails.parking),
    suitableFor: stringValue(propertyDetails.suitableFor),
    roomType: stringValue(propertyDetails.roomType),
    genderPreference: stringValue(propertyDetails.genderPreference),
    foodIncluded: propertyDetails.foodIncluded === true ? "Yes" : propertyDetails.foodIncluded === false ? "No" : "",
    pgAmenities: stringValue(propertyDetails.pgAmenities),
    price: stringValue(priceDetails.price || listing.price),
    priceNegotiable: priceDetails.priceNegotiable === false ? "Fixed" : "Negotiable",
    maintenanceCharges: stringValue(priceDetails.maintenanceCharges),
    securityDeposit: stringValue(priceDetails.securityDeposit),
    pricePerSqFt: stringValue(priceDetails.pricePerSqFt),
    loanEligible: priceDetails.loanEligible === true,
    sellerType: stringValue(sellerInformation.sellerType) || (isRealEstateCategory(listing.categoryName || "") ? "" : "Owner"),
    reraNumber: stringValue(sellerInformation.reraNumber),
    ownershipType: stringValue(sellerInformation.ownershipType),
    latitude: stringValue(locationDetails.latitude),
    longitude: stringValue(locationDetails.longitude),
    adType: stringValue(settings.adType) || "Free",
    adDurationDays: stringValue(settings.adDurationDays) || "30",
    autoRenew: settings.autoRenew === true,
    metaTitle: stringValue(settings.metaTitle),
    metaDescription: stringValue(settings.metaDescription),
    amenityParking: amenities.parking === true,
    amenityLift: amenities.lift === true,
    amenityPowerBackup: amenities.powerBackup === true,
    amenitySecurity: amenities.security === true,
    amenityGym: amenities.gym === true,
    amenityCctv: amenities.cctv === true,
    amenitySwimmingPool: amenities.swimmingPool === true,
    amenityGarden: amenities.garden === true,
    amenityChildrensPlayArea: amenities.childrensPlayArea === true,
  };
}

function mapRestaurantInfoFromListing(listing: ListingSummary, propertyDetails: Record<string, unknown>): RestaurantInfo {
  const restaurantDetails = listing.restaurantFoodDetails || {};
  const legacyInfo = parseJsonObject<RestaurantInfo>(propertyDetails.restaurantInfo, initialRestaurantInfo);

  return {
    ...legacyInfo,
    restaurantName: stringValue(restaurantDetails.restaurantName) || stringValue(restaurantDetails.businessName) || legacyInfo.restaurantName,
    businessName: stringValue(restaurantDetails.businessName) || legacyInfo.businessName || "",
    tagline: stringValue(restaurantDetails.tagline) || legacyInfo.tagline,
    description: stringValue(restaurantDetails.description) || legacyInfo.description || "",
    cuisine: stringValue(restaurantDetails.cuisineType) || legacyInfo.cuisine,
    foodTypes: Array.isArray(legacyInfo.foodTypes) ? legacyInfo.foodTypes.map(String) : [],
    foodType: legacyInfo.foodType || "",
    businessType: stringValue(restaurantDetails.businessType),
    yearEstablished: stringValue(restaurantDetails.yearEstablished),
    staffCount: stringValue(restaurantDetails.numberOfStaff),
    serviceTypes: Array.isArray(restaurantDetails.serviceTypes) ? restaurantDetails.serviceTypes.map(String) : [],
    serviceRadiusMiles: stringValue(restaurantDetails.serviceRadiusMiles),
    averageCostForTwo: stringValue(restaurantDetails.averageCostForTwo),
    discountsOffers: stringValue(restaurantDetails.discountsOffers),
    couponCodes: stringValue(restaurantDetails.couponCodes),
    happyHours: stringValue(restaurantDetails.happyHours),
    priceRange: legacyInfo.priceRange || "",
    deliveryAvailable: restaurantDetails.deliveryAvailable === true,
    deliveryFee: stringValue(restaurantDetails.deliveryFee),
    minimumOrderValue: stringValue(restaurantDetails.minimumOrderValue),
    estimatedDeliveryTime: legacyInfo.estimatedDeliveryTime || "",
    onlineOrdering: restaurantDetails.onlineOrderingAvailable === true,
    thirdPartyIntegrations: Array.isArray(restaurantDetails.thirdPartyIntegrations) ? restaurantDetails.thirdPartyIntegrations.map(String) : [],
    amenities: Array.isArray(restaurantDetails.amenities) ? restaurantDetails.amenities.map(String) : [],
    foodLicenseNumber: stringValue(restaurantDetails.foodLicenseNumber),
    healthInspectionRating: stringValue(restaurantDetails.healthInspectionRating),
    alcoholLicenseNumber: stringValue(restaurantDetails.alcoholLicenseNumber),
    businessRegistrationNumber: legacyInfo.businessRegistrationNumber || "",
    tableBooking: restaurantDetails.tableBookingEnabled === true,
    reservationCapacity: legacyInfo.reservationCapacity || "",
    onlineBookingUrl: legacyInfo.onlineBookingUrl || "",
    orderNow: restaurantDetails.orderNowEnabled === true,
    enableChat: restaurantDetails.enableChat !== false,
    enableCall: restaurantDetails.enableCall !== false,
    cateringType: legacyInfo.cateringType || "",
    minimumGuests: legacyInfo.minimumGuests || "",
    maximumGuests: legacyInfo.maximumGuests || "",
    perPlatePricing: legacyInfo.perPlatePricing || "",
    eventTypes: Array.isArray(legacyInfo.eventTypes) ? legacyInfo.eventTypes.map(String) : [],
    mobileLocations: legacyInfo.mobileLocations || "",
    operatingZones: legacyInfo.operatingZones || "",
    bulkOrderNotes: stringValue(restaurantDetails.bulkOrderNotes),
    customOrderOptions: stringValue(restaurantDetails.customOrderOptions),
    eventLocationNotes: stringValue(restaurantDetails.eventLocationNotes),
    ageRestrictedNotice: stringValue(restaurantDetails.ageRestrictedNotice),
  };
}

function mapPropertyAttributesFromListing(listing: ListingSummary): CategoryAttributes {
  const propertyDetails = listing.propertyDetails || {};
  const priceDetails = listing.priceDetails || {};
  const sellerInformation = listing.sellerInformation || {};
  const settings = listing.settings || {};

  return trimCategoryAttributes({
    property_type: stringValue(propertyDetails.propertyType) || listing.detailCategory || "",
    bhk: stringValue(propertyDetails.bhk),
    bathrooms: stringValue(propertyDetails.bathrooms),
    balconies: stringValue(propertyDetails.balconies),
    furnishing_type: stringValue(propertyDetails.furnishingType),
    super_built_up_area: stringValue(propertyDetails.superBuiltUpArea),
    carpet_area: stringValue(propertyDetails.carpetArea),
    floor_number: stringValue(propertyDetails.floorNumber),
    total_floors: stringValue(propertyDetails.totalFloors),
    property_age: stringValue(propertyDetails.propertyAge),
    facing: stringValue(propertyDetails.facing),
    availability: stringValue(propertyDetails.availability),
    availability_date: stringValue(propertyDetails.availabilityDate).slice(0, 10),
    plot_area: stringValue(propertyDetails.plotArea),
    length: stringValue(propertyDetails.length),
    breadth: stringValue(propertyDetails.breadth),
    boundary_wall: booleanSelectValue(propertyDetails.boundaryWall),
    approval_type: stringValue(propertyDetails.approvalType),
    road_width: stringValue(propertyDetails.roadWidth),
    commercial_area: stringValue(propertyDetails.area),
    washrooms: stringValue(propertyDetails.washrooms),
    parking: booleanSelectValue(propertyDetails.parking),
    suitable_for: stringValue(propertyDetails.suitableFor),
    room_type: stringValue(propertyDetails.roomType),
    gender_preference: stringValue(propertyDetails.genderPreference),
    food_included: booleanSelectValue(propertyDetails.foodIncluded),
    pg_amenities: stringValue(propertyDetails.pgAmenities),
    price: stringValue(priceDetails.price || listing.price),
    price_negotiable: priceDetails.priceNegotiable === false ? "Fixed" : priceDetails.priceNegotiable === true ? "Negotiable" : "",
    maintenance_charges: stringValue(priceDetails.maintenanceCharges),
    security_deposit: stringValue(priceDetails.securityDeposit),
    loan_eligible: booleanSelectValue(priceDetails.loanEligible),
    price_per_sq_ft: stringValue(priceDetails.pricePerSqFt),
    seller_type: stringValue(sellerInformation.sellerType),
    rera_number: stringValue(sellerInformation.reraNumber),
    ownership_type: stringValue(sellerInformation.ownershipType),
    ad_type: stringValue(settings.adType),
    ad_duration_days: stringValue(settings.adDurationDays),
  });
}

function mapRestaurantAttributesFromListing(listing: ListingSummary): CategoryAttributes {
  const details = listing.restaurantFoodDetails || {};
  const amenities = Array.isArray(details.amenities) ? details.amenities.map(String) : [];
  const serviceTypes = Array.isArray(details.serviceTypes) ? details.serviceTypes.map(String) : [];

  return trimCategoryAttributes({
    business_name: stringValue(details.businessName),
    restaurant_name: stringValue(details.restaurantName) || stringValue(details.businessName),
    description: stringValue(details.description),
    cuisine_type: stringValue(details.cuisineType),
    service_type: serviceTypes.join(", "),
    dine_in: booleanSelectValue(serviceTypes.includes("Dine-In")),
    takeaway: booleanSelectValue(serviceTypes.includes("Takeaway")),
    catering_available: booleanSelectValue(serviceTypes.includes("Catering")),
    reservations_accepted: booleanSelectValue(serviceTypes.includes("Reservations Accepted") || details.tableBookingEnabled === true),
    service_radius: stringValue(details.serviceRadiusMiles),
    average_cost_for_two: stringValue(details.averageCostForTwo),
    discounts_offers: stringValue(details.discountsOffers),
    coupon_codes: stringValue(details.couponCodes),
    happy_hours: stringValue(details.happyHours),
    delivery_available: booleanSelectValue(details.deliveryAvailable === true || serviceTypes.includes("Delivery")),
    delivery_fee: stringValue(details.deliveryFee),
    minimum_order_value: stringValue(details.minimumOrderValue),
    online_ordering: booleanSelectValue(details.onlineOrderingAvailable),
    third_party_integration: Array.isArray(details.thirdPartyIntegrations) ? details.thirdPartyIntegrations.map(String).join(", ") : "",
    wifi: booleanSelectValue(amenities.some((item) => item.toLowerCase() === "wifi")),
    parking: booleanSelectValue(amenities.some((item) => item.toLowerCase() === "parking")),
    outdoor_seating: booleanSelectValue(amenities.some((item) => item.toLowerCase() === "outdoor seating")),
    live_music: booleanSelectValue(amenities.some((item) => item.toLowerCase() === "live music")),
    family_friendly: booleanSelectValue(amenities.some((item) => item.toLowerCase() === "family friendly")),
    pet_friendly: booleanSelectValue(amenities.some((item) => item.toLowerCase() === "pet friendly")),
    wheelchair_accessible: booleanSelectValue(amenities.some((item) => item.toLowerCase().includes("wheelchair"))),
    food_license_number: stringValue(details.foodLicenseNumber),
    health_inspection_rating: stringValue(details.healthInspectionRating),
    alcohol_license_number: stringValue(details.alcoholLicenseNumber),
    table_booking: booleanSelectValue(details.tableBookingEnabled),
    order_now_button: booleanSelectValue(details.orderNowEnabled),
    enable_chat: booleanSelectValue(details.enableChat),
    enable_call: booleanSelectValue(details.enableCall),
    bulk_order_notes: stringValue(details.bulkOrderNotes),
    custom_order_options: stringValue(details.customOrderOptions),
    event_location_notes: stringValue(details.eventLocationNotes),
    age_restricted_notice: stringValue(details.ageRestrictedNotice),
  });
}

function mapVehicleAttributesFromListing(listing: ListingSummary): CategoryAttributes {
  const details = listing.vehicleDetails || {};
  const propertyDetails = listing.propertyDetails || {};
  const priceDetails = listing.priceDetails || {};
  const locationDetails = listing.locationDetails || {};
  const settings = listing.settings || {};
  const values: CategoryAttributes = {
    listing_title: stringValue(listing.title),
    listingTitle: stringValue(listing.title),
    description: stringValue(listing.description || propertyDetails.businessDescription),
    brand: stringValue(details.brand),
    model: stringValue(details.model),
    variant: stringValue(details.variant),
    yearOfManufacture: stringValue(details.yearOfManufacture),
    year_of_manufacture: stringValue(details.yearOfManufacture),
    registrationYear: stringValue(details.registrationYear),
    registration_year: stringValue(details.registrationYear),
    vehicleCondition: stringValue(details.vehicleCondition),
    vehicle_condition: stringValue(details.vehicleCondition),
    fuelType: stringValue(details.fuelType),
    fuel_type: stringValue(details.fuelType),
    transmission: stringValue(details.transmission),
    kilometersDriven: stringValue(details.kmDriven),
    kilometers_driven: stringValue(details.kmDriven),
    ownerCount: stringValue(details.numberOfOwners),
    owner_count: stringValue(details.numberOfOwners),
    insurance: stringValue(details.insuranceStatus),
    insuranceValidTill: stringValue(details.insuranceValidTill).slice(0, 10),
    insurance_valid_till: stringValue(details.insuranceValidTill).slice(0, 10),
    registrationState: stringValue(details.registrationState),
    registration_state: stringValue(details.registrationState),
    rto: stringValue(details.rto),
    color: stringValue(details.color),
    bodyType: stringValue(details.bodyType),
    body_type: stringValue(details.bodyType),
    seatingCapacity: stringValue(details.seatingCapacity),
    seating_capacity: stringValue(details.seatingCapacity),
    bootSpace: stringValue(details.bootSpace),
    boot_space: stringValue(details.bootSpace),
    mileage: stringValue(details.mileage),
    engineCapacity: stringValue(details.engineCapacityCc),
    engine_capacity: stringValue(details.engineCapacityCc),
    bikeType: stringValue(details.bikeType),
    bike_type: stringValue(details.bikeType),
    vehicleType: stringValue(details.commercialVehicleType),
    vehicle_type: stringValue(details.commercialVehicleType),
    loadCapacity: stringValue(details.loadCapacity),
    load_capacity: stringValue(details.loadCapacity),
    numberOfWheels: stringValue(details.numberOfWheels),
    number_of_wheels: stringValue(details.numberOfWheels),
    permitType: stringValue(details.permitType),
    permit_type: stringValue(details.permitType),
    rentalType: stringValue(details.rentalType),
    rental_type: stringValue(details.rentalType),
    pricePerHour: stringValue(details.pricePerHour),
    price_per_hour: stringValue(details.pricePerHour),
    pricePerDay: stringValue(details.pricePerDay),
    price_per_day: stringValue(details.pricePerDay),
    securityDepositVehicle: stringValue(details.securityDeposit),
    security_deposit_vehicle: stringValue(details.securityDeposit),
    partType: stringValue(details.partType),
    part_type: stringValue(details.partType),
    compatibleModels: stringValue(details.compatibleModels),
    compatible_models: stringValue(details.compatibleModels),
    condition: stringValue(details.partCondition),
    rcAvailable: booleanSelectValue(details.rcAvailable),
    rc_available: booleanSelectValue(details.rcAvailable),
    pucAvailable: booleanSelectValue(details.pucAvailable),
    puc_available: booleanSelectValue(details.pucAvailable),
    serviceHistory: stringValue(details.serviceHistoryStatus),
    service_history: stringValue(details.serviceHistoryStatus),
    loanStatus: stringValue(details.loanStatus),
    loan_status: stringValue(details.loanStatus),
    price: stringValue(priceDetails.price || listing.price),
    price_negotiable: priceDetails.priceNegotiable === false ? "No" : priceDetails.priceNegotiable === true ? "Yes" : "",
    area_locality: stringValue(locationDetails.locality || listing.locality),
    map_lat_long: locationDetails.latitude || locationDetails.longitude ? [stringValue(locationDetails.latitude), stringValue(locationDetails.longitude)].filter(Boolean).join(", ") : "",
    ad_type: stringValue(settings.adType),
    ad_duration_days: stringValue(settings.adDurationDays),
  };

  const features = Array.isArray(details.features) ? details.features.map(String) : [];
  for (const [feature, keys] of [
    ["Air Conditioning", ["airConditioning"]],
    ["Power Steering", ["powerSteering"]],
    ["ABS", ["abs"]],
    ["Airbags", ["airbags"]],
    ["Sunroof", ["sunroof"]],
    ["Alloy Wheels", ["alloyWheels"]],
    ["Bluetooth / GPS", ["bluetoothGps"]],
    ["Reverse Camera", ["reverseCamera"]],
    ["Cruise Control", ["cruiseControl"]],
    ["Leather Seats", ["leatherSeats"]],
    ["Navigation System", ["navigationSystem"]],
    ["Bluetooth", ["bluetooth"]],
    ["Backup Camera", ["backupCamera"]],
    ["Heated Seats", ["heatedSeats"]],
    ["Apple CarPlay / Android Auto", ["appleCarplayAndroidAuto"]],
    ["Parking Sensors", ["parkingSensors"]],
    ["Remote Start", ["remoteStart"]],
  ] as Array<[string, string[]]>) {
    if (features.includes(feature)) {
      values[keys[0]] = "true";
      values[keys[0].replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)] = "true";
    }
  }

  return trimCategoryAttributes(values);
}

function mapElectronicsAttributesFromListing(listing: ListingSummary): CategoryAttributes {
  const details = listing.electronicsDetails || {};
  const priceDetails = listing.priceDetails || {};
  const locationDetails = listing.locationDetails || {};
  const sellerInformation = listing.sellerInformation || {};
  const settings = listing.settings || {};
  const values: CategoryAttributes = {
    brand: stringValue(details.brand),
    modelNameNumber: stringValue(details.modelNameNumber),
    model_name_number: stringValue(details.modelNameNumber),
    condition: stringValue(details.condition),
    purchaseYear: stringValue(details.purchaseYear),
    purchase_year: stringValue(details.purchaseYear),
    billAvailable: booleanSelectValue(details.billAvailable),
    bill_available: booleanSelectValue(details.billAvailable),
    warranty: booleanSelectValue(details.warranty),
    warrantyRemainingMonths: stringValue(details.warrantyRemainingMonths),
    warranty_remaining_months: stringValue(details.warrantyRemainingMonths),
    color: stringValue(details.color),
    usageDuration: stringValue(details.usageDuration),
    usage_duration: stringValue(details.usageDuration),
    ram: stringValue(details.ram),
    storage: stringValue(details.storage),
    processor: stringValue(details.processor),
    screenSize: stringValue(details.screenSize),
    screen_size: stringValue(details.screenSize),
    batteryHealth: stringValue(details.batteryHealth),
    battery_health: stringValue(details.batteryHealth),
    network: stringValue(details.network),
    graphicsCard: stringValue(details.graphicsCard),
    graphics_card: stringValue(details.graphicsCard),
    operatingSystem: stringValue(details.operatingSystem),
    operating_system: stringValue(details.operatingSystem),
    displayType: stringValue(details.displayType),
    display_type: stringValue(details.displayType),
    resolution: stringValue(details.resolution),
    smartTv: booleanSelectValue(details.smartTv),
    smart_tv: booleanSelectValue(details.smartTv),
    applianceType: stringValue(details.applianceType),
    appliance_type: stringValue(details.applianceType),
    capacity: stringValue(details.capacity),
    energyRating: stringValue(details.energyRating),
    energy_rating: stringValue(details.energyRating),
    inverterTechnology: booleanSelectValue(details.inverterTechnology),
    inverter_technology: booleanSelectValue(details.inverterTechnology),
    powerConsumption: stringValue(details.powerConsumption),
    power_consumption: stringValue(details.powerConsumption),
    accessoryType: stringValue(details.accessoryType),
    accessory_type: stringValue(details.accessoryType),
    compatibility: stringValue(details.compatibility),
    connectivity: stringValue(details.connectivity),
    price: stringValue(priceDetails.price || listing.price),
    price_negotiable: priceDetails.priceNegotiable === false ? "No" : priceDetails.priceNegotiable === true ? "Yes" : "",
    area_locality: stringValue(locationDetails.locality || listing.locality),
    map_lat_long: locationDetails.latitude || locationDetails.longitude ? [stringValue(locationDetails.latitude), stringValue(locationDetails.longitude)].filter(Boolean).join(", ") : "",
    seller_type: stringValue(sellerInformation.sellerType),
    ad_type: stringValue(settings.adType),
    ad_duration_days: stringValue(settings.adDurationDays),
  };

  const features = Array.isArray(details.features) ? details.features.map(String) : [];
  for (const [feature, keys] of [
    ["Bluetooth", ["bluetooth"]],
    ["WiFi", ["wifi"]],
    ["Touchscreen", ["touchscreen"]],
    ["Fast Charging", ["fastCharging", "fast_charging"]],
    ["Smart Features", ["smartFeatures", "smart_features"]],
    ["Remote Control", ["remoteControl", "remote_control"]],
  ] as Array<[string, string[]]>) {
    if (features.includes(feature)) {
      for (const key of keys) {
        values[key] = "true";
      }
    }
  }

  return trimCategoryAttributes(values);
}

function mapCareServiceAttributesFromListing(listing: ListingSummary): CategoryAttributes {
  const details = listing.careServiceDetails || {};
  const priceDetails = listing.priceDetails || {};
  const locationDetails = listing.locationDetails || {};
  const sellerInformation = listing.sellerInformation || {};
  const settings = listing.settings || {};
  const values: CategoryAttributes = {
    serviceTitle: stringValue(listing.title),
    service_title: stringValue(listing.title),
    description: stringValue(listing.description),
    serviceDescription: stringValue(listing.description),
    service_description: stringValue(listing.description),
    businessCaregiverName: stringValue(settings.careBusinessCaregiverName),
    business_caregiver_name: stringValue(settings.careBusinessCaregiverName),
    tagline: stringValue(settings.careTagline),
    providerType: stringValue(details.providerType),
    provider_type: stringValue(details.providerType),
    experienceYears: stringValue(details.experienceYears),
    experience_years: stringValue(details.experienceYears),
    languagesSpoken: Array.isArray(details.languagesSpoken) ? details.languagesSpoken.map(String).join(", ") : "",
    languages_spoken: Array.isArray(details.languagesSpoken) ? details.languagesSpoken.map(String).join(", ") : "",
    availabilityType: stringValue(details.availabilityType),
    availability_type: stringValue(details.availabilityType),
    availableDays: Array.isArray(details.availableDays) ? details.availableDays.map(String).join(", ") : "",
    available_days: Array.isArray(details.availableDays) ? details.availableDays.map(String).join(", ") : "",
    availableTimeSlots: stringValue(details.availableTimeSlots),
    available_time_slots: stringValue(details.availableTimeSlots),
    startDate: stringValue(details.startDate).slice(0, 10),
    start_date: stringValue(details.startDate).slice(0, 10),
    rateType: stringValue(details.rateType),
    rate_type: stringValue(details.rateType),
    minimumHoursRequired: stringValue(settings.careMinimumHoursRequired),
    minimum_hours_required: stringValue(settings.careMinimumHoursRequired),
    willingToTravel: booleanSelectValue(details.willingToTravel),
    willing_to_travel: booleanSelectValue(details.willingToTravel),
    serviceRadiusMiles: stringValue(details.serviceRadiusMiles),
    service_radius_miles: stringValue(details.serviceRadiusMiles),
    cprCertified: booleanSelectValue(details.cprCertified),
    cpr_certified: booleanSelectValue(details.cprCertified),
    firstAidCertified: booleanSelectValue(details.firstAidCertified),
    first_aid_certified: booleanSelectValue(details.firstAidCertified),
    cnaCertified: booleanSelectValue(details.cnaCertified),
    cna_certified: booleanSelectValue(details.cnaCertified),
    rnLpn: booleanSelectValue(details.rnLpn),
    rn_lpn: booleanSelectValue(details.rnLpn),
    licenseNumber: stringValue(details.licenseNumber),
    license_number: stringValue(details.licenseNumber),
    backgroundCheck: booleanSelectValue(details.backgroundCheck),
    background_check: booleanSelectValue(details.backgroundCheck),
    referencesAvailable: booleanSelectValue(details.referencesAvailable),
    references_available: booleanSelectValue(details.referencesAvailable),
    specialSkills: stringValue(details.specialSkills),
    special_skills: stringValue(details.specialSkills),
    previousEmployer: stringValue(details.previousEmployer),
    previous_employer: stringValue(details.previousEmployer),
    education: stringValue(details.education),
    ageGroups: Array.isArray(details.ageGroups) ? details.ageGroups.map(String).join(", ") : "",
    age_groups: Array.isArray(details.ageGroups) ? details.ageGroups.map(String).join(", ") : "",
    genderPreference: stringValue(details.genderPreference),
    gender_preference: stringValue(details.genderPreference),
    specialNeedsExperience: booleanSelectValue(details.specialNeedsExperience),
    special_needs_experience: booleanSelectValue(details.specialNeedsExperience),
    certificationDocuments: Array.isArray(details.certificationDocuments) ? details.certificationDocuments.map(String).join(", ") : "",
    certification_documents: Array.isArray(details.certificationDocuments) ? details.certificationDocuments.map(String).join(", ") : "",
    videoIntroductionUrl: stringValue(details.videoIntroductionUrl),
    video_introduction_url: stringValue(details.videoIntroductionUrl),
    businessLogo: stringValue(settings.careBusinessLogo),
    business_logo: stringValue(settings.careBusinessLogo),
    contactName: stringValue(sellerInformation.name),
    contact_name: stringValue(sellerInformation.name),
    contactPhone: stringValue(sellerInformation.mobileNumber),
    contact_phone: stringValue(sellerInformation.mobileNumber),
    contactEmail: stringValue(sellerInformation.email),
    contact_email: stringValue(sellerInformation.email),
    contactWebsite: stringValue(sellerInformation.websiteUrl),
    contact_website: stringValue(sellerInformation.websiteUrl),
    chatEnabled: booleanSelectValue(details.chatEnabled),
    chat_enabled: booleanSelectValue(details.chatEnabled),
    callEnabled: booleanSelectValue(details.callEnabled),
    call_enabled: booleanSelectValue(details.callEnabled),
    scheduleInterview: booleanSelectValue(details.scheduleInterview),
    schedule_interview: booleanSelectValue(details.scheduleInterview),
    identityVerification: booleanSelectValue(details.identityVerification),
    identity_verification: booleanSelectValue(details.identityVerification),
    backgroundVerification: booleanSelectValue(details.backgroundVerification),
    background_verification: booleanSelectValue(details.backgroundVerification),
    serviceDisclaimer: stringValue(details.serviceDisclaimer),
    service_disclaimer: stringValue(details.serviceDisclaimer),
    hipaaCompliance: stringValue(settings.careHipaaCompliance),
    hipaa_compliance: stringValue(settings.careHipaaCompliance),
    insurance: stringValue(details.insurance),
    onlineConsultation: stringValue(settings.careOnlineConsultation),
    online_consultation: stringValue(settings.careOnlineConsultation),
    emergencyAvailability: stringValue(settings.careEmergencyAvailability),
    emergency_availability: stringValue(settings.careEmergencyAvailability),
    childAgeGroup: stringValue(settings.careChildAgeGroup),
    child_age_group: stringValue(settings.careChildAgeGroup),
    schoolPickupOption: stringValue(settings.careSchoolPickupOption),
    school_pickup_option: stringValue(settings.careSchoolPickupOption),
    mobilityAssistance: stringValue(settings.careMobilityAssistance),
    mobility_assistance: stringValue(settings.careMobilityAssistance),
    dementiaCareExperience: stringValue(settings.careDementiaCareExperience),
    dementia_care_experience: stringValue(settings.careDementiaCareExperience),
    petTypeExperience: stringValue(settings.carePetTypeExperience),
    pet_type_experience: stringValue(settings.carePetTypeExperience),
    staffCount: stringValue(settings.careStaffCount),
    staff_count: stringValue(settings.careStaffCount),
    sponsoredListing: stringValue(settings.careSponsoredListing),
    sponsored_listing: stringValue(settings.careSponsoredListing),
    boostListing: stringValue(settings.careBoostListing),
    boost_listing: stringValue(settings.careBoostListing),
    price: stringValue(priceDetails.price || listing.price),
    price_negotiable: stringValue(settings.carePriceNegotiable) || (priceDetails.priceNegotiable === false ? "No" : priceDetails.priceNegotiable === true ? "Yes" : ""),
    smokingAllowed: stringValue(settings.careSmokingAllowed),
    smoking_allowed: stringValue(settings.careSmokingAllowed),
    petFriendly: stringValue(settings.carePetFriendly),
    pet_friendly: stringValue(settings.carePetFriendly),
    area_locality: stringValue(locationDetails.locality || listing.locality),
    ad_type: stringValue(settings.adType),
    ad_duration_days: stringValue(settings.adDurationDays),
  };

  const services = Array.isArray(details.servicesOffered) ? details.servicesOffered.map(String) : [];
  for (const [service, keys] of [
    ["Meal Preparation", ["mealPreparation", "meal_preparation"]],
    ["Medication Reminder", ["medicationReminder", "medication_reminder"]],
    ["Bathing Assistance", ["bathingAssistance", "bathing_assistance"]],
    ["Transportation Assistance", ["transportationAssistance", "transportation_assistance"]],
    ["Pet Assistance", ["petAssistance", "pet_assistance"]],
    ["Mobility Support", ["mobilitySupport", "mobility_support"]],
    ["Therapy Assistance", ["therapyAssistance", "therapy_assistance"]],
    ["Childcare", ["childcare"]],
    ["Elder care", ["elderCare", "elder_care"]],
    ["Medical assistance", ["medicalAssistance", "medical_assistance"]],
    ["Housekeeping", ["housekeeping"]],
    ["Transportation", ["transportation"]],
    ["Pet care", ["petCare", "pet_care"]],
  ] as Array<[string, string[]]>) {
    if (services.includes(service)) {
      for (const key of keys) {
        values[key] = "true";
      }
    }
  }

  return trimCategoryAttributes(values);
}

function applyCareContactDefaults(
  attributes: CategoryAttributes,
  defaults: { name?: string; phone?: string; email?: string; website?: string },
) {
  const nextAttributes = { ...attributes };
  const fieldDefaults = [
    [["contactName", "contact_name"], defaults.name],
    [["contactPhone", "contact_phone"], defaults.phone],
    [["contactEmail", "contact_email"], defaults.email],
    [["contactWebsite", "contact_website"], defaults.website],
  ] as Array<[string[], string | undefined]>;

  for (const [keys, value] of fieldDefaults) {
    if (!value?.trim()) {
      continue;
    }

    if (keys.some((key) => nextAttributes[key]?.trim())) {
      continue;
    }

    for (const key of keys) {
      nextAttributes[key] = value;
    }
  }

  return nextAttributes;
}

function mapRestaurantMenuItemsFromListing(listing: ListingSummary): RestaurantMenuItem[] {
  const menuItems = listing.restaurantMenuItems || [];
  if (!menuItems.length) {
    return [{ ...initialRestaurantMenuItem }];
  }

  return menuItems.map((item, index) => ({
    itemName: stringValue(item.itemName),
    menuCategory: stringValue(item.menuCategory),
    description: stringValue(item.description),
    price: stringValue(item.price),
    foodType: stringValue(item.foodType),
    spiceLevel: stringValue(item.spiceLevel),
    calories: stringValue(item.calories),
    imageUrl: stringValue(item.imageUrl),
    displayOrder: stringValue(item.displayOrder) || String(index + 1),
    isAvailable: item.isAvailable !== false,
  }));
}

function mapRestaurantHoursFromListing(listing: ListingSummary, propertyDetails: Record<string, unknown>): BusinessHour[] {
  const hours = listing.restaurantOperatingHours || [];
  if (!hours.length) {
    return parseJsonArray<BusinessHour>(propertyDetails.businessHours, defaultBusinessHours);
  }

  return defaultBusinessHours.map((defaultHour) => {
    const hour = hours.find((item) => stringValue(item.dayOfWeek) === defaultHour.day);
    if (!hour) {
      return defaultHour;
    }

    return {
      day: defaultHour.day,
      status: hour.isOpen === false ? "Closed" : "Open",
      open: stringValue(hour.openTime).slice(0, 5),
      close: stringValue(hour.closeTime).slice(0, 5),
      is24Hours: hour.is24Hours === true,
      specialHoursNote: stringValue(hour.specialHoursNote),
    };
  });
}

function stringValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function parseJsonArray<T>(value: unknown, fallback: T[]) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
}

function parseJsonObject<T extends object>(value: unknown, fallback: T) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? { ...fallback, ...parsed } as T
      : fallback;
  } catch {
    return fallback;
  }
}

function parseListingOtherInformation(value: unknown): { items: InfoItem[]; categoryAttributes: CategoryAttributes } {
  const fallbackItems = Array.from({ length: 6 }, () => ({ question: "", answer: "" }));

  if (typeof value !== "string" || !value.trim()) {
    return { items: fallbackItems, categoryAttributes: {} };
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return {
        items: parsed.length ? parsed as InfoItem[] : fallbackItems,
        categoryAttributes: {},
      };
    }

    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const parsedItems = Array.isArray(record.items) && record.items.length
        ? record.items as InfoItem[]
        : fallbackItems;
      const parsedAttributes = record.categoryAttributes && typeof record.categoryAttributes === "object" && !Array.isArray(record.categoryAttributes)
        ? record.categoryAttributes as CategoryAttributes
        : {};

      return { items: parsedItems, categoryAttributes: parsedAttributes };
    }
  } catch {
    return { items: fallbackItems, categoryAttributes: {} };
  }

  return { items: fallbackItems, categoryAttributes: {} };
}

function trimCategoryAttributes(value: CategoryAttributes) {
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, attributeValue]) => [key, attributeValue.trim()])
      .filter(([, attributeValue]) => attributeValue)
  );
}

function parseNearbyServices(value: unknown): NearbyServices {
  const fallback = Object.fromEntries(nearbyServiceTypes.map((type) => [type, [""]])) as NearbyServices;

  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fallback;
    }

    const record = parsed as Record<string, unknown>;
    return Object.fromEntries(nearbyServiceTypes.map((type) => {
      const values = Array.isArray(record[type])
        ? record[type].map(String)
        : [];
      return [type, values.length ? values : [""]];
    })) as NearbyServices;
  } catch {
    return fallback;
  }
}

function serializeNearbyServices(value: NearbyServices) {
  return JSON.stringify(Object.fromEntries(
    nearbyServiceTypes.map((type) => [
      type,
      value[type] || [""],
    ])
  ));
}

function parseServiceItems(value: unknown) {
  const items = parseJsonArray<unknown>(value, []);

  if (!items.length) {
    return [{ name: "", imageName: "" }];
  }

  return items.map((item) => {
    if (typeof item === "string") {
      return { name: item, imageName: "" };
    }

    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      return {
        name: stringValue(record.name),
        imageName: stringValue(record.imageName),
      };
    }

    return { name: "", imageName: "" };
  });
}

function booleanSelectValue(value: unknown) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

function updateArrayItem<T>(items: T[], index: number, value: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

type FieldProps = {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

type ListingAddressDetails = {
  address: string;
  pincode: string;
  latitude: string;
  longitude: string;
  country: string;
  state: string;
  city: string;
};

function isVideoValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("data:video/") || /\.(mp4|webm|mov|m4v)(\?|#|$)/.test(normalized);
}

function numberOrNull(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && String(value || "").trim() !== "" ? parsed : null;
}

function isNonNegativeDecimalText(value?: string) {
  const text = String(value || "").trim();
  if (!text) return false;

  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0;
}

function boolOrNull(value?: string) {
  if (value === "Yes") return true;
  if (value === "No") return false;
  return null;
}

function getSelectedRestaurantServiceTypes(restaurantInfo: RestaurantInfo, values: CategoryAttributes) {
  const selected = restaurantServiceTypeOptions
    .filter(({ key, label }) => (
      restaurantInfo.serviceTypes.includes(label) ||
      boolAttribute(values, key) === true ||
      (label === "Delivery" && restaurantInfo.deliveryAvailable) ||
      (label === "Reservations Accepted" && restaurantInfo.tableBooking)
    ))
    .map(({ label }) => label);
  const listed = splitAttributeList(values, "service_type", "service_types", "serviceTypes")
    .filter((service) => restaurantServiceTypeOptions.some((option) => option.label.toLowerCase() === service.toLowerCase()));

  return Array.from(new Set([...selected, ...listed]));
}

function parsePriceNegotiable(value: string, fallback: boolean) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) return fallback;
  if (normalized === "yes" || normalized === "negotiable") return true;
  if (normalized === "no" || normalized === "fixed") return false;

  return fallback;
}

function parseLatLong(value: string) {
  const [latitudeText, longitudeText] = value.split(",").map((item) => item.trim());
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function getAttributeValue(values: CategoryAttributes, ...keys: string[]) {
  for (const key of keys) {
    const direct = values[key];
    if (direct !== undefined) {
      return direct;
    }

    const normalizedKey = normalizeFieldKey(key);
    const match = Object.entries(values).find(([itemKey]) => normalizeFieldKey(itemKey) === normalizedKey);
    if (match) {
      return match[1];
    }
  }

  return "";
}

function numberAttribute(values: CategoryAttributes, ...keys: string[]) {
  return numberOrNull(getAttributeValue(values, ...keys));
}

function boolAttribute(values: CategoryAttributes, ...keys: string[]) {
  const value = getAttributeValue(values, ...keys);
  if (value === "true" || value === "Yes") return true;
  if (value === "false" || value === "No") return false;
  return null;
}

function splitAttributeList(values: CategoryAttributes, ...keys: string[]) {
  return getAttributeValue(values, ...keys)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasAnyFieldKey(fields: CategoryAttributeField[], ...keys: string[]) {
  const normalizedKeys = new Set(keys.map(normalizeFieldKey));
  return fields.some((field) => normalizedKeys.has(normalizeFieldKey(field.key)));
}

function categoryFieldErrorKey(key: string) {
  return `categoryAttributes.${key}`;
}

function restaurantMenuItemErrorKey(index: number, key: keyof RestaurantMenuItem) {
  return `restaurantMenuItems.${index}.${key}`;
}

function isMissingRequiredCategoryValue(field: CategoryAttributeField, value?: string) {
  if (field.type === "checkbox") {
    return value !== "true";
  }

  return !String(value || "").trim();
}

function vehicleFeatureValues(values: CategoryAttributes) {
  const featureMap: Array<[string, string[]]> = [
    ["Air Conditioning", ["airConditioning", "air_conditioning"]],
    ["Power Steering", ["powerSteering", "power_steering"]],
    ["ABS", ["abs"]],
    ["Airbags", ["airbags"]],
    ["Sunroof", ["sunroof"]],
    ["Alloy Wheels", ["alloyWheels", "alloy_wheels"]],
    ["Bluetooth / GPS", ["bluetoothGps", "bluetooth_gps"]],
    ["Reverse Camera", ["reverseCamera", "reverse_camera"]],
    ["Cruise Control", ["cruiseControl", "cruise_control"]],
    ["Leather Seats", ["leatherSeats", "leather_seats"]],
    ["Navigation System", ["navigationSystem", "navigation_system"]],
    ["Bluetooth", ["bluetooth"]],
    ["Backup Camera", ["backupCamera", "backup_camera"]],
    ["Heated Seats", ["heatedSeats", "heated_seats"]],
    ["Apple CarPlay / Android Auto", ["appleCarplayAndroidAuto", "apple_carplay_android_auto"]],
    ["Parking Sensors", ["parkingSensors", "parking_sensors"]],
    ["Remote Start", ["remoteStart", "remote_start"]],
  ];

  return featureMap
    .filter(([, keys]) => boolAttribute(values, ...keys) === true)
    .map(([feature]) => feature);
}

function electronicsFeatureValues(values: CategoryAttributes) {
  const featureMap: Array<[string, string[]]> = [
    ["Bluetooth", ["bluetooth"]],
    ["WiFi", ["wifi"]],
    ["Touchscreen", ["touchscreen"]],
    ["Fast Charging", ["fastCharging", "fast_charging"]],
    ["Smart Features", ["smartFeatures", "smart_features"]],
    ["Remote Control", ["remoteControl", "remote_control"]],
  ];

  return featureMap
    .filter(([, keys]) => boolAttribute(values, ...keys) === true)
    .map(([feature]) => feature);
}

function careServiceValues(values: CategoryAttributes) {
  const serviceMap: Array<[string, string[]]> = [
    ["Meal Preparation", ["mealPreparation", "meal_preparation"]],
    ["Medication Reminder", ["medicationReminder", "medication_reminder"]],
    ["Bathing Assistance", ["bathingAssistance", "bathing_assistance"]],
    ["Transportation Assistance", ["transportationAssistance", "transportation_assistance"]],
    ["Housekeeping", ["housekeeping"]],
    ["Pet Assistance", ["petAssistance", "pet_assistance"]],
    ["Mobility Support", ["mobilitySupport", "mobility_support"]],
    ["Therapy Assistance", ["therapyAssistance", "therapy_assistance"]],
    ["Childcare", ["childcare", "child_care"]],
    ["Elder care", ["elderCare", "elder_care"]],
    ["Medical assistance", ["medicalAssistance", "medical_assistance"]],
    ["Transportation", ["transportation"]],
    ["Pet care", ["petCare", "pet_care"]],
  ];

  const selected = serviceMap
    .filter(([, keys]) => boolAttribute(values, ...keys) === true)
    .map(([service]) => service);
  const listed = splitAttributeList(values, "servicesOffered", "services_offered")
    .filter((service) => careServiceOptions.some((option) => option.toLowerCase() === service.toLowerCase()));

  return Array.from(new Set([...selected, ...listed]));
}

function getCategoryAttributeFields(categoryName: string, subCategory: string, detailCategory: string) {
  const fieldSet = categoryAttributeFieldSetsByCategory[categoryName];

  if (!fieldSet) {
    return categoryAttributeFieldsByCategory[categoryName] || [];
  }

  return (
    fieldSet.detailedCategories?.[detailCategory] ||
    fieldSet.subCategories?.[subCategory] ||
    fieldSet.default ||
    []
  );
}

function shouldUseSharedListingLocationSection(categoryName: string) {
  return sharedListingLocationCategories.includes(categoryName) || isElectronicsCategoryName(categoryName);
}

function isEventsListingCategory(categoryName: string) {
  return categoryName === "Events & Tickets" || categoryName === "Tickets & Events";
}

function shouldDefaultCountryToUsa(categoryName: string) {
  return usaDefaultLocationCategories.includes(categoryName) || isElectronicsCategoryName(categoryName);
}

function getSharedListingLocationSectionOrder(categoryName: string) {
  const orderByCategory: Record<string, number> = {
    Vehicles: 3,
    "Care Services": 4,
    "Events & Tickets": 4,
    "Tickets & Events": 4,
    "Roommates & Rentals": 3,
    Jobs: 4,
    "Electronics & Appliances": 5,
    "Pets & Animals": 3,
    "Furniture & Home": 4,
    "Furniture & Home Decor": 4,
  };

  return isElectronicsCategoryName(categoryName) ? 5 : orderByCategory[categoryName] || 4;
}

function getVehicleStepCategoryFields(fields: CategoryAttributeField[], formStep: number) {
  return fields.filter((field) => getVehicleFormStepForSectionOrder(field.sectionOrder || 1) === formStep);
}

function getEventStepCategoryFields(fields: CategoryAttributeField[], formStep: number) {
  return fields.filter((field) => getEventFormStepForSectionOrder(field.sectionOrder || 1) === formStep);
}

function getRoommatesRentalStepCategoryFields(fields: CategoryAttributeField[], formStep: number) {
  return fields.filter((field) => getRoommatesRentalFormStepForSectionOrder(field.sectionOrder || 1) === formStep);
}

function getJobStepCategoryFields(fields: CategoryAttributeField[], formStep: number) {
  return fields.filter((field) => getJobFormStepForSectionOrder(field.sectionOrder || 1) === formStep);
}

function getElectronicsStepCategoryFields(fields: CategoryAttributeField[], formStep: number) {
  return fields.filter((field) => getElectronicsFormStepForSectionOrder(field.sectionOrder || 1) === formStep);
}

function getPetStepCategoryFields(fields: CategoryAttributeField[], formStep: number) {
  return fields.filter((field) => getPetFormStepForSectionOrder(field.sectionOrder || 1) === formStep);
}

function getVehicleFormStepForSectionOrder(sectionOrder: number) {
  if (sectionOrder <= 4) {
    return 1;
  }

  if (sectionOrder <= 11) {
    return 2;
  }

  if (sectionOrder <= 16) {
    return 3;
  }

  return 1;
}

function getEventFormStepForSectionOrder(sectionOrder: number) {
  if (sectionOrder <= 5) {
    return 1;
  }

  if (sectionOrder <= 8) {
    return 2;
  }

  if (sectionOrder <= 11) {
    return 3;
  }

  return 4;
}

function getRoommatesRentalFormStepForSectionOrder(sectionOrder: number) {
  if (sectionOrder <= 4) {
    return 1;
  }

  if (sectionOrder <= 8) {
    return 2;
  }

  if (sectionOrder <= 11) {
    return 3;
  }

  return 4;
}

function getJobFormStepForSectionOrder(sectionOrder: number) {
  if (sectionOrder <= 4) {
    return 1;
  }

  if (sectionOrder <= 9) {
    return 2;
  }

  if (sectionOrder <= 14) {
    return 3;
  }

  return 4;
}

function getElectronicsFormStepForSectionOrder(sectionOrder: number) {
  if (sectionOrder <= 4) {
    return 1;
  }

  if (sectionOrder <= 6) {
    return 2;
  }

  if (sectionOrder <= 9) {
    return 3;
  }

  return 4;
}

function getPetFormStepForSectionOrder(sectionOrder: number) {
  if (sectionOrder <= 3) {
    return 1;
  }

  if (sectionOrder <= 6) {
    return 2;
  }

  if (sectionOrder <= 9) {
    return 3;
  }

  return 4;
}

function getSharedListingLocationSectionTitle(categoryName: string) {
  if (categoryName === "Care Services") return "Service Location";
  if (categoryName === "Events & Tickets" || categoryName === "Tickets & Events") return "Event Location";
  if (categoryName === "Jobs") return "Job Location";
  if (categoryName === "Vehicles") return "Location";
  return "Location Information";
}

function isSharedListingLocationAttributeField(field: CategoryAttributeField) {
  const key = normalizeFieldKey(field.key);
  const label = normalizeFieldKey(field.label);
  return [
    "country",
    "state",
    "city",
    "zipcode",
    "zip",
    "pincode",
    "address",
    "streetaddress",
    "streetaddresslocality",
    "fulladdress",
    "arealocality",
    "maplatlong",
    "googlemaplatlong",
    "latitude",
    "longitude",
    "pickuplocation",
  ].includes(key) || [
    "country",
    "state",
    "city",
    "zipcode",
    "zip",
    "address",
    "streetaddress",
    "fulladdress",
    "latitudelongitude",
    "maplocationlatlong",
    "pickuplatlong",
  ].includes(label);
}

function mergeCategoryPostingFields(fields: CategoryAttributeField[], categoryName: string, subCategory: string, detailCategory: string) {
  const shouldMergeCommonFields = categoryName === "Vehicles" ||
    isElectronicsCategoryName(categoryName) ||
    categoryName === "Care Services" ||
    categoryName === "Events & Tickets" ||
    categoryName === "Tickets & Events" ||
    categoryName === "Roommates & Rentals" ||
    categoryName === "Jobs" ||
    categoryName === "Pets & Animals" ||
    isFurnitureCategory(categoryName);

  if (!shouldMergeCommonFields) {
    return dedupeCategoryPostingFields(fields);
  }

  const commonFields =
    categoryName === "Vehicles"
      ? vehiclePostingCommonFields
      : isElectronicsCategoryName(categoryName)
        ? electronicsPostingCommonFields
        : categoryName === "Care Services"
          ? careServiceFields
          : categoryName === "Events & Tickets" || categoryName === "Tickets & Events"
            ? categoryAttributeFieldsByCategory["Events & Tickets"]
            : categoryName === "Roommates & Rentals"
              ? categoryAttributeFieldsByCategory["Roommates & Rentals"]
              : categoryName === "Jobs"
                ? categoryAttributeFieldsByCategory.Jobs
                : categoryName === "Pets & Animals"
                  ? categoryAttributeFieldsByCategory["Pets & Animals"]
                  : furniturePostingCommonFields;
  if (categoryName === "Vehicles") {
    return dedupeCategoryPostingFields([
      ...commonFields,
      ...getCategoryAttributeFields(categoryName, subCategory, detailCategory),
    ]);
  }

  if (isElectronicsCategoryName(categoryName)) {
    return dedupeCategoryPostingFields(getCategoryAttributeFields("Electronics & Appliances", subCategory, detailCategory));
  }

  if (categoryName === "Roommates & Rentals" || categoryName === "Jobs" || categoryName === "Pets & Animals") {
    return dedupeCategoryPostingFields(categoryName === "Pets & Animals" ? getCategoryAttributeFields(categoryName, subCategory, detailCategory) : commonFields);
  }

  const requiredFields = categoryName === "Care Services" || categoryName === "Events & Tickets" || categoryName === "Tickets & Events" || categoryName === "Roommates & Rentals" || categoryName === "Jobs"
    ? [...commonFields, ...fields, ...getCategoryAttributeFields(categoryName, subCategory, detailCategory)]
    : [...fields, ...commonFields, ...getCategoryAttributeFields(categoryName, subCategory, detailCategory)];

  return dedupeCategoryPostingFields(requiredFields);
}

function dedupeCategoryPostingFields(fields: CategoryAttributeField[]) {
  const nextFields: CategoryAttributeField[] = [];

  for (const field of fields) {
    if (!nextFields.some((item) => areEquivalentCategoryFields(item, field))) {
      nextFields.push(field);
    }
  }

  return nextFields;
}

function areEquivalentCategoryFields(firstField: CategoryAttributeField, secondField: CategoryAttributeField) {
  return areEquivalentCategoryFieldKeys(firstField.key, secondField.key) ||
    normalizeFieldKey(firstField.label) === normalizeFieldKey(secondField.label);
}

function areEquivalentCategoryFieldKeys(firstKey: string, secondKey: string) {
  const first = normalizeFieldKey(firstKey);
  const second = normalizeFieldKey(secondKey);

  if (first === second) {
    return true;
  }

  const aliases = [
    ["pricenegotiablevehicle", "pricenegotiable", "price_negotiable"],
    ["yearofmanufacture", "year_of_manufacture"],
    ["registrationyear", "registration_year"],
    ["vehiclecondition", "vehicle_condition", "condition"],
    ["fueltype", "fuel_type"],
    ["kilometersdriven", "kilometers_driven", "kmdriven", "km_driven"],
    ["ownercount", "owner_count", "numberofowners", "number_of_owners"],
    ["insurancevalidtill", "insurance_valid_till"],
    ["registrationstate", "registration_state"],
    ["drivetype", "drive_type"],
    ["interiorcolor", "interior_color"],
    ["ownershiptypevehicle", "ownership_type_vehicle"],
    ["accidenthistory", "accident_history"],
    ["cleantitle", "clean_title"],
    ["titlestatus", "title_status"],
    ["registrationstatus", "registration_status"],
    ["emissionstestpassed", "emissions_test_passed"],
    ["financingavailable", "financing_available"],
    ["leaseoption", "lease_option"],
    ["warrantyavailable", "warranty_available"],
    ["insuranceincluded", "insurance_included"],
    ["extendedwarranty", "extended_warranty"],
    ["seller_type", "sellertype"],
    ["dealername", "dealer_name"],
    ["preferredcontacttime", "preferred_contact_time"],
    ["availabilitystatus", "availability_status"],
    ["scheduletestdrive", "schedule_test_drive"],
    ["boostlisting", "boost_listing"],
    ["sponsoredlisting", "sponsored_listing"],
    ["ad_type", "adtype"],
    ["ad_duration_days", "adduration", "addurationdays"],
    ["area_locality", "arealocality"],
    ["map_lat_long", "maplatlong", "googlemaplatlong"],
    ["rcavailable", "rc_available"],
    ["pucavailable", "puc_available"],
    ["servicehistory", "service_history"],
    ["loanstatus", "loan_status"],
    ["bodytype", "body_type"],
    ["seatingcapacity", "seating_capacity"],
    ["bootspace", "boot_space"],
    ["enginecapacity", "engine_capacity", "enginecapacitycc", "engine_capacity_cc"],
    ["biketype", "bike_type"],
    ["vehicletype", "vehicle_type", "commercialvehicletype", "commercial_vehicle_type"],
    ["loadcapacity", "load_capacity"],
    ["cargodimensions", "cargo_dimensions"],
    ["dotcompliance", "dot_compliance"],
    ["fleetvehicle", "fleet_vehicle"],
    ["numberofwheels", "number_of_wheels"],
    ["permittype", "permit_type"],
    ["rvtype", "rv_type"],
    ["watercrafttype", "watercraft_type"],
    ["sleepingcapacity", "sleeping_capacity"],
    ["lengthfeet", "length_feet"],
    ["enginehours", "engine_hours"],
    ["rentaltype", "rental_type"],
    ["rentalduration", "rental_duration"],
    ["priceperhour", "price_per_hour"],
    ["priceperday", "price_per_day", "dailyprice", "daily_price"],
    ["securitydepositvehicle", "security_deposit_vehicle", "depositamount", "deposit_amount"],
    ["parttype", "part_type"],
    ["compatiblemodels", "compatible_models", "compatiblebrandsmodels", "compatible_brands_models"],
    ["oemaftermarket", "oem_aftermarket"],
    ["partcondition", "part_condition"],
    ["batteryrange", "battery_range", "rangepercharge", "range_per_charge"],
    ["batterycapacity", "battery_capacity"],
    ["chargingtime", "charging_time"],
    ["fastchargingsupport", "fast_charging_support"],
    ["chargingporttype", "charging_port_type"],
    ["chargingstationtype", "charging_station_type"],
    ["servicetype", "service_type"],
    ["serviceradiusmiles", "service_radius_miles"],
    ["appointmentrequired", "appointment_required"],
    ["emergencyservice", "emergency_service"],
    ["modelnamenumber", "model_name_number", "model"],
    ["purchaseyear", "purchase_year"],
    ["billavailable", "bill_available"],
    ["warrantyremainingmonths", "warranty_remaining_months"],
    ["usageduration", "usage_duration"],
    ["screensize", "screen_size"],
    ["batteryhealth", "battery_health"],
    ["graphicscard", "graphics_card"],
    ["operatingsystem", "operating_system"],
    ["displaytype", "display_type"],
    ["smarttv", "smart_tv"],
    ["appliancetype", "appliance_type"],
    ["energyrating", "energy_rating"],
    ["invertertechnology", "inverter_technology"],
    ["powerconsumption", "power_consumption"],
    ["accessorytype", "accessory_type"],
    ["fastcharging", "fast_charging"],
    ["smartfeatures", "smart_features"],
    ["remotecontrol", "remote_control"],
    ["providertype", "provider_type"],
    ["servicetitle", "service_title", "listingtitle", "listing_title"],
    ["description", "servicedescription", "service_description"],
    ["businesscaregivername", "business_caregiver_name"],
    ["experienceyears", "experience_years"],
    ["languagesspoken", "languages_spoken"],
    ["eldercare", "elder_care"],
    ["medicalassistance", "medical_assistance"],
    ["petcare", "pet_care"],
    ["mealpreparation", "meal_preparation"],
    ["medicationreminder", "medication_reminder"],
    ["bathingassistance", "bathing_assistance"],
    ["transportationassistance", "transportation_assistance"],
    ["petassistance", "pet_assistance"],
    ["mobilitysupport", "mobility_support"],
    ["therapyassistance", "therapy_assistance"],
    ["availabilitytype", "availability_type"],
    ["availabledays", "available_days"],
    ["availabletimeslots", "available_time_slots"],
    ["startdate", "start_date"],
    ["ratetype", "rate_type"],
    ["serviceradiusmiles", "service_radius_miles"],
    ["willingtotravel", "willing_to_travel"],
    ["cprcertified", "cpr_certified"],
    ["firstaidcertified", "first_aid_certified"],
    ["cnacertified", "cna_certified"],
    ["rnlpn", "rn_lpn"],
    ["licensenumber", "license_number"],
    ["backgroundcheck", "background_check"],
    ["referencesavailable", "references_available"],
    ["specialskills", "special_skills"],
    ["previousemployer", "previous_employer"],
    ["agegroups", "age_groups"],
    ["genderpreference", "gender_preference"],
    ["specialneedsexperience", "special_needs_experience"],
    ["certificationdocuments", "certification_documents"],
    ["videointroductionurl", "video_introduction_url"],
    ["chatenabled", "chat_enabled"],
    ["callenabled", "call_enabled"],
    ["scheduleinterview", "schedule_interview"],
    ["identityverification", "identity_verification"],
    ["backgroundverification", "background_verification"],
    ["servicedisclaimer", "service_disclaimer"],
    ["minimumhoursrequired", "minimum_hours_required"],
    ["smokingallowed", "smoking_allowed"],
    ["petfriendly", "pet_friendly"],
    ["businesslogo", "business_logo"],
    ["hipaacompliance", "hipaa_compliance"],
    ["onlineconsultation", "online_consultation"],
    ["emergencyavailability", "emergency_availability"],
    ["childagegroup", "child_age_group"],
    ["schoolpickupoption", "school_pickup_option"],
    ["mobilityassistance", "mobility_assistance"],
    ["dementiacareexperience", "dementia_care_experience"],
    ["pettypeexperience", "pet_type_experience"],
    ["staffcount", "staff_count"],
  ].map((group) => new Set(group));

  return aliases.some((group) => group.has(first) && group.has(second));
}

function shouldShowCategoryAttributeField(field: CategoryAttributeField, values: CategoryAttributes, form: FormState) {
  const key = normalizeFieldKey(field.key);
  const vehicleCondition = getAttributeValue(values, "vehicleCondition", "vehicle_condition", "condition");
  const isNewVehicle = form.detailCategory.toLowerCase().includes("new") || vehicleCondition === "New";
  const electronicsCondition = getAttributeValue(values, "condition");
  const electronicsWarranty = getAttributeValue(values, "warranty");
  const isAccessories = isVehiclePartsSubCategory(form.subCategory) || form.detailCategory === "EV Accessories";
  const isRental = isVehicleRentalSubCategory(form.subCategory);
  const isVehicleService = isVehicleServicesSubCategory(form.subCategory);
  const isEvVehicle = isVehicleEvSelection(form.subCategory, form.detailCategory);
  const isChargingStation = form.detailCategory === "Charging Stations";
  const insurance = getAttributeValue(values, "insurance", "insuranceStatus", "insurance_status");
  const furnitureCondition = getAttributeValue(values, "condition", "item_condition");
  const pickupOnly = getAttributeValue(values, "pickup_only", "pickupOnly");
  const furnitureDeliveryAvailable = getAttributeValue(values, "delivery_available", "deliveryAvailable");
  const furnitureSubCategory = form.subCategory.toLowerCase();
  const furnitureDetailCategory = form.detailCategory.toLowerCase();
  const restaurantSubCategory = form.subCategory.toLowerCase();
  const restaurantDeliveryAvailable = getAttributeValue(values, "delivery_available", "deliveryAvailable", "delivery").trim();
  const restaurantServiceType = getAttributeValue(values, "service_type", "serviceType", "service_types").toLowerCase();
  const isCloudKitchenRestaurant = restaurantSubCategory === "cloud kitchen" || restaurantSubCategory === "cloud kitchen / delivery only";
  const isBarsRestaurant = restaurantSubCategory === "bars & beverages";
  const isCateringRestaurant = restaurantSubCategory === "catering" || restaurantSubCategory === "catering services";
  const isFoodTruckRestaurant = restaurantSubCategory === "food trucks & pop-ups";
  const isChildCare = isChildCareSubCategory(form.subCategory);
  const isElderCare = isElderCareSubCategory(form.subCategory);
  const isNursingCare = isNursingCareSubCategory(form.subCategory);
  const isPetCare = isPetCareSubCategory(form.subCategory);
  const isAgencyCare = getAttributeValue(values, "providerType", "provider_type").trim() === "Agency / Company";
  const eventSubCategory = form.subCategory.toLowerCase();
  const isEventsCategory = form.categoryName === "Events & Tickets" || form.categoryName === "Tickets & Events";
  const isVirtualEvent = eventSubCategory === "virtual / online events";
  const isPaidEvent = getAttributeValue(values, "ticket_type", "ticketType").trim() === "Paid";
  const isTwentyOnePlusEvent = getAttributeValue(values, "age_restriction", "ageRestriction").trim() === "21+";
  const isTicketResale = eventSubCategory === "ticket resale & exchange";
  const roommatesSubCategory = form.subCategory.toLowerCase();
  const roommatesDetailCategory = form.detailCategory.toLowerCase();
  const isRoommateWantedListing = roommatesSubCategory === "roommates wanted";
  const isStudentHousingListing = roommatesSubCategory === "student housing";
  const isSubleaseListing = roommatesSubCategory === "sublease & lease transfer";
  const isVacationCorporateListing = roommatesSubCategory === "vacation & corporate housing";
  const isCorporateHousingListing = isVacationCorporateListing && (
    roommatesDetailCategory.includes("corporate") ||
    roommatesDetailCategory.includes("executive") ||
    roommatesDetailCategory.includes("business")
  );
  const isVacationRentalListing = isVacationCorporateListing && roommatesDetailCategory.includes("vacation");
  const jobsWorkMode = getAttributeValue(values, "work_mode", "workMode").trim();
  const jobsEmploymentType = getAttributeValue(values, "employment_type", "employmentType").trim();
  const jobsSubCategory = form.subCategory.toLowerCase();
  const jobsDetailCategory = form.detailCategory.toLowerCase();
  const isRemoteJob = jobsWorkMode === "Remote" || jobsSubCategory === "freelance & remote jobs" || jobsDetailCategory.includes("remote");
  const isHealthcareJob = jobsSubCategory === "healthcare";
  const isDriverJob = jobsDetailCategory.includes("driver") || jobsSubCategory === "logistics & transportation";
  const normalizedElectronicsCondition = electronicsCondition.trim().toLowerCase();
  const electronicsSellerType = getAttributeValue(values, "seller_type", "sellerType").trim();
  const isUsedElectronics = normalizedElectronicsCondition === "used";
  const isDealerElectronics = electronicsSellerType === "Dealer / Retailer" || electronicsSellerType === "Dealer";
  const isShippingElectronics = getAttributeValue(values, "shipping_available", "shippingAvailable", "shipping_available_delivery", "shippingAvailableDelivery").trim() === "Yes";
  const hasElectronicsWarranty = electronicsWarranty.trim() === "Yes";
  const petSubCategory = form.subCategory.toLowerCase();
  const petDetailCategory = form.detailCategory.toLowerCase();
  const isDogPet = petSubCategory === "dogs" || petDetailCategory.includes("dog") || petDetailCategory.includes("pupp");
  const isCatPet = petSubCategory === "cats" || petDetailCategory.includes("cat") || petDetailCategory.includes("kitten");
  const isBirdPet = petSubCategory === "birds" || petDetailCategory.includes("bird") || ["parrots", "cockatiels", "love birds", "canaries", "exotic birds"].includes(petDetailCategory);
  const isFishPet = petSubCategory === "fish & aquariums" || petDetailCategory.includes("fish") || petDetailCategory.includes("aquarium");
  const isLostFoundPet = petSubCategory === "lost & found pets" || petDetailCategory.includes("lost") || petDetailCategory.includes("found") || petDetailCategory.includes("recovery");
  const isPetServiceListing = petSubCategory === "pet services" || petSubCategory === "pet boarding & daycare";

  if (form.categoryName === "Care Services") {
    if (["additional details", "media upload", "reviews & ratings", "listing visibility & promotions"].includes(field.sectionName?.trim().toLowerCase() || "")) {
      return false;
    }

    if (["referencesavailable", "references_available", "ad_duration_days", "addurationdays", "ad_duration"].includes(key)) {
      return false;
    }

    if (!isChildCare && ["childagegroup", "child_age_group", "schoolpickupoption", "school_pickup_option"].includes(key)) {
      return false;
    }

    if (!isElderCare && ["mobilityassistance", "mobility_assistance", "dementiacareexperience", "dementia_care_experience"].includes(key)) {
      return false;
    }

    if (!isPetCare && ["pettypeexperience", "pet_type_experience"].includes(key)) {
      return false;
    }

    if (!isAgencyCare && ["insurance", "insurance_coverage", "staffcount", "staff_count", "businesslogo", "business_logo"].includes(key)) {
      return false;
    }

    if (isPetCare && ["cprcertified", "cpr_certified", "firstaidcertified", "first_aid_certified", "cnacertified", "cna_certified", "rnlpn", "rn_lpn", "licensenumber", "license_number", "certificationdocuments", "certification_documents", "hipaacompliance", "hipaa_compliance", "servicedisclaimer", "service_disclaimer"].includes(key)) {
      return false;
    }

    if (!isNursingCare && ["certificationdocuments", "certification_documents"].includes(key)) {
      return false;
    }
  }

  if (isEventsCategory) {
    if (["price details", "additional details", "listing visibility & promotions"].includes(field.sectionName?.trim().toLowerCase() || "")) {
      return false;
    }

    if (["price", "pricetype", "price_type", "condition", "additionalspecifications", "additional_specifications", "adtype", "ad_type", "boostevent", "boost_event", "sponsoredlisting", "sponsored_listing"].includes(key)) {
      return false;
    }

    if (isVirtualEvent && ["venuename", "venue_name", "fulladdress", "full_address", "maplatlong", "map_lat_long"].includes(key)) {
      return false;
    }

    if (!isVirtualEvent && ["onlinemeetingurl", "online_meeting_url", "streamingplatform", "streaming_platform"].includes(key)) {
      return false;
    }

    if (!isPaidEvent && ["ticketprice", "ticket_price", "paymentgateway", "payment_gateway"].includes(key)) {
      return false;
    }

    if (!isTwentyOnePlusEvent && ["ageverification", "age_verification"].includes(key)) {
      return false;
    }

    if (!isTicketResale && ["originalticketproof", "original_ticket_proof", "transferpolicy", "transfer_policy"].includes(key)) {
      return false;
    }
  }

  if (form.categoryName === "Roommates & Rentals") {
    if (["additional details", "category details", "reviews & ratings"].includes(field.sectionName?.trim().toLowerCase() || "")) {
      return false;
    }

    if (["condition", "additionalspecifications", "additional_specifications", "propertyrating", "property_rating", "landlordrating", "landlord_rating", "roommatereviews", "roommate_reviews"].includes(key) || key.endsWith("details")) {
      return false;
    }

    if (!isRoommateWantedListing && ["preferredgender", "preferred_gender", "preferredoccupation", "preferred_occupation", "preferredagerange", "preferred_age_range", "smokingallowed", "smoking_allowed", "petsallowed", "pets_allowed", "couplesallowed", "couples_allowed"].includes(key)) {
      return false;
    }

    if (!isStudentHousingListing && ["universityname", "university_name", "distancefromcampus", "distance_from_campus", "studentonly", "student_only"].includes(key)) {
      return false;
    }

    if (!isSubleaseListing && ["originalleaseenddate", "original_lease_end_date", "landlordapprovalrequired", "landlord_approval_required"].includes(key)) {
      return false;
    }

    if (!isCorporateHousingListing && ["corporaterates", "corporate_rates", "businesstraveleramenities", "business_traveler_amenities"].includes(key)) {
      return false;
    }

    if (!isVacationRentalListing && ["dailyrate", "daily_rate", "checkindate", "check_in_date", "checkoutdate", "check_out_date", "cleaningfee", "cleaning_fee"].includes(key)) {
      return false;
    }
  }

  if (form.categoryName === "Jobs") {
    if (isRemoteJob && ["detailedofficeaddress", "detailed_office_address"].includes(key)) {
      return false;
    }

    if (!isRemoteJob && ["remoteworkpolicy", "remote_work_policy", "timezonerequirement", "time_zone_requirement"].includes(key)) {
      return false;
    }

    if (jobsEmploymentType !== "Contract" && ["contractduration", "contract_duration", "hourlyrate", "hourly_rate"].includes(key)) {
      return false;
    }

    if (jobsEmploymentType !== "Internship" && !jobsSubCategory.includes("internship") && ["internshipduration", "internship_duration", "collegerequirement", "college_requirement", "stipendinformation", "stipend_information"].includes(key)) {
      return false;
    }

    if (!isHealthcareJob && ["medicallicensenumber", "medical_license_number", "certificationrequirements", "certification_requirements"].includes(key)) {
      return false;
    }

    if (!isDriverJob && ["cdlrequired", "cdl_required", "drivingexperience", "driving_experience", "licenseclass", "license_class"].includes(key)) {
      return false;
    }
  }

  if (isElectronicsCategoryName(form.categoryName)) {
    if (!isUsedElectronics && ["purchasedate", "purchase_date", "usageduration", "usage_duration", "conditionnotes", "condition_notes"].includes(key)) {
      return false;
    }

    if (!isDealerElectronics && ["storename", "store_name", "website"].includes(key)) {
      return false;
    }

    if (!isShippingElectronics && ["deliverycharges", "delivery_charges", "estimateddeliverytime", "estimated_delivery_time"].includes(key)) {
      return false;
    }

    if (!hasElectronicsWarranty && ["manufacturerwarranty", "manufacturer_warranty", "extendedwarranty", "extended_warranty", "warrantyexpirydate", "warranty_expiry_date", "warrantyremainingmonths", "warranty_remaining_months", "warrantycardupload", "warranty_card_upload"].includes(key)) {
      return false;
    }
  }

  if (form.categoryName === "Pets & Animals") {
    if (!isDogPet && ["trainingstatus", "training_status", "exerciserequirements", "exercise_requirements"].includes(key)) {
      return false;
    }

    if (!isCatPet && ["indooroutdoorpreference", "indoor_outdoor_preference", "littertrainedstatus", "litter_trained_status"].includes(key)) {
      return false;
    }

    if (!isBirdPet && ["wingsclipped", "wings_clipped", "cageincluded", "cage_included"].includes(key)) {
      return false;
    }

    if (!isFishPet && ["tanksizerequirement", "tank_size_requirement", "watertype", "water_type"].includes(key)) {
      return false;
    }

    if (!isLostFoundPet && ["lastseenlocation", "last_seen_location", "lastseendate", "last_seen_date", "rewardoffered", "reward_offered", "contacturgency", "contact_urgency"].includes(key)) {
      return false;
    }

    if (!isPetServiceListing && ["servicetype", "service_type", "businesshours", "business_hours", "servicearea", "service_area", "certifications"].includes(key)) {
      return false;
    }
  }

  if (form.categoryName === "Vehicles" && isVehicleService && [
    "brand", "model", "variant", "yearofmanufacture", "year_of_manufacture", "vin", "vehiclecondition", "vehicle_condition",
    "ownershiptypevehicle", "ownership_type_vehicle", "ownercount", "owner_count", "accidenthistory", "accident_history",
    "cleantitle", "clean_title", "fueltype", "fuel_type", "transmission", "drivetype", "drive_type", "kilometersdriven",
    "kilometers_driven", "enginecapacity", "engine_capacity", "horsepower", "color", "interiorcolor", "interior_color",
    "warrantyavailable", "warranty_available", "insuranceincluded", "insurance_included", "extendedwarranty", "extended_warranty",
    "insurance", "insurancevalidtill", "insurance_valid_till", "rcavailable", "rc_available", "pucavailable", "puc_available",
    "servicehistory", "service_history", "loanstatus", "loan_status", "titlestatus", "title_status", "registrationstatus",
    "registration_status", "emissionstestpassed", "emissions_test_passed", "bodytype", "body_type", "seatingcapacity",
    "seating_capacity", "bootspace", "boot_space", "mileage", "bike_type", "biketype", "vehicletype", "vehicle_type",
    "loadcapacity", "load_capacity", "numberofwheels", "number_of_wheels", "permittype", "permit_type", "rentaltype",
    "rental_type", "priceperhour", "price_per_hour", "priceperday", "price_per_day", "securitydepositvehicle",
    "security_deposit_vehicle", "parttype", "part_type", "compatiblemodels", "compatible_models"
  ].includes(key)) {
    return false;
  }

  if (form.categoryName === "Vehicles" && [
    "bodytype", "body_type", "seatingcapacity", "seating_capacity", "bootspace", "boot_space", "mileage",
    "airconditioning", "air_conditioning", "powersteering", "power_steering", "abs", "airbags", "alloywheels",
    "alloy_wheels", "bluetoothgps", "bluetooth_gps", "reversecamera", "reverse_camera", "cruisecontrol",
    "cruise_control", "biketype", "bike_type", "rvtype", "rv_type", "sleepingcapacity", "sleeping_capacity",
    "lengthfeet", "length_feet", "watercrafttype", "watercraft_type", "enginehours", "engine_hours",
    "vehicletype", "vehicle_type", "commercialvehicletype", "commercial_vehicle_type", "numberofwheels",
    "number_of_wheels", "permittype", "permit_type", "priceperhour", "price_per_hour", "registrationyear",
    "registration_year", "registrationstate", "registration_state", "rto", "rcavailable", "rc_available",
    "pucavailable", "puc_available", "servicehistory", "service_history", "loanstatus", "loan_status",
    "insurance", "insurancestatus", "insurance_status", "insurancevalidtill", "insurance_valid_till",
    "itemtype", "item_type", "sizeorcapacity", "size_or_capacity", "manufacturingdate", "manufacturing_date",
    "warranty", "sellertype", "seller_type",
    "adtype", "ad_type", "listingtype", "listing_type", "boostlisting", "boost_listing",
    "sponsoredlisting", "sponsored_listing", "addurationdays", "ad_duration_days", "ad_duration"
  ].includes(key)) {
    return false;
  }

  if (form.categoryName === "Vehicles" && isEvVehicle && ["fueltype", "fuel_type"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Vehicles" && isChargingStation && [
    "brand", "model", "variant", "yearofmanufacture", "year_of_manufacture", "vin", "vehiclecondition", "vehicle_condition",
    "ownershiptypevehicle", "ownership_type_vehicle", "ownercount", "owner_count", "accidenthistory", "accident_history",
    "cleantitle", "clean_title", "transmission", "drivetype", "drive_type", "kilometersdriven", "kilometers_driven",
    "enginecapacity", "engine_capacity", "horsepower", "color", "interiorcolor", "interior_color", "bodytype", "body_type",
    "seatingcapacity", "seating_capacity", "mileage"
  ].includes(key)) {
    return false;
  }

  if (form.categoryName === "Vehicles" && isNewVehicle && ["ownercount", "owner_count", "numberofowners", "number_of_owners", "rcavailable", "rc_available", "pucavailable", "puc_available", "servicehistory", "service_history", "loanstatus", "loan_status"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Vehicles" && !isRental && ["rentaltype", "rental_type", "rentalduration", "rental_duration", "priceperhour", "price_per_hour", "priceperday", "price_per_day", "dailyprice", "daily_price", "priceperhourday", "price_per_hour_day", "securitydepositvehicle", "security_deposit_vehicle"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Vehicles" && isRental && ["price", "listing_price", "totalprice", "total_price", "saleprice", "sale_price", "vehicleprice", "vehicle_price", "pricenegotiable", "price_negotiable", "pricetype", "price_type", "financingavailable", "financing_available", "leaseoption", "lease_option"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Vehicles" && insurance !== "Active" && ["insurancevalidtill", "insurance_valid_till"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Vehicles" && isAccessories && ["brand", "model", "variant", "yearofmanufacture", "year_of_manufacture", "registrationyear", "registration_year", "vin", "vehiclecondition", "vehicle_condition", "ownershiptypevehicle", "ownership_type_vehicle", "fueltype", "fuel_type", "transmission", "drivetype", "drive_type", "kilometersdriven", "kilometers_driven", "kmdriven", "km_driven", "mileage", "ownercount", "owner_count", "numberofowners", "number_of_owners", "accidenthistory", "accident_history", "cleantitle", "clean_title", "insurance", "insurancestatus", "insurance_status", "insurancevalidtill", "insurance_valid_till", "registrationstate", "registration_state", "rto", "color", "interiorcolor", "interior_color", "enginecapacity", "engine_capacity", "horsepower", "rcavailable", "rc_available", "pucavailable", "puc_available", "servicehistory", "service_history", "loanstatus", "loan_status", "titlestatus", "title_status", "registrationstatus", "registration_status", "emissionstestpassed", "emissions_test_passed"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Real Estate" && isPlotRealEstateCategory(form.subCategory, form.detailCategory) && ["bhk", "bathrooms", "balconies", "furnishingtype", "furnishing_type"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Real Estate" && !isRentRealEstateSubCategory(form.subCategory) && ["securitydepositdetail", "security_deposit_detail", "monthlyrentlabel", "monthly_rent_label"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Real Estate" && !isSaleRealEstateSubCategory(form.subCategory) && ["loaneligibledetail", "loan_eligible_detail", "salepricelabel", "sale_price_label"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Restaurants & Food") {
    if (isCloudKitchenRestaurant && ["dinein", "dine_in", "tablebooking", "table_booking", "reservationsaccepted", "reservations_accepted", "reservationcapacity", "reservation_capacity", "onlinebookingurl", "online_booking_url", "parking", "outdoorseating", "outdoor_seating", "privatedining", "private_dining", "baravailable", "bar_available"].includes(key)) {
      return false;
    }

    if (!isCloudKitchenRestaurant && restaurantDeliveryAvailable !== "Yes" && restaurantServiceType !== "delivery" && ["deliveryradius", "delivery_radius", "deliveryfee", "delivery_fee", "minimumordervalue", "minimum_order_value", "estimateddeliverytime", "estimated_delivery_time", "thirdpartyintegration", "third_party_integration"].includes(key)) {
      return false;
    }

    if (!isBarsRestaurant && ["alcohollicense", "alcohol_license", "agerestriction", "age_restriction"].includes(key)) {
      return false;
    }

    if (!isBarsRestaurant && ["happyhours", "happy_hours"].includes(key) && restaurantSubCategory !== "cafe" && restaurantSubCategory !== "cafes & bakeries") {
      return false;
    }

    if (!isCateringRestaurant && restaurantServiceType !== "catering" && ["cateringtype", "catering_type", "minimumguests", "minimum_guests", "maximumguests", "maximum_guests", "perplatepricing", "per_plate_pricing", "eventtypes", "event_types", "eventcapacity", "event_capacity", "cateringpackages", "catering_packages"].includes(key)) {
      return false;
    }

    if (!isFoodTruckRestaurant && ["mobilelocations", "mobile_locations", "operatingzones", "operating_zones"].includes(key)) {
      return false;
    }
  }

  if (isFurnitureCategory(form.categoryName)) {
    const isBed = furnitureDetailCategory.includes("bed") || furnitureDetailCategory.includes("mattress");
    const isLivingRoom = furnitureSubCategory.includes("living") || furnitureDetailCategory.includes("sofa") || furnitureDetailCategory.includes("chair");
    const isDining = furnitureSubCategory.includes("dining") || furnitureDetailCategory.includes("dining");
    const isOffice = furnitureSubCategory.includes("office") || furnitureDetailCategory.includes("desk") || furnitureDetailCategory.includes("office chair");
    const isOutdoor = furnitureSubCategory.includes("outdoor") || furnitureDetailCategory.includes("patio") || furnitureDetailCategory.includes("garden");
    const isDecor = furnitureSubCategory.includes("decor") || ["wall art", "lighting", "rugs", "curtains"].some((item) => furnitureDetailCategory.includes(item));

    if (furnitureCondition === "New" && ["ageofitem", "age_of_item", "age"].includes(key)) {
      return false;
    }

    if (pickupOnly === "Yes" && ["shippingavailable", "shipping_available"].includes(key)) {
      return false;
    }

    if (furnitureDeliveryAvailable !== "Yes" && ["deliverycharges", "delivery_charges"].includes(key)) {
      return false;
    }

    if (!isBed && ["bedsize", "bed_size", "mattressincluded", "mattress_included"].includes(key)) {
      return false;
    }

    if (!isLivingRoom && ["seatingcapacity", "seating_capacity", "upholsterytype", "upholstery_type", "recliner"].includes(key)) {
      return false;
    }

    if (!isDining && ["diningseatingcapacity", "dining_seating_capacity", "tableshape", "table_shape"].includes(key)) {
      return false;
    }

    if (!isOffice && ["desktype", "desk_type", "chairtype", "chair_type", "adjustableheight", "adjustable_height"].includes(key)) {
      return false;
    }

    if (!isOutdoor && ["weatherresistant", "weather_resistant", "outdoorusage", "outdoor_usage"].includes(key)) {
      return false;
    }

    if (!isDecor && ["decortype", "decor_type", "style"].includes(key)) {
      return false;
    }
  }

  return true;
}

function normalizeFieldKey(key: string) {
  return key.replace(/[^a-z0-9_]/gi, "").toLowerCase();
}

function normalizeCategoryName(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

function isChildCareSubCategory(value?: string | null) {
  const subCategory = normalizeCategoryName(value);
  return subCategory.includes("child care") || subCategory.includes("babysitting") || subCategory.includes("nanny");
}

function isElderCareSubCategory(value?: string | null) {
  const subCategory = normalizeCategoryName(value);
  return subCategory.includes("elder care") || subCategory.includes("senior") || subCategory.includes("hospice") || subCategory.includes("palliative");
}

function isNursingCareSubCategory(value?: string | null) {
  return normalizeCategoryName(value).includes("nursing");
}

function isPetCareSubCategory(value?: string | null) {
  return normalizeCategoryName(value).includes("pet care");
}

function mapDynamicFieldDefinition(field: ListingCategoryFieldDefinition): CategoryAttributeField {
  return {
    key: field.fieldKey,
    isRequired: field.isRequired,
    label: field.label,
    sectionName: field.sectionName,
    sectionOrder: field.sectionOrder,
    type: field.fieldType === "dropdown" ? "text" : field.fieldType,
    options: field.fieldType === "dropdown" ? field.options : undefined,
  };
}

function groupCategoryAttributeFields(fields: CategoryAttributeField[], categoryName: string) {
  const sectionMap = new Map<string, { name: string; order: number; fields: CategoryAttributeField[] }>();

  for (const field of fields) {
    const sectionName = field.sectionName?.trim() || `${categoryName} Details`;
    const sectionOrder = field.sectionOrder || 1;
    const section = sectionMap.get(sectionName) || { name: sectionName, order: sectionOrder, fields: [] };
    section.order = Math.min(section.order, sectionOrder);
    section.fields.push(field);
    sectionMap.set(sectionName, section);
  }

  return Array.from(sectionMap.values()).sort((left, right) =>
    left.order - right.order || left.name.localeCompare(right.name)
  );
}

function includeCurrentValue(options: string[], currentValue: string) {
  const dedupedOptions = dedupeStringOptions(options);

  if (!currentValue || dedupedOptions.some((option) => namesMatch(option, currentValue))) {
    return dedupedOptions;
  }

  return [currentValue, ...dedupedOptions];
}

function splitCategoryAttributeValues(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCategoryAttributeInputMin(field: CategoryAttributeField, categoryName: string, values: CategoryAttributes) {
  if (isEventsListingCategory(categoryName) && ["event_end_date", "eventEndDate"].includes(field.key)) {
    return getAttributeValue(values, "event_start_date", "eventStartDate").trim() || undefined;
  }

  if (categoryName === "Roommates & Rentals" && ["security_deposit"].includes(field.key)) {
    return "0";
  }

  if (categoryName === "Roommates & Rentals" && ["bedrooms", "number_of_bedrooms", "bathrooms", "room_size_sqft", "roomSizeSqft", "room_size", "monthly_rent"].includes(field.key)) {
    return "1";
  }

  return undefined;
}

function getCategoryAttributeInputStep(field: CategoryAttributeField, categoryName: string) {
  if (categoryName === "Roommates & Rentals" && ["bedrooms", "number_of_bedrooms"].includes(field.key)) {
    return "0.5";
  }

  return undefined;
}

function isMultiSelectCategoryAttributeField(field: CategoryAttributeField, categoryName: string) {
  if (categoryName === "Care Services" && ["languagesSpoken", "languages_spoken", "availableDays", "available_days", "availableTimeSlots", "available_time_slots"].includes(field.key)) {
    return true;
  }

  if ((categoryName === "Events & Tickets" || categoryName === "Tickets & Events") && ["ticket_categories", "ticketCategories"].includes(field.key)) {
    return true;
  }

  if (categoryName === "Jobs" && ["technical_skills", "technicalSkills", "soft_skills", "softSkills", "required_documents", "requiredDocuments"].includes(field.key)) {
    return true;
  }

  return false;
}

function mergeStringOptions(...optionGroups: string[][]) {
  return dedupeStringOptions(optionGroups.flat());
}

function getFallbackDetailedCategoryOptions(categoryName: string, subCategoryName: string) {
  const fallbackCategory = fallbackListingCategoryTree.find((category) => namesMatch(category.name, categoryName));
  const fallbackSubCategory = fallbackCategory?.subCategories.find((subCategory) => namesMatch(subCategory.name, subCategoryName));
  return fallbackSubCategory?.detailedCategories.map((detailCategory) => detailCategory.name) || [];
}

function dedupeStringOptions(options: string[]) {
  const seen = new Set<string>();

  return options.filter((option) => {
    const key = normalizeLocationName(option);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function dedupeListingCategories(items: ListingCategoryOption[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.name.trim().toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function mergeListingCategoryOptions(fallbackItems: ListingCategoryOption[], apiItems: ListingCategoryOption[]) {
  const apiByName = new Map(apiItems.map((item) => [categoryOptionKey(item.name), item]));
  const fallbackByName = new Map(fallbackItems.map((item) => [categoryOptionKey(item.name), item]));
  const merged = fallbackItems.map((fallbackCategory) => {
    const apiCategory = apiByName.get(categoryOptionKey(fallbackCategory.name));
    return apiCategory ? mergeListingCategoryOption(fallbackCategory, apiCategory) : fallbackCategory;
  });

  for (const apiCategory of apiItems) {
    if (!fallbackByName.has(categoryOptionKey(apiCategory.name))) {
      merged.push(apiCategory);
    }
  }

  return dedupeListingCategories(merged);
}

function mergeListingCategoryOption(fallbackCategory: ListingCategoryOption, apiCategory: ListingCategoryOption): ListingCategoryOption {
  return {
    ...fallbackCategory,
    ...apiCategory,
    subCategories: mergeListingSubCategoryOptions(fallbackCategory.subCategories, apiCategory.subCategories),
  };
}

function mergeListingSubCategoryOptions(fallbackItems: ListingCategoryOption["subCategories"], apiItems: ListingCategoryOption["subCategories"]) {
  const apiByName = new Map(apiItems.map((item) => [categoryOptionKey(item.name), item]));
  const fallbackByName = new Map(fallbackItems.map((item) => [categoryOptionKey(item.name), item]));
  const merged = fallbackItems.map((fallbackSubCategory) => {
    const apiSubCategory = apiByName.get(categoryOptionKey(fallbackSubCategory.name));
    return apiSubCategory ? {
      ...fallbackSubCategory,
      ...apiSubCategory,
      detailedCategories: mergeListingDetailedCategoryOptions(fallbackSubCategory.detailedCategories, apiSubCategory.detailedCategories),
    } : fallbackSubCategory;
  });

  for (const apiSubCategory of apiItems) {
    if (!fallbackByName.has(categoryOptionKey(apiSubCategory.name))) {
      merged.push(apiSubCategory);
    }
  }

  return merged;
}

function mergeListingDetailedCategoryOptions(
  fallbackItems: ListingCategoryOption["subCategories"][number]["detailedCategories"],
  apiItems: ListingCategoryOption["subCategories"][number]["detailedCategories"],
) {
  const apiByName = new Map(apiItems.map((item) => [categoryOptionKey(item.name), item]));
  const fallbackByName = new Map(fallbackItems.map((item) => [categoryOptionKey(item.name), item]));
  const merged = fallbackItems.map((fallbackDetailedCategory) => {
    const apiDetailedCategory = apiByName.get(categoryOptionKey(fallbackDetailedCategory.name));
    return apiDetailedCategory ? { ...fallbackDetailedCategory, ...apiDetailedCategory } : fallbackDetailedCategory;
  });

  for (const apiDetailedCategory of apiItems) {
    if (!fallbackByName.has(categoryOptionKey(apiDetailedCategory.name))) {
      merged.push(apiDetailedCategory);
    }
  }

  return merged;
}

function categoryOptionKey(value: string) {
  return value.trim().toLowerCase();
}

function getClassifiedListingStepIndex(pathname: string) {
  const match = pathname.match(/step-(\d+)/i);
  const stepNumber = match ? Number(match[1]) : 1;
  return Math.min(Math.max(stepNumber - 1, 0), wizardSteps.length - 1);
}

function getClassifiedListingFormPath(step: number, listingId: number | null) {
  if (listingId) {
    return `/dashboard/classifieds/${listingId}/edit/step-${step}`;
  }

  return `/dashboard/classifieds/step-${step}`;
}

function isRealEstateCategory(categoryName: string) {
  return categoryName === "Real Estate";
}

function isFurnitureCategory(categoryName: string) {
  return furnitureCategoryNames.includes(categoryName);
}

function isVehiclePartsSubCategory(subCategory: string) {
  return ["Auto Parts & Accessories", "Spare Parts & Accessories"].includes(subCategory);
}

function isVehicleRentalSubCategory(subCategory: string) {
  return ["Vehicle Rentals", "Rentals"].includes(subCategory);
}

function isVehicleMotorcycleSubCategory(subCategory: string) {
  return ["Motorcycles & Scooters", "Bikes"].includes(subCategory);
}

function isVehicleCommercialSubCategory(subCategory: string) {
  return ["Trucks & Commercial Vehicles", "Commercial Vehicles"].includes(subCategory);
}

function isVehicleServicesSubCategory(subCategory: string) {
  return subCategory === "Services & Repairs";
}

function isVehicleEvSelection(subCategory: string, detailCategory: string) {
  const subCategoryLower = subCategory.toLowerCase();
  const detailCategoryLower = detailCategory.toLowerCase();

  return subCategoryLower.includes("electric vehicles") ||
    detailCategoryLower.includes("electric") ||
    detailCategoryLower.includes("charging station") ||
    detailCategoryLower.includes("ev accessories");
}

function isUsedVehicleCondition(condition: string) {
  return condition === "Used" || condition === "Certified Pre-Owned";
}

function isResidentialRealEstateSubCategory(subCategory: string) {
  return ["Sale", "Rent", "Residential Sale", "Residential Rent", "For Sale", "For Rent", "Vacation Rentals", "New Projects / New Construction"].includes(subCategory);
}

function isCommercialRealEstateSubCategory(subCategory: string) {
  return ["Commercial", "Commercial Sale", "Commercial Rent"].includes(subCategory);
}

function isRentRealEstateSubCategory(subCategory: string) {
  return ["Rent", "Residential Rent", "Commercial Rent", "For Rent", "Vacation Rentals", "PG", "PG / Co-living"].includes(subCategory);
}

function isSaleRealEstateSubCategory(subCategory: string) {
  return ["Sale", "Residential Sale", "Commercial Sale", "For Sale", "New Projects / New Construction"].includes(subCategory);
}

function getRealEstatePriceTypeOptions(subCategory: string) {
  return isSaleRealEstateSubCategory(subCategory)
    ? saleRealEstatePriceTypeOptions
    : defaultRealEstatePriceTypeOptions;
}

function isPlotRealEstateCategory(subCategory: string, detailCategory = "") {
  return ["Plot", "Plots", "Land / Plot", "Land / Plots", "Land", "Lands & Plots"].includes(subCategory) || ["Land / Plot", "Land / Plots", "Commercial Land", "Lands & Plots"].includes(detailCategory);
}

function getListingKind(categoryName: string, subCategory: string, detailCategory: string) {
  if (isRealEstateCategory(categoryName)) {
    if (isPlotRealEstateCategory(subCategory, detailCategory)) return "Plot";
    if (isCommercialRealEstateSubCategory(subCategory)) return "Commercial";
    if (["PG", "PG / Co-living"].includes(subCategory)) return "PG";
    return "Residential";
  }

  if (["Restaurants", "Restaurant", "Restaurants (Dine-In)", "Fast Food", "Fast Food & Takeaway", "Cafes", "Cafe", "Cafes & Bakeries", "Bakery", "Cloud Kitchen", "Cloud Kitchen / Delivery Only", "Catering", "Catering Services", "Bars & Beverages", "Food Trucks & Pop-ups", "Grocery & Specialty Food Stores"].includes(subCategory)) return "Restaurant";
  if (categoryName === "Vehicles") return "Vehicle";
  if (categoryName === "Electronics & Appliances") return "Electronics";
  if (categoryName === "Care Services") return "Care Service";
  if (subCategory === "Job Listings") return "Job";
  if (subCategory === "Freelance Services") return "Service";
  return "Business";
}

function getRequiredDetailFields(subCategory: string, detailCategory: string): Array<[StringFormField, string]> {
  if (isPlotRealEstateCategory(subCategory, detailCategory)) {
    return [["plotArea", "Plot Area"], ["length", "Length"], ["breadth", "Breadth"], ["boundaryWall", "Boundary Wall"], ["facing", "Facing"], ["approvalType", "Approval Type"], ["roadWidth", "Road Width"]];
  }

  if (isResidentialRealEstateSubCategory(subCategory)) {
    return [
      ["propertyType", "Property Type"],
      ["bhk", "BHK"],
      ["bathrooms", "Bathrooms"],
      ["furnishingType", "Furnishing Type"],
      ["superBuiltUpArea", "Super Built-up Area"],
    ];
  }

  if (isCommercialRealEstateSubCategory(subCategory)) {
    return [["propertyType", "Office Type"]];
  }

  if (["PG", "PG / Co-living"].includes(subCategory)) {
    return [["roomType", "Room Type"], ["genderPreference", "Gender Preference"], ["foodIncluded", "Food Included"], ["pgAmenities", "Amenities"]];
  }

  return [];
}

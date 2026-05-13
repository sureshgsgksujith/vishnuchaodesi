import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createListing, getListing, getListingApiErrorMessage, updateListing, type ListingSummary, type UpsertListingPayload } from "../api/listingsApi";
import { getListingCategoryFields, getListingCategoryTree, type ListingCategoryFieldDefinition, type ListingCategoryOption } from "../api/listingCategoriesApi";
import { getMyProfile } from "../api/profileApi";
import { getLocationCities, getLocationCountries, getLocationStates, type CityOption, type CountryOption, type StateOption } from "../../../shared/api/locationMastersApi";
import { lookupPostalCodeLocation } from "../../../shared/api/postalCodeLookup";
import { getAddressPlaceDetail, searchAddressPredictions } from "../../../shared/api/addressAutocompleteApi";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import DashboardFooter from "../components/DashboardFooter";
import { getMyPlanUsage, type PlanUsage } from "../../pricing/api/pricingApi";
import { resolveListingImageUrl } from "../utils/listingImages";
import { labelWithCountryCurrency } from "../../../shared/utils/currency";
import "../styles/listings.css";

const wizardSteps = [
  { title: "Step 1", label: "Basic Info" },
  { title: "Step 2", label: "Business" },
  { title: "Step 3", label: "Links" },
  { title: "Step 4", label: "More Info" },
  { title: "Step 5", label: "Media" },
  { title: "Step 6", label: "Done" },
];

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
  tagline: string;
  cuisine: string;
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
  deliveryAvailable: boolean;
  deliveryFee: string;
  minimumOrderValue: string;
  onlineOrdering: boolean;
  thirdPartyIntegrations: string[];
  amenities: string[];
  foodLicenseNumber: string;
  healthInspectionRating: string;
  alcoholLicenseNumber: string;
  tableBooking: boolean;
  orderNow: boolean;
  enableChat: boolean;
  enableCall: boolean;
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
  type?: "text" | "number" | "date" | "checkbox" | "textarea";
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
  tagline: "",
  cuisine: "",
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
  deliveryAvailable: false,
  deliveryFee: "",
  minimumOrderValue: "",
  onlineOrdering: false,
  thirdPartyIntegrations: [],
  amenities: [],
  foodLicenseNumber: "",
  healthInspectionRating: "",
  alcoholLicenseNumber: "",
  tableBooking: false,
  orderNow: false,
  enableChat: true,
  enableCall: true,
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
  calories: "",
  imageUrl: "",
  displayOrder: "1",
  isAvailable: true,
};

const commonConditionOptions = ["New", "Like New", "Good", "Fair", "Needs Repair"];
const yesNoOptions = ["Yes", "No"];
const vehicleConditionOptions = ["New", "Used"];
const vehicleFuelOptions = ["Petrol", "Diesel", "Electric", "CNG", "Hybrid", "Other"];
const vehicleBrandOptions = ["Maruti Suzuki", "Hyundai", "Honda", "Toyota", "Tata", "Mahindra", "Kia", "MG", "Skoda", "Volkswagen", "Ford", "Renault", "Nissan", "BMW", "Mercedes-Benz", "Audi", "Royal Enfield", "Hero", "Honda Two Wheelers", "Bajaj", "TVS", "Yamaha", "KTM", "Ather", "Ola Electric", "Other"];
const transmissionOptions = ["Manual", "Automatic", "Not Applicable"];
const listingTypeOptions = ["Free", "Featured", "Premium"];

const vehicleCoreFields: CategoryAttributeField[] = [
  { key: "brand", label: "Brand", options: vehicleBrandOptions },
  { key: "model", label: "Model" },
  { key: "variant", label: "Variant" },
  { key: "yearOfManufacture", label: "Year of Manufacture", type: "number" },
  { key: "registrationYear", label: "Registration Year", type: "number" },
  { key: "vehicleCondition", label: "Vehicle Condition", options: vehicleConditionOptions },
  { key: "fuelType", label: "Fuel Type", options: vehicleFuelOptions },
  { key: "transmission", label: "Transmission", options: transmissionOptions },
  { key: "kilometersDriven", label: "KM Driven", type: "number" },
  { key: "ownerCount", label: "Number of Owners", type: "number" },
  { key: "insurance", label: "Insurance", options: ["Active", "Expired"] },
  { key: "insuranceValidTill", label: "Insurance Valid Till", type: "date" },
  { key: "registrationState", label: "Registration State (RTO)" },
  { key: "color", label: "Color" },
];

const categoryAttributeFieldsByCategory: Record<string, CategoryAttributeField[]> = {
  "Real Estate": [
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
  Vehicles: [
    ...vehicleCoreFields,
    { key: "priceNegotiableVehicle", label: "Price Negotiable", options: yesNoOptions },
    { key: "areaLocality", label: "Area / Locality" },
    { key: "mapLatLong", label: "Map Location (lat/long)" },
    { key: "rcAvailable", label: "RC Available", options: yesNoOptions },
    { key: "pucAvailable", label: "Pollution Certificate (PUC)", options: yesNoOptions },
    { key: "serviceHistory", label: "Service History", options: ["Available", "Not Available"] },
    { key: "loanStatus", label: "Loan Status", options: ["Clear", "Active Loan"] },
    { key: "sellerType", label: "Seller Type", options: ["Owner", "Dealer"] },
    { key: "adType", label: "Ad Type", options: listingTypeOptions },
    { key: "adDuration", label: "Ad Duration", options: ["7 days", "15 days", "30 days"] },
  ],
  "Restaurants & Food": [
    { key: "businessType", label: "Business Type", options: ["Individual", "Company", "Franchise"] },
    { key: "yearEstablished", label: "Year Established", type: "number" },
    { key: "staffCount", label: "Number of Staff", type: "number" },
    { key: "serviceType", label: "Service Type", options: ["Dine-in", "Takeaway", "Delivery", "Catering"] },
    { key: "serviceRadius", label: "Service Radius (miles)" },
    { key: "contactPerson", label: "Contact Person" },
    { key: "specialHours", label: "Special Hours", type: "textarea" },
    { key: "open24x7", label: "Open 24/7", options: yesNoOptions },
    { key: "menuItems", label: "Menu Items", type: "textarea" },
    { key: "averageCostForTwo", label: "Average Cost for Two", type: "number" },
    { key: "discountsOffers", label: "Discounts / Offers", type: "textarea" },
    { key: "couponCodes", label: "Coupon Codes" },
    { key: "happyHours", label: "Happy Hours" },
    { key: "deliveryAvailable", label: "Delivery Available", options: yesNoOptions },
    { key: "deliveryFee", label: "Delivery Fee", type: "number" },
    { key: "minimumOrderValue", label: "Minimum Order Value", type: "number" },
    { key: "onlineOrdering", label: "Online Ordering", options: yesNoOptions },
    { key: "thirdPartyIntegration", label: "Third-party Integration" },
    { key: "foodLicenseNumber", label: "Food License Number" },
    { key: "healthInspectionRating", label: "Health Inspection Rating" },
    { key: "alcoholLicense", label: "Alcohol License", options: ["Not Applicable", "Active", "Expired"] },
    { key: "taxId", label: "Tax ID" },
    { key: "enableChat", label: "Enable Chat", options: yesNoOptions },
    { key: "enableCall", label: "Enable Call", options: yesNoOptions },
    { key: "tableBooking", label: "Table Booking", options: yesNoOptions },
    { key: "orderNowButton", label: "Order Now Button", options: yesNoOptions },
  ],
  "Electronics & Appliances": [
    { key: "brand", label: "Brand" },
    { key: "model", label: "Model" },
    { key: "condition", label: "Condition", options: commonConditionOptions },
    { key: "warranty", label: "Warranty", options: ["No Warranty", "Under Warranty", "Extended Warranty"] },
    { key: "purchaseYear", label: "Purchase Year", type: "number" },
    { key: "storage", label: "Storage / Capacity" },
    { key: "ram", label: "RAM" },
    { key: "accessoriesIncluded", label: "Accessories Included" },
  ],
  "Furniture & Home Decor": [
    { key: "itemCondition", label: "Condition", options: commonConditionOptions },
    { key: "material", label: "Material" },
    { key: "color", label: "Color" },
    { key: "dimensions", label: "Dimensions" },
    { key: "age", label: "Age" },
    { key: "assemblyRequired", label: "Assembly Required", options: ["Yes", "No"] },
    { key: "deliveryAvailable", label: "Delivery Available", options: ["Yes", "No"] },
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
    { key: "breed", label: "Breed" },
    { key: "age", label: "Age" },
    { key: "gender", label: "Gender", options: ["Male", "Female", "Unknown"] },
    { key: "vaccinated", label: "Vaccinated", options: ["Yes", "No", "Partial"] },
    { key: "trained", label: "Trained", options: ["Yes", "No", "Partially"] },
    { key: "healthStatus", label: "Health Status" },
    { key: "adoptionOrSale", label: "Posting Type", options: ["For Sale", "Adoption", "Accessories / Feed"] },
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
  "Tickets & Events": [
    { key: "eventOrTravelDate", label: "Event / Travel Date", type: "date" },
    { key: "venueOrFrom", label: "Venue / From" },
    { key: "seatOrRoute", label: "Seat / Route" },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "ticketType", label: "Ticket Type", options: ["Movie", "Concert", "Flight", "Bus", "Train", "Other"] },
    { key: "transferMode", label: "Transfer Mode" },
    { key: "validUntil", label: "Valid Until", type: "date" },
  ],
};

const categoryAttributeFieldSetsByCategory: Record<string, CategoryAttributeFieldSet> = {
  "Real Estate": {
    default: categoryAttributeFieldsByCategory["Real Estate"],
    subCategories: {
      "Residential Sale": [
        ...categoryAttributeFieldsByCategory["Real Estate"],
        { key: "salePriceLabel", label: "Price Type", options: ["Total Price"] },
        { key: "loanEligibleDetail", label: "Loan Eligible", options: yesNoOptions },
      ],
      "Residential Rent": [
        ...categoryAttributeFieldsByCategory["Real Estate"],
        { key: "monthlyRentLabel", label: "Price Type", options: ["Monthly Rent"] },
        { key: "securityDepositDetail", label: "Security Deposit", type: "number" },
      ],
      "Commercial Sale": [
        { key: "commercialPropertyType", label: "Property Type", options: ["Office", "Shop", "Warehouse"] },
        { key: "commercialArea", label: "Area (sq ft)", type: "number" },
        { key: "commercialFurnishing", label: "Furnishing", options: ["Furnished", "Unfurnished"] },
        { key: "washrooms", label: "Washrooms", type: "number" },
        { key: "parkingAvailable", label: "Parking", options: yesNoOptions },
        { key: "suitableFor", label: "Suitable For", options: ["Office", "Retail", "Storage"] },
        { key: "sellerType", label: "Seller Type", options: ["Owner", "Agent", "Builder"] },
      ],
      "Commercial Rent": [
        { key: "commercialPropertyType", label: "Property Type", options: ["Office", "Shop", "Warehouse"] },
        { key: "commercialArea", label: "Area (sq ft)", type: "number" },
        { key: "commercialFurnishing", label: "Furnishing", options: ["Furnished", "Unfurnished"] },
        { key: "washrooms", label: "Washrooms", type: "number" },
        { key: "parkingAvailable", label: "Parking", options: yesNoOptions },
        { key: "suitableFor", label: "Suitable For", options: ["Office", "Retail", "Storage"] },
        { key: "securityDepositDetail", label: "Security Deposit", type: "number" },
        { key: "sellerType", label: "Seller Type", options: ["Owner", "Agent", "Builder"] },
      ],
      "Land / Plots": [
        { key: "plotAreaDetail", label: "Plot Area", type: "number" },
        { key: "lengthDetail", label: "Length", type: "number" },
        { key: "breadthDetail", label: "Breadth", type: "number" },
        { key: "boundaryWallDetail", label: "Boundary Wall", options: yesNoOptions },
        { key: "facingDetail", label: "Facing", options: ["East", "West", "North", "South"] },
        { key: "approvalTypeDetail", label: "Approval Type" },
        { key: "roadWidthDetail", label: "Road Width", type: "number" },
        { key: "ownershipType", label: "Ownership Type", options: ["Freehold", "Leasehold"] },
      ],
      "PG / Co-living": [
        { key: "roomTypeDetail", label: "Room Type", options: ["Single", "Shared"] },
        { key: "genderPreferenceDetail", label: "Gender Preference", options: ["Male", "Female", "Any"] },
        { key: "foodIncludedDetail", label: "Food Included", options: yesNoOptions },
        { key: "pgAmenitiesDetail", label: "Amenities", options: ["WiFi", "Laundry", "AC"] },
      ],
    },
  },
  Vehicles: {
    default: categoryAttributeFieldsByCategory.Vehicles,
    subCategories: {
      Cars: [
        ...vehicleCoreFields,
        { key: "bodyType", label: "Body Type", isRequired: true, options: ["Hatchback", "Sedan", "SUV", "MUV", "Coupe", "Convertible", "Other"] },
        { key: "seatingCapacity", label: "Seating Capacity", isRequired: true, type: "number" },
        { key: "bootSpace", label: "Boot Space" },
        { key: "mileage", label: "Mileage (km/l)" },
        { key: "airConditioning", label: "Air Conditioning", type: "checkbox" },
        { key: "powerSteering", label: "Power Steering", type: "checkbox" },
        { key: "abs", label: "ABS", type: "checkbox" },
        { key: "airbags", label: "Airbags", type: "checkbox" },
        { key: "sunroof", label: "Sunroof", type: "checkbox" },
        { key: "alloyWheels", label: "Alloy Wheels", type: "checkbox" },
        { key: "bluetoothGps", label: "Bluetooth / GPS", type: "checkbox" },
        { key: "reverseCamera", label: "Reverse Camera", type: "checkbox" },
        { key: "cruiseControl", label: "Cruise Control", type: "checkbox" },
      ],
      Bikes: [
        ...vehicleCoreFields,
        { key: "engineCapacity", label: "Engine Capacity (cc)", isRequired: true, type: "number" },
        { key: "mileage", label: "Mileage" },
        { key: "bikeType", label: "Bike Type", isRequired: true, options: ["Sports", "Cruiser", "Scooter", "Commuter", "Electric Bike", "Other"] },
      ],
      "Commercial Vehicles": [
        ...vehicleCoreFields,
        { key: "vehicleType", label: "Vehicle Type", isRequired: true, options: ["Truck", "Bus", "Pickup", "Van", "Tempo", "Tractor", "Other"] },
        { key: "loadCapacity", label: "Load Capacity", isRequired: true, type: "number" },
        { key: "numberOfWheels", label: "Number of Wheels", isRequired: true, type: "number" },
        { key: "permitType", label: "Permit Type", isRequired: true, options: ["National", "State", "Local", "None"] },
      ],
      Rentals: [
        ...vehicleCoreFields,
        { key: "rentalType", label: "Rental Type", isRequired: true, options: ["Self-drive", "With Driver"] },
        { key: "pricePerHour", label: "Price Per Hour", type: "number" },
        { key: "pricePerDay", label: "Price Per Day", type: "number" },
        { key: "securityDepositVehicle", label: "Security Deposit", type: "number" },
      ],
      "Spare Parts & Accessories": [
        { key: "partType", label: "Part Type", isRequired: true, options: ["Tyres", "Battery", "Music System", "Lights", "Engine Parts", "Interior Accessories", "Exterior Accessories", "Other"] },
        { key: "compatibleModels", label: "Compatible Models" },
        { key: "brand", label: "Brand" },
        { key: "condition", label: "Condition", options: vehicleConditionOptions },
        { key: "warranty", label: "Warranty", options: ["No Warranty", "Seller Warranty", "Manufacturer Warranty"] },
      ],
    },
    detailedCategories: {
      "Electric Vehicles": [
        ...vehicleCoreFields,
        { key: "batteryCapacity", label: "Battery Capacity" },
        { key: "rangePerCharge", label: "Range Per Charge" },
        { key: "chargingTime", label: "Charging Time" },
        { key: "kilometersDriven", label: "Kilometers Driven", type: "number" },
        { key: "ownerCount", label: "Owner Count", type: "number" },
      ],
      "Tyres / Batteries": [
        { key: "itemType", label: "Item Type", options: ["Tyre", "Battery"] },
        { key: "sizeOrCapacity", label: "Size / Capacity" },
        { key: "brand", label: "Brand" },
        { key: "manufacturingDate", label: "Manufacturing Date" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
        { key: "warranty", label: "Warranty", options: ["No Warranty", "Seller Warranty", "Manufacturer Warranty"] },
      ],
    },
  },
  "Restaurants & Food": {
    default: categoryAttributeFieldsByCategory["Restaurants & Food"],
    subCategories: {
      Restaurant: categoryAttributeFieldsByCategory["Restaurants & Food"],
      Cafe: categoryAttributeFieldsByCategory["Restaurants & Food"],
      Bakery: [
        ...categoryAttributeFieldsByCategory["Restaurants & Food"],
        { key: "bakerySpecialties", label: "Bakery Specialties", type: "textarea" },
      ],
      "Cloud Kitchen": [
        ...categoryAttributeFieldsByCategory["Restaurants & Food"],
        { key: "deliveryOnly", label: "Delivery Only", options: yesNoOptions },
      ],
      Catering: [
        ...categoryAttributeFieldsByCategory["Restaurants & Food"],
        { key: "eventCapacity", label: "Event Capacity", type: "number" },
        { key: "cateringPackages", label: "Catering Packages", type: "textarea" },
      ],
    },
  },
  "Electronics & Appliances": {
    default: categoryAttributeFieldsByCategory["Electronics & Appliances"],
    subCategories: {
      Mobiles: [
        { key: "brand", label: "Brand" },
        { key: "model", label: "Model" },
        { key: "storage", label: "Storage" },
        { key: "ram", label: "RAM" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
        { key: "warranty", label: "Warranty", options: ["No Warranty", "Under Warranty", "Extended Warranty"] },
        { key: "boxAndCharger", label: "Box / Charger Included" },
      ],
      Computers: [
        { key: "brand", label: "Brand" },
        { key: "model", label: "Model" },
        { key: "processor", label: "Processor" },
        { key: "ram", label: "RAM" },
        { key: "storage", label: "Storage" },
        { key: "screenSize", label: "Screen Size" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
      ],
      "Home Appliances": [
        { key: "brand", label: "Brand" },
        { key: "model", label: "Model" },
        { key: "capacity", label: "Capacity / Size" },
        { key: "energyRating", label: "Energy Rating" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
        { key: "warranty", label: "Warranty", options: ["No Warranty", "Under Warranty", "Extended Warranty"] },
      ],
      Accessories: [
        { key: "brand", label: "Brand" },
        { key: "accessoryType", label: "Accessory Type" },
        { key: "compatibleWith", label: "Compatible With" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
        { key: "warranty", label: "Warranty", options: ["No Warranty", "Under Warranty", "Extended Warranty"] },
      ],
    },
    detailedCategories: {
      Smartphones: [
        { key: "brand", label: "Brand" },
        { key: "model", label: "Model" },
        { key: "storage", label: "Storage" },
        { key: "ram", label: "RAM" },
        { key: "batteryHealth", label: "Battery Health" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
        { key: "boxAndCharger", label: "Box / Charger Included" },
      ],
      "AC / Coolers": [
        { key: "brand", label: "Brand" },
        { key: "type", label: "Type", options: ["Window AC", "Split AC", "Portable AC", "Air Cooler"] },
        { key: "capacity", label: "Capacity" },
        { key: "energyRating", label: "Energy Rating" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
        { key: "installationIncluded", label: "Installation Included", options: ["Yes", "No"] },
      ],
    },
  },
  "Furniture & Home Decor": {
    default: categoryAttributeFieldsByCategory["Furniture & Home Decor"],
    subCategories: {
      "Living Room": [
        { key: "furnitureType", label: "Furniture Type" },
        { key: "seatingCapacity", label: "Seating Capacity" },
        { key: "material", label: "Material" },
        { key: "dimensions", label: "Dimensions" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
      ],
      Bedroom: [
        { key: "furnitureType", label: "Furniture Type" },
        { key: "size", label: "Size" },
        { key: "material", label: "Material" },
        { key: "storageIncluded", label: "Storage Included", options: ["Yes", "No"] },
        { key: "condition", label: "Condition", options: commonConditionOptions },
      ],
      "Office Furniture": [
        { key: "furnitureType", label: "Furniture Type" },
        { key: "ergonomic", label: "Ergonomic", options: ["Yes", "No"] },
        { key: "material", label: "Material" },
        { key: "quantity", label: "Quantity", type: "number" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
      ],
      "Home Decor": [
        { key: "decorType", label: "Decor Type" },
        { key: "material", label: "Material" },
        { key: "color", label: "Color" },
        { key: "dimensions", label: "Dimensions" },
        { key: "condition", label: "Condition", options: commonConditionOptions },
      ],
    },
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
      Dogs: [
        { key: "breed", label: "Breed" },
        { key: "age", label: "Age" },
        { key: "gender", label: "Gender", options: ["Male", "Female"] },
        { key: "vaccinated", label: "Vaccinated", options: ["Yes", "No", "Partial"] },
        { key: "trained", label: "Trained", options: ["Yes", "No", "Partially"] },
      ],
      Cats: [
        { key: "breed", label: "Breed" },
        { key: "age", label: "Age" },
        { key: "gender", label: "Gender", options: ["Male", "Female"] },
        { key: "vaccinated", label: "Vaccinated", options: ["Yes", "No", "Partial"] },
        { key: "neutered", label: "Neutered", options: ["Yes", "No"] },
      ],
      Birds: [
        { key: "birdType", label: "Bird Type" },
        { key: "age", label: "Age" },
        { key: "cageIncluded", label: "Cage Included", options: ["Yes", "No"] },
        { key: "accessoryType", label: "Accessory Type" },
      ],
      "Farm Animals": [
        { key: "animalType", label: "Animal Type" },
        { key: "breed", label: "Breed" },
        { key: "age", label: "Age" },
        { key: "quantity", label: "Quantity", type: "number" },
        { key: "healthStatus", label: "Health Status" },
      ],
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
  "Tickets & Events": {
    default: categoryAttributeFieldsByCategory["Tickets & Events"],
    subCategories: {
      "Event Tickets": [
        { key: "eventName", label: "Event Name" },
        { key: "eventDate", label: "Event Date", type: "date" },
        { key: "venue", label: "Venue" },
        { key: "ticketClass", label: "Ticket Class" },
        { key: "quantity", label: "Quantity", type: "number" },
        { key: "seatNumbers", label: "Seat Numbers" },
      ],
      "Travel Tickets": [
        { key: "travelDate", label: "Travel Date", type: "date" },
        { key: "fromLocation", label: "From" },
        { key: "toLocation", label: "To" },
        { key: "operatorOrAirline", label: "Operator / Airline" },
        { key: "pnrAvailable", label: "PNR Available", options: ["Yes", "No"] },
        { key: "quantity", label: "Quantity", type: "number" },
      ],
    },
    detailedCategories: {
      "Flight Tickets": [
        { key: "travelDate", label: "Travel Date", type: "date" },
        { key: "fromAirport", label: "From Airport" },
        { key: "toAirport", label: "To Airport" },
        { key: "airline", label: "Airline" },
        { key: "ticketClass", label: "Ticket Class", options: ["Economy", "Premium Economy", "Business", "First"] },
        { key: "passengerCount", label: "Passenger Count", type: "number" },
      ],
      "Bus / Train Tickets": [
        { key: "travelDate", label: "Travel Date", type: "date" },
        { key: "fromLocation", label: "From" },
        { key: "toLocation", label: "To" },
        { key: "operatorOrTrain", label: "Operator / Train" },
        { key: "seatOrCoach", label: "Seat / Coach" },
        { key: "passengerCount", label: "Passenger Count", type: "number" },
      ],
    },
  },
};

export default function ListingFormPage() {
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
  const [listingCategories, setListingCategories] = useState<ListingCategoryOption[]>([]);
  const [dynamicCategoryFields, setDynamicCategoryFields] = useState<CategoryAttributeField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [savedListingId, setSavedListingId] = useState<number | null>(null);
  const pricingSaveStartedRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { listingId } = useParams();
  const [searchParams] = useSearchParams();
  const editListingId = numberOrNull(listingId);
  const duplicateListingId = numberOrNull(searchParams.get("duplicate") || undefined);
  const sourceListingId = editListingId || duplicateListingId;
  const isEditMode = Boolean(editListingId);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    let isActive = true;
    getMyPlanUsage()
      .then((usage) => {
        if (isActive) {
          setPlanUsage(usage);
          if (!usage.canCreateListing) {
            setErrorMessage(`Your ${usage.plan.name} has reached the listing limit. Upgrade your plan to add more listings.`);
          }
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [isEditMode]);

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
          setListingCategories(items);
        }
      })
      .catch(() => {
        if (isActive) {
          setListingCategories([]);
        }
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
        setSellerName(storedSellerName);
      });

    return () => {
      isActive = false;
    };
  }, []);

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
        setForm((currentForm) => mapListingToForm(listing, currentForm, !isEditMode));
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
  }, [sourceListingId, isEditMode]);

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
    () => includeCurrentValue(selectedListingSubCategory?.detailedCategories.map((detailCategory) => detailCategory.name) || [], form.detailCategory),
    [selectedListingSubCategory, form.detailCategory],
  );
  const hasDynamicCategoryFields = dynamicCategoryFields.length > 0;
  const hasDynamicPriceField = hasAnyFieldKey(dynamicCategoryFields, "price", "listing_price", "total_price", "monthly_rent", "sale_price");
  const hasDynamicSellerTypeField = hasAnyFieldKey(dynamicCategoryFields, "seller_type", "sellerType");

  useEffect(() => {
    let isActive = true;

    if (!selectedListingCategory?.id) {
      setDynamicCategoryFields([]);
      return () => {
        isActive = false;
      };
    }

    getListingCategoryFields(
      selectedListingCategory.id,
      selectedListingSubCategory?.id,
      selectedListingDetailedCategory?.id,
    )
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
  }, [selectedListingCategory?.id, selectedListingSubCategory?.id, selectedListingDetailedCategory?.id]);

  function updateField(name: StringFormField, value: string) {
    clearFieldError(name);
    setForm((currentForm) => {
      const nextForm = { ...currentForm, [name]: value };

      if (name === "categoryName") {
        nextForm.subCategory = "";
        nextForm.detailCategory = "";
        if (value === "Restaurants & Food" && !nextForm.country) {
          nextForm.country = "United States";
        }
        if (value === "Restaurants & Food" && !["30", "60", "90"].includes(nextForm.adDurationDays)) {
          nextForm.adDurationDays = "30";
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

  const handleAddressPlaceSelect = useCallback((addressDetails: ListingAddressDetails) => {
    setForm((currentForm) => ({
      ...currentForm,
      address: addressDetails.address || currentForm.address,
      pincode: addressDetails.pincode || currentForm.pincode,
      latitude: addressDetails.latitude || currentForm.latitude,
      longitude: addressDetails.longitude || currentForm.longitude,
    }));
  }, []);

  function handleNext(skipValidation = false) {
    if (!skipValidation && !validateStep(currentStep)) {
      return;
    }

    setErrorMessage("");
    setFieldErrors({});
    setCurrentStep((step) => Math.min(step + 1, wizardSteps.length - 1));
  }

  function handlePrevious() {
    setErrorMessage("");
    setFieldErrors({});
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function validateStep(step: number) {
    if (step !== 0) {
      return true;
    }

    const nextFieldErrors: FieldErrors = {};
    const addFieldError = (name: string, message: string) => {
      if (!nextFieldErrors[name]) {
        nextFieldErrors[name] = message;
      }
    };

    const requiredFields: Array<[StringFormField, string]> = [
      ["title", "Ad Title"],
      ["country", "Country"],
      ["state", "State"],
      ["city", "City"],
      ["address", "Address"],
      ["pincode", "Pincode"],
      ["mobileNumber", "Mobile Number"],
      ["sellerType", "Seller Type"],
      ["categoryName", "Category"],
      ["subCategory", "Sub Category"],
      ["businessDescription", "Business Description"],
    ];

    if (detailCategoryOptions.length) {
      requiredFields.splice(5, 0, ["detailCategory", "Detailed Category"]);
    }

    requiredFields.forEach(([name, label]) => {
      if (!form[name].trim()) {
        addFieldError(name, `${label} is required.`);
      }
    });

    if (!sellerName.trim()) {
      addFieldError("sellerName", "Name is required.");
    }

    if (form.businessDescription.trim() && form.businessDescription.trim().length < 50) {
      addFieldError("businessDescription", "Business Description must be at least 50 characters.");
    }

    if (!hasDynamicCategoryFields && form.categoryName === "Restaurants & Food" && !validateRestaurantFields()) {
      return false;
    }

    if (!hasDynamicCategoryFields && form.categoryName === "Vehicles" && !validateVehicleFields()) {
      return false;
    }

    const missingDetailField = hasDynamicCategoryFields
      ? undefined
      : getRequiredDetailFields(form.subCategory, form.detailCategory).find(([name]) => !form[name].trim());

    if (missingDetailField) {
      addFieldError(missingDetailField[0], `${missingDetailField[1]} is required.`);
    }

    if (!hasDynamicCategoryFields && form.availabilityType === "Date" && !form.availabilityDate.trim()) {
      addFieldError("availabilityDate", "Availability Date is required.");
    }

    if (!hasDynamicCategoryFields && isRealEstateCategory(form.categoryName) && !form.price.trim()) {
      addFieldError("price", isRentRealEstateSubCategory(form.subCategory) ? "Monthly Rent is required." : "Total Price is required.");
    }

    if (!hasDynamicCategoryFields && isRentRealEstateSubCategory(form.subCategory) && (!form.securityDeposit.trim() || !form.maintenanceCharges.trim())) {
      if (!form.securityDeposit.trim()) {
        addFieldError("securityDeposit", "Security Deposit is required.");
      }
      if (!form.maintenanceCharges.trim()) {
        addFieldError("maintenanceCharges", "Maintenance Charges are required.");
      }
    }

    dynamicCategoryFields
      .filter((field) => shouldShowCategoryAttributeField(field, categoryAttributes, form))
      .forEach((field) => {
      if (field.isRequired && isMissingRequiredCategoryValue(field, categoryAttributes[field.key])) {
        addFieldError(categoryFieldErrorKey(field.key), `${field.label} is required.`);
      }
    });

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setErrorMessage("");
      return false;
    }

    setFieldErrors({});
    return true;
  }

  function validateRestaurantFields() {
    const year = numberOrNull(restaurantInfo.yearEstablished);

    if (!restaurantInfo.restaurantName.trim()) {
      setErrorMessage("Restaurant / Business Name is required.");
      return false;
    }

    if (!restaurantInfo.cuisine.trim()) {
      setErrorMessage("Cuisine Type is required.");
      return false;
    }

    if (!restaurantInfo.businessType.trim()) {
      setErrorMessage("Business Type is required.");
      return false;
    }

    if (!year || year < 1800 || year > new Date().getFullYear()) {
      setErrorMessage("Year Established should be a valid year.");
      return false;
    }

    if (!restaurantInfo.serviceTypes.length) {
      setErrorMessage("At least one Service Type is required.");
      return false;
    }

    if (!/^\d{5}(-\d{4})?$/.test(form.pincode.trim())) {
      setErrorMessage("ZIP Code should be a valid US ZIP format.");
      return false;
    }

    if ((restaurantInfo.serviceTypes.includes("Delivery") || restaurantInfo.serviceTypes.includes("Catering") || form.subCategory === "Cloud Kitchen") && !restaurantInfo.serviceRadiusMiles.trim()) {
      setErrorMessage("Service Radius is required for delivery, catering, and cloud kitchen listings.");
      return false;
    }

    if (restaurantInfo.deliveryAvailable && (!restaurantInfo.deliveryFee.trim() || !restaurantInfo.minimumOrderValue.trim())) {
      setErrorMessage("Delivery Fee and Minimum Order Value are required when delivery is available.");
      return false;
    }

    if (form.subCategory === "Bars & Beverages" && !restaurantInfo.alcoholLicenseNumber.trim()) {
      setErrorMessage("Alcohol License Number is required for Bars & Beverages.");
      return false;
    }

    const filledMenuItems = restaurantMenuItems.filter((item) => item.itemName.trim() || item.menuCategory.trim() || item.price.trim());
    const invalidMenuItem = filledMenuItems.find((item) => !item.itemName.trim() || !item.menuCategory.trim() || !item.foodType.trim() || numberOrNull(item.price) === null);
    if (invalidMenuItem) {
      setErrorMessage("Each menu item needs Item Name, Menu Category, Price, and Food Type.");
      return false;
    }

    const invalidHours = businessHours.find((hour) => hour.status !== "Closed" && !hour.is24Hours && (!hour.open || !hour.close));
    if (invalidHours) {
      setErrorMessage(`${invalidHours.day} opening and closing time are required unless open 24/7.`);
      return false;
    }

    return true;
  }

  function validateVehicleFields() {
    const isAccessories = form.subCategory === "Spare Parts & Accessories";
    const isRental = form.subCategory === "Rentals";
    const condition = getAttributeValue(categoryAttributes, "vehicleCondition", "vehicle_condition", "condition");
    const fuelType = getAttributeValue(categoryAttributes, "fuelType", "fuel_type");

    const requiredFields = isAccessories
      ? [
          ["partType", "part_type", "Part Type"],
          ["compatibleModels", "compatible_models", "Compatible Models"],
          ["condition", "partCondition", "part_condition", "Condition"],
        ]
      : [
          ["brand", "Brand"],
          ["model", "Model"],
          ["yearOfManufacture", "year_of_manufacture", "Year of Manufacture"],
          ["vehicleCondition", "vehicle_condition", "Vehicle Condition"],
          ["fuelType", "fuel_type", "Fuel Type"],
          ["color", "Color"],
        ];

    const missing = requiredFields.find((field) => !getAttributeValue(categoryAttributes, ...field.slice(0, -1)).trim());
    if (missing) {
      setErrorMessage(`${missing[missing.length - 1]} is required.`);
      return false;
    }

    if (condition === "Used") {
      const usedMissing = [
        ["registrationYear", "registration_year", "Registration Year"],
        ["kilometersDriven", "kilometers_driven", "kmDriven", "km_driven", "KM Driven"],
        ["ownerCount", "owner_count", "numberOfOwners", "number_of_owners", "Number of Owners"],
        ["rcAvailable", "rc_available", "RC Available"],
        ["loanStatus", "loan_status", "Loan Status"],
      ].find((field) => !getAttributeValue(categoryAttributes, ...field.slice(0, -1)).trim());

      if (usedMissing) {
        setErrorMessage(`${usedMissing[usedMissing.length - 1]} is required for used vehicles.`);
        return false;
      }

      if (fuelType && !["Electric", "Other"].includes(fuelType) && !getAttributeValue(categoryAttributes, "pucAvailable", "puc_available").trim()) {
        setErrorMessage("PUC is required for used fuel-based vehicles.");
        return false;
      }
    }

    if (getAttributeValue(categoryAttributes, "insurance", "insuranceStatus", "insurance_status") === "Active" &&
      !getAttributeValue(categoryAttributes, "insuranceValidTill", "insurance_valid_till").trim()) {
      setErrorMessage("Insurance Valid Till is required when Insurance is Active.");
      return false;
    }

    if (form.subCategory === "Cars") {
      if (!getAttributeValue(categoryAttributes, "bodyType", "body_type").trim() || !getAttributeValue(categoryAttributes, "seatingCapacity", "seating_capacity").trim()) {
        setErrorMessage("Body Type and Seating Capacity are required for Cars.");
        return false;
      }
    }

    if (form.subCategory === "Bikes") {
      if (!getAttributeValue(categoryAttributes, "engineCapacity", "engine_capacity").trim() || !getAttributeValue(categoryAttributes, "bikeType", "bike_type").trim()) {
        setErrorMessage("Engine Capacity and Bike Type are required for Bikes.");
        return false;
      }
    }

    if (form.subCategory === "Commercial Vehicles") {
      const commercialMissing = [
        ["vehicleType", "vehicle_type", "Vehicle Type"],
        ["loadCapacity", "load_capacity", "Load Capacity"],
        ["numberOfWheels", "number_of_wheels", "Number of Wheels"],
        ["permitType", "permit_type", "Permit Type"],
      ].find((field) => !getAttributeValue(categoryAttributes, ...field.slice(0, -1)).trim());

      if (commercialMissing) {
        setErrorMessage(`${commercialMissing[commercialMissing.length - 1]} is required for Commercial Vehicles.`);
        return false;
      }
    }

    if (isRental) {
      if (!getAttributeValue(categoryAttributes, "rentalType", "rental_type").trim()) {
        setErrorMessage("Rental Type is required for Rentals.");
        return false;
      }

      if (!getAttributeValue(categoryAttributes, "pricePerHour", "price_per_hour").trim() && !getAttributeValue(categoryAttributes, "pricePerDay", "price_per_day").trim()) {
        setErrorMessage("At least one of Price Per Hour or Price Per Day is required.");
        return false;
      }
    } else if (!form.price.trim()) {
      setErrorMessage("Price is required for vehicle sale listings.");
      return false;
    }

    return true;
  }

  function validateMedia() {
    if (!isRealEstateCategory(form.categoryName) && form.categoryName !== "Vehicles") {
      return true;
    }

    const imageCount = [
      form.profileImageName,
      form.coverImageName,
      ...form.galleryMedia,
    ].filter((value) => value.trim() && !isVideoValue(value)).length;

    if (imageCount < 3 || imageCount > 15) {
      setErrorMessage(`${form.categoryName} listings require minimum 3 and maximum 15 images.`);
      return false;
    }

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

    if (!isEditMode && planUsage && !planUsage.canCreateListing) {
      setErrorMessage(`Your ${planUsage.plan.name} has reached the listing limit. Upgrade your plan to add more listings.`);
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
      );
      const galleryMarkers = new Set(draft.form.galleryMedia);
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
      setCurrentStep(5);
      return true;
    } catch (error) {
      setErrorMessage(getListingApiErrorMessage(error));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFinish() {
    if (!validateStep(0)) {
      setCurrentStep(0);
      return;
    }

    if (!validateMedia()) {
      setCurrentStep(4);
      return;
    }

    if (isEditMode) {
      await saveListing();
      return;
    }

    navigate("/pricing-details", {
      state: {
        pendingListingDraft: getListingDraft(),
        returnTo: "/dashboard/listings/new",
      },
    });
  }

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
              <span className="steps">{wizardSteps[currentStep].title}</span>
              {errorMessage ? <div className="alert alert-danger listing-form-alert">{errorMessage}</div> : null}
              {editLockedMessage ? <div className="listing-form-locked">{editLockedMessage}</div> : null}

              {currentStep === 0 ? (
                <div className="log">
                  <div className="login">
                    <h4>{isEditMode ? "Edit Listing" : "Listing Details"}</h4>
                    <form className="listing_form_1" noValidate>
                      <Input
                        placeholder={form.categoryName === "Restaurants & Food" ? "Contact Person*" : "Listing Name*"}
                        value={sellerName}
                        error={fieldErrors.sellerName}
                        onChange={(value) => {
                          clearFieldError("sellerName");
                          setSellerName(value);
                        }}
                      />
                      <div className="row">
                        <InputColumn placeholder="Phone number" value={form.mobileNumber} error={fieldErrors.mobileNumber} onChange={(value) => updateField("mobileNumber", value)} />
                        <InputColumn placeholder="Email Id" type="email" value={form.email} error={fieldErrors.email} onChange={(value) => updateField("email", value)} />
                      </div>
                      {isRealEstateCategory(form.categoryName) && !hasDynamicSellerTypeField ? (
                        <>
                          <Select placeholder="Seller Type*" value={form.sellerType} error={fieldErrors.sellerType} options={["Owner", "Agent", "Builder"]} onChange={(value) => updateField("sellerType", value)} />
                          <div className="row">
                            <InputColumn placeholder="RERA Number" value={form.reraNumber} onChange={(value) => updateField("reraNumber", value)} />
                            <SelectColumn placeholder="Ownership Type" value={form.ownershipType} options={["Freehold", "Leasehold"]} onChange={(value) => updateField("ownershipType", value)} />
                          </div>
                        </>
                      ) : null}
                      {form.categoryName === "Vehicles" && !hasDynamicSellerTypeField ? (
                        <Select placeholder="Seller Type*" value={form.sellerType} error={fieldErrors.sellerType} options={["Owner", "Dealer"]} onChange={(value) => updateField("sellerType", value)} />
                      ) : null}
                      <Select placeholder="Select Country*" value={form.country} error={fieldErrors.country} options={countries.map((country) => country.name)} onChange={updateCountry} />
                      <Select placeholder="Select State*" value={form.state} error={fieldErrors.state} options={states.map((state) => state.name)} onChange={updateState} disabled={!form.country} />
                      <Select placeholder="Select City*" value={form.city} error={fieldErrors.city} options={cities.map((city) => city.name)} onChange={updateCity} disabled={!form.state} />
                      <AddressAutocompleteInput
                        placeholder="Listing address*"
                        value={form.address}
                        error={fieldErrors.address}
                        country={form.country}
                        state={form.state}
                        city={form.city}
                        onChange={(value) => updateField("address", value)}
                        onPlaceSelect={handleAddressPlaceSelect}
                      />
                      <Input placeholder="Zip code" value={form.pincode} error={fieldErrors.pincode} onChange={(value) => updateField("pincode", value)} />
                      <div className="row">
                        <InputColumn placeholder="Google Map Latitude" type="number" value={form.latitude} onChange={(value) => updateField("latitude", value)} />
                        <InputColumn placeholder="Google Map Longitude" type="number" value={form.longitude} onChange={(value) => updateField("longitude", value)} />
                      </div>
                      <Select placeholder="Select Category" value={form.categoryName} error={fieldErrors.categoryName} options={categoryOptions} onChange={(value) => updateField("categoryName", value)} />
                      <Select
                        placeholder="Select Sub Category"
                        value={form.subCategory}
                        error={fieldErrors.subCategory}
                        options={subCategoryOptions}
                        onChange={(value) => updateField("subCategory", value)}
                        disabled={!form.categoryName}
                      />
                      <Select
                        placeholder="Select Detailed Category"
                        value={form.detailCategory}
                        error={fieldErrors.detailCategory}
                        options={detailCategoryOptions}
                        onChange={(value) => updateField("detailCategory", value)}
                        disabled={!form.subCategory || !detailCategoryOptions.length}
                      />
                      <Input placeholder="Add title" value={form.title} error={fieldErrors.title} onChange={(value) => updateField("title", value)} />
                      {isRealEstateCategory(form.categoryName) && !hasDynamicCategoryFields ? (
                        <>
                          <DetailCategoryFields form={form} updateField={updateField} />
                          <PriceAndAmenitiesFields
                            form={form}
                            currencyCountry={currencyCountry}
                            updateField={updateField}
                            updateBooleanField={(name, value) => setForm((currentForm) => ({ ...currentForm, [name]: value }))}
                          />
                        </>
                      ) : null}
                      {form.categoryName === "Restaurants & Food" && !hasDynamicCategoryFields ? (
                        <>
                          <RestaurantInfoFields
                            form={form}
                            currencyCountry={currencyCountry}
                            restaurantInfo={restaurantInfo}
                            menuItems={restaurantMenuItems}
                            onChange={setRestaurantInfo}
                            onMenuItemsChange={setRestaurantMenuItems}
                          />
                        </>
                      ) : null}
                      {form.categoryName && !hasDynamicPriceField && !isRealEstateCategory(form.categoryName) && form.categoryName !== "Restaurants & Food" && !(form.categoryName === "Vehicles" && form.subCategory === "Rentals") ? (
                        <ListingPriceFields form={form} currencyCountry={currencyCountry} updateField={updateField} />
                      ) : null}
                      {form.categoryName ? (
                        <CategoryAttributesFields
                          categoryName={form.categoryName}
                          subCategory={form.subCategory}
                          detailCategory={form.detailCategory}
                          form={form}
                          currencyCountry={currencyCountry}
                          dynamicFields={dynamicCategoryFields}
                          values={categoryAttributes}
                          fieldErrors={fieldErrors}
                          onChange={updateCategoryAttributes}
                        />
                      ) : null}
                      <h4>Business Details</h4>
                      <div className="row">
                        <div className="col-md-12">
                          <div className="form-group">
                            <label>Business Description *</label>
                            <textarea
                              name="business_description"
                              className="form-control"
                              placeholder="Describe your business"
                              value={form.businessDescription}
                              onChange={(event) => updateField("businessDescription", event.target.value)}
                            />
                            <FieldError message={fieldErrors.businessDescription} />
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <TemplateImageColumn
                          label="Choose profile image"
                          value={form.profileImageName}
                          onFileChange={(file) => {
                            setProfileImageFile(file);
                            updateField("profileImageName", file ? profileImageUploadMarker : "");
                          }}
                        />
                        <TemplateImageColumn
                          label="Choose cover image"
                          value={form.coverImageName}
                          onFileChange={(file) => {
                            setCoverImageFile(file);
                            updateField("coverImageName", file ? coverImageUploadMarker : "");
                          }}
                        />
                      </div>
                      <Textarea
                        placeholder="Enter your service location"
                        value={form.serviceLocations}
                        onChange={(value) => updateField("serviceLocations", value)}
                      />
                      <StepNavigation
                        isFirst
                        onCancel={() => navigate("/dashboard/all-listing")}
                        onNext={() => handleNext()}
                        progress={20}
                      />
                    </form>
                  </div>
                </div>
              ) : null}

              {currentStep === 1 ? (
                <div className="log">
                  <div className="login">
                    <h4>Business Details</h4>
                    <form className="listing_form_2" noValidate>
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
                          />
                        </li>
                      </ul>
                      <StepNavigation onPrevious={handlePrevious} onNext={() => handleNext(true)} onSkip={() => handleNext(true)} progress={40} />
                    </form>
                  </div>
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div className="log">
                  <div className="login add-list-off">
                    <form className="listing_form_3" noValidate>
                      <ul>
                        <li>
                          <WebLinksFields webLinks={webLinks} onChange={setWebLinks} />
                        </li>
                        <li>
                          <SocialLinksFields socialLinks={socialLinks} onChange={setSocialLinks} />
                        </li>
                      </ul>
                      <StepNavigation onPrevious={handlePrevious} onNext={() => handleNext(true)} onSkip={() => handleNext(true)} progress={60} />
                    </form>
                  </div>
                </div>
              ) : null}

              {currentStep === 3 ? (
                <div className="log add-list-map">
                  <div className="login add-list-off">
                    <form className="listing_form_4" noValidate>
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
                      <StepNavigation onPrevious={handlePrevious} onNext={() => handleNext(true)} onSkip={() => handleNext(true)} progress={80} />
                    </form>
                  </div>
                </div>
              ) : null}

              {currentStep === 4 ? (
                <div className="log">
                  <div className="login add-lis-oth">
                    <form className="listing_form" noValidate>
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

              {currentStep === 5 ? (
                <div className="log">
                  <div className="login add-lis-done">
                    <h4>Success</h4>
                    <p>Your listing has been submitted successfully.</p>
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
                          target="_blank"
                          to={savedListingId ? `/dashboard/listings/${savedListingId}/preview` : "/dashboard/all-listing"}
                          className="btn btn-primary"
                        >
                          Listing preview
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

function AddressAutocompleteInput({
  placeholder,
  value,
  error,
  country,
  state,
  city,
  onChange,
  onPlaceSelect,
}: FieldProps & {
  country: string;
  state: string;
  city: string;
  onPlaceSelect: (addressDetails: ListingAddressDetails) => void;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const query = value.trim();

    if (query.length < 3 || !country.trim() || !state.trim() || !city.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      searchAddressSuggestions({
        query,
        country,
        state,
        city,
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
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [city, country, state, value]);

  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    setIsLoading(true);
    try {
      const details = suggestion.placeId
        ? await getAddressPlaceDetail(suggestion.placeId)
        : null;

      onPlaceSelect({
        address: details?.formattedAddress || suggestion.address,
        pincode: details?.postalCode || suggestion.pincode,
        latitude: details?.latitude != null ? String(details.latitude) : suggestion.latitude,
        longitude: details?.longitude != null ? String(details.longitude) : suggestion.longitude,
      });
    } catch {
      onPlaceSelect({
        address: suggestion.address,
        pincode: suggestion.pincode,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
      });
    } finally {
      setIsLoading(false);
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const helperText = !country || !state || !city
    ? "Select country, state, and city before searching address."
    : isLoading
      ? "Searching..."
      : "";

  return (
    <div className="row">
      <div className="col-md-12">
        <div className="form-group listing-address-autocomplete">
          <input
            className={`form-control${error ? " is-invalid" : ""}`}
            type="text"
            value={value}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => {
              if (suggestions.length) setIsOpen(true);
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
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelectSuggestion(suggestion)}
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
  signal,
}: {
  query: string;
  country: string;
  state: string;
  city: string;
  signal: AbortSignal;
}) {
  const googleSuggestions = await searchGoogleAddressSuggestions({ query, country, state, city, signal });
  if (googleSuggestions.length) {
    return googleSuggestions;
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    limit: "8",
    q: `${query}, ${city}, ${state}, ${country}`,
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
  return (cityResults.length ? cityResults : results).map(mapAddressSuggestion);
}

async function searchGoogleAddressSuggestions({
  query,
  country,
  state,
  city,
  signal,
}: {
  query: string;
  country: string;
  state: string;
  city: string;
  signal: AbortSignal;
}) {
  try {
    const predictions = await searchAddressPredictions(query, country, state, city, signal);
    return predictions.map((item) => ({
      id: item.placeId,
      placeId: item.placeId,
      title: item.description.split(",")[0] || item.description,
      subtitle: item.description,
      address: item.description,
      pincode: "",
      latitude: "",
      longitude: "",
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

type AddressSuggestion = {
  id: string;
  placeId?: string;
  title: string;
  subtitle: string;
  address: string;
  pincode: string;
  latitude: string;
  longitude: string;
};

type NominatimAddressResult = {
  place_id: number | string;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: {
    postcode?: string;
    road?: string;
    suburb?: string;
  };
};

function InputColumn({ placeholder, value, onChange, error, type = "text", width = "col-md-6", readOnly = false }: FieldProps & { type?: string; width?: string; readOnly?: boolean }) {
  return (
    <div className={width}>
      <div className="form-group">
        <input className={`form-control${error ? " is-invalid" : ""}`} type={type} value={value} placeholder={placeholder} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} />
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
  return (
    <div className={width}>
      <div className="form-group">
        <label>{label}</label>
        <input className="form-control" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

function SelectColumn({ placeholder, value, options, onChange, error, width = "col-md-6", disabled = false }: FieldProps & { options: string[]; width?: string; disabled?: boolean }) {
  return (
    <div className={width}>
      <div className="form-group">
        <select className={`chosen-select form-control${error ? " is-invalid" : ""}`} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
          <option value="">{placeholder}</option>
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
  const inputId = `listing-checkbox-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="form-group listing-checkbox-field">
      <div className="chbox">
        <input id={inputId} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <label htmlFor={inputId}>{label}</label>
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
          <textarea className={`form-control${error ? " is-invalid" : ""}`} value={value} rows={4} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
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
          <select className={`chosen-select form-control${error ? " is-invalid" : ""}`} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
            <option value="">{placeholder}</option>
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
  onChange,
}: {
  categoryName: string;
  subCategory: string;
  detailCategory: string;
  form: FormState;
  currencyCountry: string;
  dynamicFields: CategoryAttributeField[];
  values: CategoryAttributes;
  fieldErrors: FieldErrors;
  onChange: (value: CategoryAttributes) => void;
}) {
  const baseFields = dynamicFields.length
    ? dynamicFields
    : getCategoryAttributeFields(categoryName, subCategory, detailCategory);
  const fields = baseFields.filter((field) => shouldShowCategoryAttributeField(field, values, form));
  const sections = groupCategoryAttributeFields(fields, categoryName);

  if (!fields.length) {
    return null;
  }

  function updateAttribute(key: string, value: string) {
    onChange({ ...values, [key]: value });
  }

  return (
    <>
      {sections.map((section) => (
        <div key={section.name}>
          <h5 className="mt-3 mb-3">{section.name}</h5>
          <div className="row">
            {section.fields.map((field) => {
              const displayLabel = labelWithCountryCurrency(field.isRequired ? `${field.label}*` : field.label, currencyCountry);
              const error = fieldErrors[categoryFieldErrorKey(field.key)];

              return field.options?.length ? (
                <SelectColumn
                  key={field.key}
                  placeholder={displayLabel}
                  value={values[field.key] || ""}
                  error={error}
                  options={field.options}
                  onChange={(value) => updateAttribute(field.key, value)}
                />
              ) : (
                field.type === "textarea" ? (
                  <div className="col-md-12" key={field.key}>
                    <div className="form-group">
                      <textarea
                        className={`form-control${error ? " is-invalid" : ""}`}
                        placeholder={displayLabel}
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
                      label={displayLabel}
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
                    onChange={(value) => updateAttribute(field.key, value)}
                  />
                )
              );
            })}
          </div>
        </div>
      ))}
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
  if (!form.detailCategory) {
    return null;
  }

  if (isResidentialRealEstateSubCategory(form.subCategory)) {
    return (
      <>
        <h5 className="mt-3 mb-3">Residential Details</h5>
        <Select placeholder="Property Type*" value={form.propertyType || form.detailCategory} options={includeCurrentValue(["Apartment", "Villa", "House"], form.detailCategory)} onChange={(value) => updateField("propertyType", value)} />
        <div className="row">
          <SelectColumn placeholder="BHK*" value={form.bhk} options={["1", "2", "3", "4+"]} onChange={(value) => updateField("bhk", value)} />
          <InputColumn placeholder="Bathrooms*" type="number" value={form.bathrooms} onChange={(value) => updateField("bathrooms", value)} />
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
          <SelectColumn placeholder="Property Age*" value={form.propertyAge} options={["New", "Less than 1 year", "1-5 years", "5+ years"]} onChange={(value) => updateField("propertyAge", value)} />
          <SelectColumn placeholder="Facing*" value={form.facing} options={["East", "West", "North", "South"]} onChange={(value) => updateField("facing", value)} />
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

  if (isPlotRealEstateSubCategory(form.subCategory)) {
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

  if (isCommercialRealEstateSubCategory(form.subCategory)) {
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

  if (["PG", "PG / Co-living"].includes(form.subCategory)) {
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
  updateField,
}: {
  form: FormState;
  currencyCountry: string;
  updateField: (name: StringFormField, value: string) => void;
}) {
  return (
    <>
      <h5 className="mt-3 mb-3">Price Details</h5>
      <div className="row">
        <InputColumn placeholder={labelWithCountryCurrency("Price", currencyCountry)} type="number" value={form.price} onChange={(value) => updateField("price", value)} />
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
  const isPlot = isPlotRealEstateSubCategory(form.subCategory);
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

function TemplateImageColumn({
  label,
  value,
  onFileChange,
}: {
  label: string;
  value: string;
  onFileChange: (file: File | null) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!value || value.startsWith("__")) {
      return;
    }

    setPreviewUrl(resolveListingImageUrl(value));
  }, [value]);

  function handleFileChange(files: FileList | null) {
    const file = files?.[0] || null;
    onFileChange(file);

    if (!file) {
      setPreviewUrl("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  return (
    <div className="col-md-6">
      <div className="form-group">
        <label>{label}</label>
        <div className="img-uplo-flex">
          <input
            type="file"
            accept="image/*,.jpg,.jpeg,.png"
            className="form-control file-input"
            onChange={(event) => handleFileChange(event.target.files)}
          />
          <img className="img-preview" src={previewUrl} alt="" />
        </div>
      </div>
    </div>
  );
}

function GalleryMediaEditor({
  files,
  items,
  onChange,
  onFilesChange,
}: {
  files: GalleryUploadFile[];
  items: string[];
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
    <div>
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
        className="imageuploadify well listing-gallery-uploader"
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
  form,
  currencyCountry,
  restaurantInfo,
  menuItems,
  onChange,
  onMenuItemsChange,
}: {
  form: FormState;
  currencyCountry: string;
  restaurantInfo: RestaurantInfo;
  menuItems: RestaurantMenuItem[];
  onChange: (value: RestaurantInfo) => void;
  onMenuItemsChange: (value: RestaurantMenuItem[]) => void;
}) {
  const showDeliveryFields = restaurantInfo.deliveryAvailable || restaurantInfo.serviceTypes.includes("Delivery") || form.subCategory === "Cloud Kitchen";
  const showAlcohol = form.subCategory === "Bars & Beverages";
  const showDineIn = restaurantInfo.serviceTypes.includes("Dine-in") && form.subCategory !== "Cloud Kitchen";
  const showCatering = restaurantInfo.serviceTypes.includes("Catering") || form.subCategory === "Catering";

  function toggleRestaurantList(key: "serviceTypes" | "thirdPartyIntegrations" | "amenities", value: string, checked: boolean) {
    const currentValues = restaurantInfo[key];
    onChange({ ...restaurantInfo, [key]: checked ? [...currentValues, value] : currentValues.filter((item) => item !== value) });
  }

  function updateMenuItem(index: number, value: RestaurantMenuItem) {
    onMenuItemsChange(updateArrayItem(menuItems, index, value));
  }

  return (
    <>
      <h5 className="mt-3 mb-3">Restaurant Info</h5>
      <div className="row">
        <InputColumn placeholder="Restaurant / Business Name*" value={restaurantInfo.restaurantName} onChange={(value) => onChange({ ...restaurantInfo, restaurantName: value })} />
        <InputColumn placeholder="Tagline" value={restaurantInfo.tagline} onChange={(value) => onChange({ ...restaurantInfo, tagline: value })} />
      </div>
      <div className="row">
        <SelectColumn placeholder="Cuisine Type*" value={restaurantInfo.cuisine} options={["Indian", "Chinese", "Italian", "Mexican", "American", "Thai", "Mediterranean", "Bakery", "Desserts", "Beverages", "Multi-cuisine", "Other"]} onChange={(value) => onChange({ ...restaurantInfo, cuisine: value })} />
        <SelectColumn placeholder="Business Type*" value={restaurantInfo.businessType} options={["Individual", "Company", "Franchise"]} onChange={(value) => onChange({ ...restaurantInfo, businessType: value })} />
      </div>
      <div className="row">
        <InputColumn placeholder="Year Established*" type="number" value={restaurantInfo.yearEstablished} onChange={(value) => onChange({ ...restaurantInfo, yearEstablished: value })} />
        <InputColumn placeholder="Number of Staff" type="number" value={restaurantInfo.staffCount} onChange={(value) => onChange({ ...restaurantInfo, staffCount: value })} />
      </div>
      <MultiSelectCheckboxes title="Service Types" options={["Dine-in", "Takeaway", "Delivery", "Catering"]} selected={restaurantInfo.serviceTypes} onChange={(value, checked) => toggleRestaurantList("serviceTypes", value, checked)} />
      {(showDeliveryFields || showCatering) ? (
        <Input placeholder="Service Radius in miles*" type="number" value={restaurantInfo.serviceRadiusMiles} onChange={(value) => onChange({ ...restaurantInfo, serviceRadiusMiles: value })} />
      ) : null}

      <h5 className="mt-3 mb-3">Menu Management</h5>
      {menuItems.map((item, index) => (
        <ListingSectionCard title={`Menu Item ${index + 1}`} key={index}>
          <div className="row">
            <InputColumn placeholder="Item Name*" value={item.itemName} onChange={(value) => updateMenuItem(index, { ...item, itemName: value })} />
            <SelectColumn placeholder="Menu Category*" value={item.menuCategory} options={["Starters", "Main Course", "Desserts", "Beverages", "Specials", "Combo", "Other"]} onChange={(value) => updateMenuItem(index, { ...item, menuCategory: value })} />
          </div>
          <Textarea placeholder="Description" value={item.description} onChange={(value) => updateMenuItem(index, { ...item, description: value })} />
          <div className="row">
            <InputColumn placeholder={labelWithCountryCurrency("Price*", currencyCountry)} type="number" value={item.price} onChange={(value) => updateMenuItem(index, { ...item, price: value })} />
            <SelectColumn placeholder="Food Type*" value={item.foodType} options={["Veg", "Non-Veg", "Vegan"]} onChange={(value) => updateMenuItem(index, { ...item, foodType: value })} />
          </div>
          <div className="row">
            <InputColumn placeholder="Calories" type="number" value={item.calories} onChange={(value) => updateMenuItem(index, { ...item, calories: value })} />
            <InputColumn placeholder="Image URL" value={item.imageUrl} onChange={(value) => updateMenuItem(index, { ...item, imageUrl: value })} />
          </div>
          <CheckboxField label="Available" checked={item.isAvailable} onChange={(value) => updateMenuItem(index, { ...item, isAvailable: value })} />
          {menuItems.length > 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => onMenuItemsChange(menuItems.filter((_, itemIndex) => itemIndex !== index))}>Remove Item</button>
          ) : null}
        </ListingSectionCard>
      ))}
      <button type="button" className="btn btn-primary" onClick={() => onMenuItemsChange([...menuItems, { ...initialRestaurantMenuItem, displayOrder: String(menuItems.length + 1) }])}>Add Menu Item</button>

      <h5 className="mt-3 mb-3">Pricing & Offers</h5>
      <div className="row">
        <InputColumn placeholder={labelWithCountryCurrency("Average Cost for Two", currencyCountry)} type="number" value={restaurantInfo.averageCostForTwo} onChange={(value) => onChange({ ...restaurantInfo, averageCostForTwo: value })} />
        <InputColumn placeholder="Coupon Codes" value={restaurantInfo.couponCodes} onChange={(value) => onChange({ ...restaurantInfo, couponCodes: value })} />
      </div>
      <Textarea placeholder="Discounts / Offers" value={restaurantInfo.discountsOffers} onChange={(value) => onChange({ ...restaurantInfo, discountsOffers: value })} />
      {showAlcohol ? (
        <>
          <Input placeholder="Happy Hours" value={restaurantInfo.happyHours} onChange={(value) => onChange({ ...restaurantInfo, happyHours: value })} />
          <Input placeholder="Age-restricted notice" value={restaurantInfo.ageRestrictedNotice} onChange={(value) => onChange({ ...restaurantInfo, ageRestrictedNotice: value })} />
        </>
      ) : null}

      <h5 className="mt-3 mb-3">Delivery & Ordering</h5>
      <CheckboxField label="Delivery Available" checked={restaurantInfo.deliveryAvailable} onChange={(value) => onChange({ ...restaurantInfo, deliveryAvailable: value })} />
      {showDeliveryFields ? (
        <div className="row">
          <InputColumn placeholder={labelWithCountryCurrency("Delivery Fee", currencyCountry)} type="number" value={restaurantInfo.deliveryFee} onChange={(value) => onChange({ ...restaurantInfo, deliveryFee: value })} />
          <InputColumn placeholder={labelWithCountryCurrency("Minimum Order Value", currencyCountry)} type="number" value={restaurantInfo.minimumOrderValue} onChange={(value) => onChange({ ...restaurantInfo, minimumOrderValue: value })} />
        </div>
      ) : null}
      <CheckboxField label="Online Ordering" checked={restaurantInfo.onlineOrdering} onChange={(value) => onChange({ ...restaurantInfo, onlineOrdering: value })} />
      {restaurantInfo.onlineOrdering ? (
        <MultiSelectCheckboxes title="Third-party Integrations" options={["Uber Eats", "DoorDash", "Grubhub", "Postmates", "Other"]} selected={restaurantInfo.thirdPartyIntegrations} onChange={(value, checked) => toggleRestaurantList("thirdPartyIntegrations", value, checked)} />
      ) : null}

      <MultiSelectCheckboxes title="Amenities & Features" options={["WiFi", "Parking", ...(form.subCategory === "Cloud Kitchen" ? [] : ["Outdoor Seating"]), "Live Music", "Family Friendly", "Pet Friendly", "Wheelchair Accessible / ADA Compliance"]} selected={restaurantInfo.amenities} onChange={(value, checked) => toggleRestaurantList("amenities", value, checked)} />

      <h5 className="mt-3 mb-3">Compliance</h5>
      <Input placeholder="Food License Number" value={restaurantInfo.foodLicenseNumber} onChange={(value) => onChange({ ...restaurantInfo, foodLicenseNumber: value })} />
      <div className="row">
        <InputColumn placeholder="Health Inspection Rating" value={restaurantInfo.healthInspectionRating} onChange={(value) => onChange({ ...restaurantInfo, healthInspectionRating: value })} />
        {showAlcohol ? <InputColumn placeholder="Alcohol License Number*" value={restaurantInfo.alcoholLicenseNumber} onChange={(value) => onChange({ ...restaurantInfo, alcoholLicenseNumber: value })} /> : null}
      </div>

      <h5 className="mt-3 mb-3">Lead & Interaction</h5>
      <div className="row listing-amenity-row">
        <div className="col-md-6">
          <CheckboxField label="Enable Chat" checked={restaurantInfo.enableChat} onChange={(value) => onChange({ ...restaurantInfo, enableChat: value })} />
          <CheckboxField label="Enable Call" checked={restaurantInfo.enableCall} onChange={(value) => onChange({ ...restaurantInfo, enableCall: value })} />
        </div>
        <div className="col-md-6">
          {showDineIn ? <CheckboxField label="Table Booking" checked={restaurantInfo.tableBooking} onChange={(value) => onChange({ ...restaurantInfo, tableBooking: value })} /> : null}
          <CheckboxField label="Order Now Button" checked={restaurantInfo.orderNow} onChange={(value) => onChange({ ...restaurantInfo, orderNow: value })} />
        </div>
      </div>
      {showCatering ? <Textarea placeholder="Bulk order notes" value={restaurantInfo.bulkOrderNotes} onChange={(value) => onChange({ ...restaurantInfo, bulkOrderNotes: value })} /> : null}
      {form.subCategory === "Bakery" ? <Textarea placeholder="Custom cake / order options" value={restaurantInfo.customOrderOptions} onChange={(value) => onChange({ ...restaurantInfo, customOrderOptions: value })} /> : null}
      {form.subCategory === "Food Trucks & Pop-ups" ? <Textarea placeholder="Event / pop-up location notes" value={restaurantInfo.eventLocationNotes} onChange={(value) => onChange({ ...restaurantInfo, eventLocationNotes: value })} /> : null}
    </>
  );
}

function MultiSelectCheckboxes({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: string[];
  selected: string[];
  onChange: (value: string, checked: boolean) => void;
}) {
  return (
    <>
      <h5 className="mt-3 mb-3">{title}</h5>
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
}: {
  hours: BusinessHour[];
  onChange: (value: BusinessHour[]) => void;
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
    <ListingSectionCard title="Business Hours">
      <div className="listing-hours-tools">
        <div className="listing-hours-bulk">
          <div className="listing-hours-bulk-row">
            <div className="listing-hours-bulk-fields">
              <select className="form-control" value={bulkHour.status} onChange={(event) => setBulkHour((value) => ({ ...value, status: event.target.value }))}>
                <option>Open</option>
                <option>Closed</option>
              </select>
              <input type="time" className="form-control" value={bulkHour.open} disabled={bulkHour.status === "Closed"} onChange={(event) => setBulkHour((value) => ({ ...value, open: event.target.value }))} />
              <input type="time" className="form-control" value={bulkHour.close} disabled={bulkHour.status === "Closed"} onChange={(event) => setBulkHour((value) => ({ ...value, close: event.target.value }))} />
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
            <div>
              <select className="form-control" value={hour.status} onChange={(event) => updateHour(index, { ...hour, status: event.target.value })}>
                <option>Open</option>
                <option>Closed</option>
              </select>
            </div>
            <div>
              <input type="time" className="form-control" value={hour.open} disabled={hour.status === "Closed" || hour.is24Hours} onChange={(event) => updateHour(index, { ...hour, open: event.target.value })} />
            </div>
            <div>
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
}: {
  contactInfo: ContactInfo;
  country: string;
  fallbackState: string;
  fallbackCity: string;
  onChange: (value: ContactInfo) => void;
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
      <ListingSectionCard title="Address" className="listing-address-card">
        <AddressAutocompleteInput
          placeholder="Street Address"
          value={contactInfo.streetAddress}
          country={country}
          state={searchState}
          city={searchCity}
          onChange={(value) => onChange({ ...contactInfo, streetAddress: value })}
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
      </ListingSectionCard>
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
        <label>{label}</label>
        <input className="form-control" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
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
  progress,
}: {
  isFirst?: boolean;
  onCancel?: () => void;
  onPrevious?: () => void;
  onNext: () => void;
  onSkip?: () => void;
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
          <button type="button" className="btn btn-primary" onClick={onNext}>Next</button>
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
): UpsertListingPayload {
  const listingDescription = form.description.trim() || form.businessDescription.trim();
  const businessDescription = form.businessDescription.trim() || form.description.trim();
  const listingPrice =
    numberAttribute(categoryAttributes, "price", "listing_price", "total_price", "monthly_rent", "sale_price", "vehicle_price") ??
    numberOrNull(form.price) ??
    numberOrNull(offers[0]?.price) ??
    0;
  const priceNegotiableValue = getAttributeValue(categoryAttributes, "price_negotiable", "priceNegotiable", "price_type").trim();
  const adDurationDays =
    numberAttribute(categoryAttributes, "ad_duration_days", "adDurationDays", "ad_duration") ??
    numberOrNull(form.adDurationDays) ??
    30;
  const sellerType = getAttributeValue(categoryAttributes, "seller_type", "sellerType").trim() || form.sellerType.trim();
  const restaurantServiceTypes = splitAttributeList(categoryAttributes, "service_type", "service_types", "serviceTypes");
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
    title: form.title.trim(),
    description: listingDescription,
    categoryName: form.categoryName.trim(),
    subCategory: form.subCategory.trim(),
    detailCategory: form.detailCategory.trim() || form.subCategory.trim(),
    propertyDetails: {
      listingKind: getListingKind(form.subCategory, form.detailCategory),
      propertyType: form.propertyType.trim() || getAttributeValue(categoryAttributes, "property_type", "propertyType", "commercial_property_type", "commercialPropertyType").trim() || form.detailCategory.trim(),
      bhk: form.bhk.trim() || getAttributeValue(categoryAttributes, "bhk").trim(),
      bathrooms: numberOrNull(form.bathrooms) ?? numberAttribute(categoryAttributes, "bathrooms"),
      balconies: numberOrNull(form.balconies) ?? numberAttribute(categoryAttributes, "balconies"),
      furnishingType: form.furnishingType.trim() || getAttributeValue(categoryAttributes, "furnishing_type", "furnishingType", "commercial_furnishing").trim(),
      superBuiltUpArea: numberOrNull(form.superBuiltUpArea) ?? numberAttribute(categoryAttributes, "super_built_up_area", "superBuiltUpArea"),
      carpetArea: numberOrNull(form.carpetArea) ?? numberAttribute(categoryAttributes, "carpet_area", "carpetArea"),
      floorNumber: numberOrNull(form.floorNumber) ?? numberAttribute(categoryAttributes, "floor_number", "floorNumber"),
      totalFloors: numberOrNull(form.totalFloors) ?? numberAttribute(categoryAttributes, "total_floors", "totalFloors"),
      propertyAge: form.propertyAge.trim() || getAttributeValue(categoryAttributes, "property_age", "propertyAge").trim(),
      facing: form.facing.trim() || getAttributeValue(categoryAttributes, "facing", "facing_detail").trim(),
      availability: form.availabilityType.trim() || getAttributeValue(categoryAttributes, "availability", "availability_type").trim(),
      availabilityDate: form.availabilityDate.trim() || getAttributeValue(categoryAttributes, "availability_date", "availabilityDate").trim() || null,
      plotArea: numberOrNull(form.plotArea) ?? numberAttribute(categoryAttributes, "plot_area", "plot_area_detail", "plotArea"),
      length: numberOrNull(form.length) ?? numberAttribute(categoryAttributes, "length", "length_detail"),
      breadth: numberOrNull(form.breadth) ?? numberAttribute(categoryAttributes, "breadth", "breadth_detail"),
      boundaryWall: boolOrNull(form.boundaryWall) ?? boolAttribute(categoryAttributes, "boundary_wall", "boundary_wall_detail", "boundaryWall"),
      approvalType: form.approvalType.trim() || getAttributeValue(categoryAttributes, "approval_type", "approval_type_detail", "approvalType").trim(),
      roadWidth: numberOrNull(form.roadWidth) ?? numberAttribute(categoryAttributes, "road_width", "road_width_detail", "roadWidth"),
      area: numberOrNull(form.area) ?? numberAttribute(categoryAttributes, "area", "commercial_area"),
      washrooms: numberOrNull(form.washrooms) ?? numberAttribute(categoryAttributes, "washrooms"),
      parking: boolOrNull(form.parking) ?? boolAttribute(categoryAttributes, "parking", "parking_available"),
      suitableFor: form.suitableFor.trim() || getAttributeValue(categoryAttributes, "suitable_for", "suitableFor").trim(),
      roomType: form.roomType.trim() || getAttributeValue(categoryAttributes, "room_type", "room_type_detail", "roomType").trim(),
      genderPreference: form.genderPreference.trim() || getAttributeValue(categoryAttributes, "gender_preference", "gender_preference_detail", "genderPreference").trim(),
      foodIncluded: form.foodIncluded ? form.foodIncluded === "Yes" : boolAttribute(categoryAttributes, "food_included", "food_included_detail", "foodIncluded"),
      pgAmenities: form.pgAmenities.trim() || getAttributeValue(categoryAttributes, "pg_amenities", "pg_amenities_detail", "pgAmenities").trim(),
      services: JSON.stringify(services.filter((item) => item.name.trim())),
      offers: JSON.stringify(offers.filter((item) => item.name.trim() || item.price.trim() || item.detail.trim())),
      otherInformation: JSON.stringify({
        items: infoItems.filter((item) => item.question.trim() || item.answer.trim()),
        categoryAttributes: trimCategoryAttributes(categoryAttributes),
      }),
      businessDescription,
      businessHours: JSON.stringify(businessHours.filter((item) => item.status || item.open || item.close)),
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
      priceNegotiable: priceNegotiableValue ? priceNegotiableValue !== "Fixed" : form.priceNegotiable !== "Fixed",
      maintenanceCharges: numberOrNull(form.maintenanceCharges) ?? numberAttribute(categoryAttributes, "maintenance_charges", "maintenanceCharges"),
      securityDeposit: numberOrNull(form.securityDeposit) ?? numberAttribute(categoryAttributes, "security_deposit", "security_deposit_detail", "security_deposit_vehicle", "securityDeposit"),
      loanEligible: form.loanEligible || boolAttribute(categoryAttributes, "loan_eligible", "loan_eligible_detail", "loanEligible") === true,
      pricePerSqFt: numberOrNull(form.pricePerSqFt) ?? numberAttribute(categoryAttributes, "price_per_sq_ft", "pricePerSqFt"),
    },
    locationDetails: {
      countryId: form.countryId,
      stateId: form.stateId,
      cityId: form.cityId,
      country: form.country.trim(),
      state: form.state.trim(),
      city: form.city.trim(),
      locality: form.address.trim(),
      landmark: form.serviceLocations.trim(),
      pincode: form.pincode.trim(),
      latitude: numberOrNull(form.latitude),
      longitude: numberOrNull(form.longitude),
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
      videoUrl: form.listingVideo.trim() || form.galleryMedia.find(isVideoValue) || "",
      logoUrl: form.profileImageName.trim(),
      coverBannerUrl: form.coverImageName.trim(),
    },
    sellerInformation: {
      name: sellerName.trim() || form.title.trim(),
      mobileNumber: form.mobileNumber.trim(),
      email: form.email.trim(),
      whatsAppNumber: form.whatsapp.trim(),
      websiteUrl: form.website.trim(),
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
    },
    restaurantFoodDetails: {
      businessName: restaurantInfo.restaurantName.trim() || getAttributeValue(categoryAttributes, "business_name", "restaurant_name", "restaurantName").trim() || form.title.trim(),
      tagline: restaurantInfo.tagline.trim(),
      cuisineType: restaurantInfo.cuisine.trim() || getAttributeValue(categoryAttributes, "cuisine_type", "cuisine").trim(),
      businessType: restaurantInfo.businessType.trim() || getAttributeValue(categoryAttributes, "business_type", "businessType").trim(),
      yearEstablished: numberOrNull(restaurantInfo.yearEstablished) ?? numberAttribute(categoryAttributes, "year_established", "yearEstablished"),
      numberOfStaff: numberOrNull(restaurantInfo.staffCount) ?? numberAttribute(categoryAttributes, "staff_count", "staffCount"),
      serviceTypes: restaurantInfo.serviceTypes.length ? restaurantInfo.serviceTypes : restaurantServiceTypes,
      serviceRadiusMiles: numberOrNull(restaurantInfo.serviceRadiusMiles) ?? numberAttribute(categoryAttributes, "service_radius", "service_radius_miles", "serviceRadiusMiles"),
      instagramUrl: socialLinks.instagram.trim(),
      facebookUrl: socialLinks.facebook.trim(),
      twitterUrl: socialLinks.twitter.trim(),
      youTubeUrl: socialLinks.youtube.trim(),
      averageCostForTwo: numberOrNull(restaurantInfo.averageCostForTwo) ?? numberAttribute(categoryAttributes, "average_cost_for_two", "averageCostForTwo"),
      discountsOffers: restaurantInfo.discountsOffers.trim() || getAttributeValue(categoryAttributes, "discounts_offers", "discountsOffers").trim(),
      couponCodes: restaurantInfo.couponCodes.trim() || getAttributeValue(categoryAttributes, "coupon_codes", "couponCodes").trim(),
      happyHours: restaurantInfo.happyHours.trim() || getAttributeValue(categoryAttributes, "happy_hours", "happyHours").trim(),
      deliveryAvailable: restaurantInfo.deliveryAvailable || boolAttribute(categoryAttributes, "delivery_available", "deliveryAvailable") === true,
      deliveryFee: numberOrNull(restaurantInfo.deliveryFee) ?? numberAttribute(categoryAttributes, "delivery_fee", "deliveryFee"),
      minimumOrderValue: numberOrNull(restaurantInfo.minimumOrderValue) ?? numberAttribute(categoryAttributes, "minimum_order_value", "minimumOrderValue"),
      onlineOrderingAvailable: restaurantInfo.onlineOrdering || boolAttribute(categoryAttributes, "online_ordering", "onlineOrdering") === true,
      thirdPartyIntegrations: restaurantInfo.thirdPartyIntegrations.length ? restaurantInfo.thirdPartyIntegrations : splitAttributeList(categoryAttributes, "third_party_integration", "third_party_integrations"),
      amenities: restaurantInfo.amenities.length ? restaurantInfo.amenities : restaurantAmenities,
      foodLicenseNumber: restaurantInfo.foodLicenseNumber.trim() || getAttributeValue(categoryAttributes, "food_license_number", "foodLicenseNumber").trim(),
      healthInspectionRating: restaurantInfo.healthInspectionRating.trim() || getAttributeValue(categoryAttributes, "health_inspection_rating", "healthInspectionRating").trim(),
      alcoholLicenseNumber: restaurantInfo.alcoholLicenseNumber.trim() || getAttributeValue(categoryAttributes, "alcohol_license_number", "alcohol_license", "alcoholLicenseNumber").trim(),
      tableBookingEnabled: restaurantInfo.tableBooking || boolAttribute(categoryAttributes, "table_booking", "tableBooking") === true,
      orderNowEnabled: restaurantInfo.orderNow || boolAttribute(categoryAttributes, "order_now_button", "orderNow") === true,
      enableChat: restaurantInfo.enableChat && boolAttribute(categoryAttributes, "enable_chat", "enableChat") !== false,
      enableCall: restaurantInfo.enableCall && boolAttribute(categoryAttributes, "enable_call", "enableCall") !== false,
      bulkOrderNotes: restaurantInfo.bulkOrderNotes.trim() || getAttributeValue(categoryAttributes, "bulk_order_notes", "bulkOrderNotes").trim(),
      customOrderOptions: restaurantInfo.customOrderOptions.trim() || getAttributeValue(categoryAttributes, "custom_order_options", "customOrderOptions").trim(),
      eventLocationNotes: restaurantInfo.eventLocationNotes.trim() || getAttributeValue(categoryAttributes, "event_location_notes", "eventLocationNotes").trim(),
      ageRestrictedNotice: restaurantInfo.ageRestrictedNotice.trim() || getAttributeValue(categoryAttributes, "age_restricted_notice", "ageRestrictedNotice").trim(),
    },
    vehicleDetails: {
      brand: getAttributeValue(categoryAttributes, "brand").trim(),
      model: getAttributeValue(categoryAttributes, "model").trim(),
      variant: getAttributeValue(categoryAttributes, "variant").trim(),
      yearOfManufacture: numberAttribute(categoryAttributes, "yearOfManufacture", "year_of_manufacture"),
      registrationYear: numberAttribute(categoryAttributes, "registrationYear", "registration_year"),
      vehicleCondition: getAttributeValue(categoryAttributes, "vehicleCondition", "vehicle_condition", "condition").trim(),
      fuelType: getAttributeValue(categoryAttributes, "fuelType", "fuel_type").trim(),
      transmission: getAttributeValue(categoryAttributes, "transmission").trim(),
      kmDriven: numberAttribute(categoryAttributes, "kilometersDriven", "kilometers_driven", "kmDriven", "km_driven"),
      numberOfOwners: numberAttribute(categoryAttributes, "ownerCount", "owner_count", "numberOfOwners", "number_of_owners"),
      insuranceStatus: getAttributeValue(categoryAttributes, "insurance", "insuranceStatus", "insurance_status").trim(),
      insuranceValidTill: getAttributeValue(categoryAttributes, "insuranceValidTill", "insurance_valid_till").trim() || null,
      registrationState: getAttributeValue(categoryAttributes, "registrationState", "registration_state").trim(),
      rto: getAttributeValue(categoryAttributes, "rto").trim(),
      color: getAttributeValue(categoryAttributes, "color").trim(),
      bodyType: getAttributeValue(categoryAttributes, "bodyType", "body_type").trim(),
      seatingCapacity: numberAttribute(categoryAttributes, "seatingCapacity", "seating_capacity"),
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
      pricePerDay: numberAttribute(categoryAttributes, "pricePerDay", "price_per_day"),
      securityDeposit: numberAttribute(categoryAttributes, "securityDepositVehicle", "security_deposit_vehicle"),
      partType: getAttributeValue(categoryAttributes, "partType", "part_type", "itemType", "item_type").trim(),
      compatibleModels: getAttributeValue(categoryAttributes, "compatibleModels", "compatible_models").trim(),
      partCondition: getAttributeValue(categoryAttributes, "partCondition", "part_condition", "condition").trim(),
      rcAvailable: boolAttribute(categoryAttributes, "rcAvailable", "rc_available"),
      pucAvailable: boolAttribute(categoryAttributes, "pucAvailable", "puc_available"),
      serviceHistoryStatus: getAttributeValue(categoryAttributes, "serviceHistory", "service_history", "serviceHistoryStatus", "service_history_status").trim(),
      loanStatus: getAttributeValue(categoryAttributes, "loanStatus", "loan_status").trim(),
      features: vehicleFeatureValues(categoryAttributes),
    },
    restaurantMenuItems: restaurantMenuItems
      .filter((item) => item.itemName.trim() || item.menuCategory.trim() || item.price.trim())
      .map((item, index) => ({
        itemName: item.itemName.trim(),
        menuCategory: item.menuCategory.trim(),
        description: item.description.trim(),
        price: numberOrNull(item.price) ?? 0,
        foodType: item.foodType.trim(),
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

function mapListingToForm(listing: ListingSummary, currentForm: FormState, isDuplicate: boolean): FormState {
  const propertyDetails = listing.propertyDetails || {};
  const priceDetails = listing.priceDetails || {};
  const locationDetails = listing.locationDetails || {};
  const amenities = listing.amenities || {};
  const sellerInformation = listing.sellerInformation || {};
  const settings = listing.settings || {};
  const imageUrls = listing.imageUrls || [];
  const [profileImageName = "", coverImageName = "", ...galleryMedia] = imageUrls;

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
    categoryName: listing.categoryName || "",
    subCategory: listing.subCategory || "",
    detailCategory: listing.detailCategory || "",
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
    sellerType: stringValue(sellerInformation.sellerType) || "Owner",
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
    restaurantName: stringValue(restaurantDetails.businessName) || legacyInfo.restaurantName,
    tagline: stringValue(restaurantDetails.tagline) || legacyInfo.tagline,
    cuisine: stringValue(restaurantDetails.cuisineType) || legacyInfo.cuisine,
    businessType: stringValue(restaurantDetails.businessType),
    yearEstablished: stringValue(restaurantDetails.yearEstablished),
    staffCount: stringValue(restaurantDetails.numberOfStaff),
    serviceTypes: Array.isArray(restaurantDetails.serviceTypes) ? restaurantDetails.serviceTypes.map(String) : [],
    serviceRadiusMiles: stringValue(restaurantDetails.serviceRadiusMiles),
    averageCostForTwo: stringValue(restaurantDetails.averageCostForTwo),
    discountsOffers: stringValue(restaurantDetails.discountsOffers),
    couponCodes: stringValue(restaurantDetails.couponCodes),
    happyHours: stringValue(restaurantDetails.happyHours),
    deliveryAvailable: restaurantDetails.deliveryAvailable === true,
    deliveryFee: stringValue(restaurantDetails.deliveryFee),
    minimumOrderValue: stringValue(restaurantDetails.minimumOrderValue),
    onlineOrdering: restaurantDetails.onlineOrderingAvailable === true,
    thirdPartyIntegrations: Array.isArray(restaurantDetails.thirdPartyIntegrations) ? restaurantDetails.thirdPartyIntegrations.map(String) : [],
    amenities: Array.isArray(restaurantDetails.amenities) ? restaurantDetails.amenities.map(String) : [],
    foodLicenseNumber: stringValue(restaurantDetails.foodLicenseNumber),
    healthInspectionRating: stringValue(restaurantDetails.healthInspectionRating),
    alcoholLicenseNumber: stringValue(restaurantDetails.alcoholLicenseNumber),
    tableBooking: restaurantDetails.tableBookingEnabled === true,
    orderNow: restaurantDetails.orderNowEnabled === true,
    enableChat: restaurantDetails.enableChat !== false,
    enableCall: restaurantDetails.enableCall !== false,
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

  return trimCategoryAttributes({
    business_name: stringValue(details.businessName),
    restaurant_name: stringValue(details.businessName),
    cuisine_type: stringValue(details.cuisineType),
    business_type: stringValue(details.businessType),
    year_established: stringValue(details.yearEstablished),
    staff_count: stringValue(details.numberOfStaff),
    service_type: Array.isArray(details.serviceTypes) ? details.serviceTypes.map(String).join(", ") : "",
    service_radius: stringValue(details.serviceRadiusMiles),
    average_cost_for_two: stringValue(details.averageCostForTwo),
    discounts_offers: stringValue(details.discountsOffers),
    coupon_codes: stringValue(details.couponCodes),
    happy_hours: stringValue(details.happyHours),
    delivery_available: booleanSelectValue(details.deliveryAvailable),
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
  const values: CategoryAttributes = {
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
  ] as Array<[string, string[]]>) {
    if (features.includes(feature)) {
      values[keys[0]] = "true";
      values[keys[0].replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)] = "true";
    }
  }

  return trimCategoryAttributes(values);
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
};

function isVideoValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("data:video/") || /\.(mp4|webm|mov|m4v)(\?|#|$)/.test(normalized);
}

function numberOrNull(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && String(value || "").trim() !== "" ? parsed : null;
}

function boolOrNull(value?: string) {
  if (value === "Yes") return true;
  if (value === "No") return false;
  return null;
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
  ];

  return featureMap
    .filter(([, keys]) => boolAttribute(values, ...keys) === true)
    .map(([feature]) => feature);
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

function shouldShowCategoryAttributeField(field: CategoryAttributeField, values: CategoryAttributes, form: FormState) {
  const key = normalizeFieldKey(field.key);
  const vehicleCondition = getAttributeValue(values, "vehicleCondition", "vehicle_condition", "condition");
  const isNewVehicle = form.detailCategory.toLowerCase().includes("new") || vehicleCondition === "New";
  const isAccessories = form.subCategory === "Spare Parts & Accessories";
  const isRental = form.subCategory === "Rentals";
  const insurance = getAttributeValue(values, "insurance", "insuranceStatus", "insurance_status");

  if (form.categoryName === "Vehicles" && isNewVehicle && ["kilometersdriven", "kilometers_driven", "kmdriven", "km_driven", "ownercount", "owner_count", "numberofowners", "number_of_owners", "rcavailable", "rc_available", "pucavailable", "puc_available", "servicehistory", "service_history", "loanstatus", "loan_status"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Vehicles" && !isRental && ["rentaltype", "rental_type", "priceperhour", "price_per_hour", "priceperday", "price_per_day", "priceperhourday", "price_per_hour_day", "securitydepositvehicle", "security_deposit_vehicle"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Vehicles" && insurance !== "Active" && ["insurancevalidtill", "insurance_valid_till"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Vehicles" && isAccessories && ["yearofmanufacture", "year_of_manufacture", "registrationyear", "registration_year", "vehiclecondition", "vehicle_condition", "fueltype", "fuel_type", "transmission", "kilometersdriven", "kilometers_driven", "kmdriven", "km_driven", "ownercount", "owner_count", "numberofowners", "number_of_owners", "insurance", "insurancestatus", "insurance_status", "insurancevalidtill", "insurance_valid_till", "registrationstate", "registration_state", "rto", "rcavailable", "rc_available", "pucavailable", "puc_available", "servicehistory", "service_history", "loanstatus", "loan_status"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Real Estate" && isPlotRealEstateSubCategory(form.subCategory) && ["bhk", "bathrooms", "balconies", "furnishingtype", "furnishing_type"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Real Estate" && !form.subCategory.toLowerCase().includes("rent") && ["securitydepositdetail", "security_deposit_detail", "monthlyrentlabel", "monthly_rent_label"].includes(key)) {
    return false;
  }

  if (form.categoryName === "Real Estate" && !form.subCategory.toLowerCase().includes("sale") && ["loaneligibledetail", "loan_eligible_detail", "salepricelabel", "sale_price_label"].includes(key)) {
    return false;
  }

  return true;
}

function normalizeFieldKey(key: string) {
  return key.replace(/[^a-z0-9_]/gi, "").toLowerCase();
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
  if (!currentValue || options.includes(currentValue)) {
    return options;
  }

  return [currentValue, ...options];
}

function isRealEstateCategory(categoryName: string) {
  return categoryName === "Real Estate";
}

function isResidentialRealEstateSubCategory(subCategory: string) {
  return ["Sale", "Rent", "Residential Sale", "Residential Rent"].includes(subCategory);
}

function isCommercialRealEstateSubCategory(subCategory: string) {
  return ["Commercial", "Commercial Sale", "Commercial Rent"].includes(subCategory);
}

function isRentRealEstateSubCategory(subCategory: string) {
  return ["Rent", "Residential Rent", "Commercial Rent", "PG", "PG / Co-living"].includes(subCategory);
}

function isSaleRealEstateSubCategory(subCategory: string) {
  return ["Sale", "Residential Sale", "Commercial Sale"].includes(subCategory);
}

function isPlotRealEstateSubCategory(subCategory: string) {
  return ["Plot", "Land / Plots"].includes(subCategory);
}

function getListingKind(subCategory: string, detailCategory: string) {
  void detailCategory;

  if (isCommercialRealEstateSubCategory(subCategory)) return "Commercial";
  if (["PG", "PG / Co-living"].includes(subCategory)) return "PG";
  if (isPlotRealEstateSubCategory(subCategory)) return "Plot";
  if (["Restaurants", "Restaurant", "Fast Food", "Cafes", "Cafe", "Bakery", "Cloud Kitchen", "Catering", "Bars & Beverages", "Food Trucks & Pop-ups"].includes(subCategory)) return "Restaurant";
  if (subCategory === "Job Listings") return "Job";
  if (subCategory === "Freelance Services") return "Service";
  return "Classified";
}

function getRequiredDetailFields(subCategory: string, detailCategory: string): Array<[StringFormField, string]> {
  void detailCategory;

  if (isResidentialRealEstateSubCategory(subCategory)) {
    return [
      ["propertyType", "Property Type"],
      ["bhk", "BHK"],
      ["bathrooms", "Bathrooms"],
      ["balconies", "Balconies"],
      ["furnishingType", "Furnishing Type"],
      ["superBuiltUpArea", "Super Built-up Area"],
      ["floorNumber", "Floor Number"],
      ["totalFloors", "Total Floors"],
      ["propertyAge", "Property Age"],
      ["facing", "Facing"],
      ["availabilityType", "Availability"],
    ];
  }

  if (isPlotRealEstateSubCategory(subCategory)) {
    return [["plotArea", "Plot Area"], ["length", "Length"], ["breadth", "Breadth"], ["boundaryWall", "Boundary Wall"], ["facing", "Facing"], ["approvalType", "Approval Type"], ["roadWidth", "Road Width"]];
  }

  if (isCommercialRealEstateSubCategory(subCategory)) {
    return [["propertyType", "Property Type"], ["area", "Area"], ["furnishingType", "Furnishing"], ["washrooms", "Washrooms"], ["parking", "Parking"], ["suitableFor", "Suitable For"]];
  }

  if (["PG", "PG / Co-living"].includes(subCategory)) {
    return [["roomType", "Room Type"], ["genderPreference", "Gender Preference"], ["foodIncluded", "Food Included"], ["pgAmenities", "Amenities"]];
  }

  return [];
}

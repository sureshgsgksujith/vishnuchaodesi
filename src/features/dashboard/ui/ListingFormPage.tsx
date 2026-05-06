import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createListing, getListing, getListingApiErrorMessage, updateListing, type ListingSummary, type UpsertListingPayload } from "../api/listingsApi";
import { getMyProfile } from "../api/profileApi";
import { getLocationCities, getLocationCountries, getLocationStates, type CityOption, type CountryOption, type StateOption } from "../../../shared/api/locationMastersApi";
import { lookupPostalCodeLocation } from "../../../shared/api/postalCodeLookup";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import DashboardFooter from "../components/DashboardFooter";
import { getMyPlanUsage, type PlanUsage } from "../../pricing/api/pricingApi";
import { resolveListingImageUrl } from "../utils/listingImages";

const wizardSteps = [
  { title: "Step 1", label: "Basic Info" },
  { title: "Step 2", label: "Business" },
  { title: "Step 3", label: "Links" },
  { title: "Step 4", label: "More Info" },
  { title: "Step 5", label: "Media" },
  { title: "Step 6", label: "Done" },
];

const categories = ["Real Estate", "Restaurants & Food"];

const subCategoriesByCategory: Record<string, string[]> = {
  "Real Estate": ["Sale", "Rent", "Commercial", "Plot", "PG"],
  "Restaurants & Food": ["Restaurants", "Fast Food", "Cafes"],
};

const detailCategoriesBySubCategory: Record<string, string[]> = {
  Sale: ["Apartment", "Villa", "Plot"],
  Rent: ["Apartment", "House", "PG"],
  PG: ["Single Room", "Shared Room", "Co-living"],
  Commercial: ["Office", "Shop", "Warehouse"],
  Plot: ["Residential Plot", "Commercial Plot"],
  Restaurants: ["Fine Dining", "Casual Dining", "Family Restaurant"],
  "Fast Food": ["Burger", "Pizza", "Fried Chicken"],
  Cafes: ["Coffee Shop", "Bakery", "Dessert"],
};

const profileImageUploadMarker = "__profileImageFile__";
const coverImageUploadMarker = "__coverImageFile__";
const galleryImageUploadMarkerPrefix = "__galleryFile_";

type ServiceItem = { name: string; imageName: string };
type OfferItem = { name: string; price: string; detail: string; imageName: string; link: string };
type InfoItem = { question: string; answer: string };
type BusinessHour = { day: string; status: string; open: string; close: string };
type ContactInfo = { mainPhone: string; alternatePhone: string; tollFree: string; email: string; streetAddress: string; suite: string; zipcode: string; city: string; state: string };
type WebLinks = { mainWebsite: string; displayWebsite: string; iosApp: string; androidApp: string };
type SocialLinks = { facebook: string; instagram: string; twitter: string; linkedin: string };
type PaymentMethods = { creditCard: boolean; cash: boolean; upi: boolean; googlePay: boolean; applePay: boolean; insurance: boolean };
type RestaurantInfo = { restaurantName: string; tagline: string; cuisine: string; foodType: string };
type GalleryUploadFile = { file: File; marker: string };
type InlineUploadFile = { file: File; marker: string };

type ListingDraft = {
  businessHours: BusinessHour[];
  brands: string[];
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
  googleMap: string;
  view360: string;
  galleryMedia: string[];
  propertyType: string;
  bhk: string;
  bathrooms: string;
  balconies: string;
  furnishingType: string;
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
  loanEligible: boolean;
  amenityParking: boolean;
  amenityLift: boolean;
  amenityGym: boolean;
  amenityCctv: boolean;
  amenitySwimmingPool: boolean;
  amenityGarden: boolean;
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
  googleMap: "",
  view360: "",
  galleryMedia: [],
  propertyType: "",
  bhk: "",
  bathrooms: "",
  balconies: "",
  furnishingType: "",
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
  loanEligible: false,
  amenityParking: false,
  amenityLift: false,
  amenityGym: false,
  amenityCctv: false,
  amenitySwimmingPool: false,
  amenityGarden: false,
};

const defaultBusinessHours: BusinessHour[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
].map((day) => ({ day, status: "Open", open: "", close: "" }));

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
  const [errorMessage, setErrorMessage] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<GalleryUploadFile[]>([]);
  const [serviceFiles, setServiceFiles] = useState<InlineUploadFile[]>([]);
  const [offerFiles, setOfferFiles] = useState<InlineUploadFile[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
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
    () => countries.find((country) => country.name === form.country),
    [countries, form.country],
  );
  const selectedState = useMemo(
    () => states.find((state) => state.name === form.state),
    [states, form.state],
  );
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

    getListing(sourceListingId)
      .then((listing) => {
        if (!isActive) return;
        const propertyDetails = listing.propertyDetails || {};
        setForm((currentForm) => mapListingToForm(listing, currentForm, !isEditMode));
        setServices(parseServiceItems(propertyDetails.services));
        setOffers(parseJsonArray<OfferItem>(propertyDetails.offers, [{ name: "", price: "", detail: "", imageName: "", link: "" }]));
        setInfoItems(parseJsonArray<InfoItem>(
          propertyDetails.otherInformation,
          Array.from({ length: 6 }, () => ({ question: "", answer: "" })),
        ));
        setBusinessHours(parseJsonArray<BusinessHour>(propertyDetails.businessHours, defaultBusinessHours));
        setContactInfo(parseJsonObject<ContactInfo>(propertyDetails.additionalContactInfo, initialContactInfo));
        setWebLinks(parseJsonObject<WebLinks>(propertyDetails.webLinks, initialWebLinks));
        setSocialLinks(parseJsonObject<SocialLinks>(propertyDetails.socialLinks, initialSocialLinks));
        setProducts(parseJsonArray<string>(propertyDetails.products, [""]));
        setBrands(parseJsonArray<string>(propertyDetails.brands, [""]));
        setPaymentMethods(parseJsonObject<PaymentMethods>(propertyDetails.paymentMethods, initialPaymentMethods));
        setRestaurantInfo(parseJsonObject<RestaurantInfo>(propertyDetails.restaurantInfo, initialRestaurantInfo));
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

  const subCategoryOptions = useMemo(
    () => (form.categoryName ? subCategoriesByCategory[form.categoryName] || [] : []),
    [form.categoryName],
  );

  const detailCategoryOptions = useMemo(
    () => (form.subCategory ? detailCategoriesBySubCategory[form.subCategory] || [] : []),
    [form.subCategory],
  );

  function updateField(name: StringFormField, value: string) {
    setForm((currentForm) => {
      const nextForm = { ...currentForm, [name]: value };

      if (name === "categoryName") {
        nextForm.subCategory = "";
        nextForm.detailCategory = "";
      }

      if (name === "country") {
        nextForm.state = "";
        nextForm.city = "";
        nextForm.pincode = "";
      }

      if (name === "state") {
        nextForm.city = "";
        nextForm.pincode = "";
      }

      if (name === "subCategory") {
        nextForm.detailCategory = "";
        nextForm.propertyType = "";
        nextForm.bhk = "";
        nextForm.bathrooms = "";
        nextForm.balconies = "";
        nextForm.furnishingType = "";
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
      }

      return nextForm;
    });
  }

  function handleNext(skipValidation = false) {
    if (!skipValidation && !validateStep(currentStep)) {
      return;
    }

    setErrorMessage("");
    setCurrentStep((step) => Math.min(step + 1, wizardSteps.length - 1));
  }

  function handlePrevious() {
    setErrorMessage("");
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function validateStep(step: number) {
    if (step !== 0) {
      return true;
    }

    // const requiredFields: Array<[StringFormField, string]> = [
    //   ["title", "Listing Name"],
    //   ["country", "Country"],
    //   ["city", "City"],
    //   ["categoryName", "Category"],
    //   ["subCategory", "Sub Category"],
    //   ["description", "Details about your listing"],
    //   ["profileImageName", "Profile image"],
    //   ["coverImageName", "Cover image"],
    // ];

    const requiredFields: Array<[StringFormField, string]> = [
      ["title", "Ad Title"],
      ["country", "Country"],
      ["state", "State"],
      ["city", "City"],
      ["address", "Address"],
      ["categoryName", "Category"],
      ["subCategory", "Sub Category"],
      ["description", "Details about your listing"],
    ];

    if (detailCategoryOptions.length) {
      requiredFields.splice(5, 0, ["detailCategory", "Detailed Category"]);
    }

    const missingField = requiredFields.find(([name]) => !form[name].trim());

    if (missingField) {
      setErrorMessage(`${missingField[1]} is required.`);
      return false;
    }

    const missingDetailField = getRequiredDetailFields(form.subCategory, form.detailCategory).find(([name]) => !form[name].trim());

    if (missingDetailField) {
      setErrorMessage(`${missingDetailField[1]} is required.`);
      return false;
    }

    return true;
  }

  function getListingDraft(): ListingDraft {
    return {
      businessHours,
      brands,
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
      sellerName,
      services,
      serviceFiles,
      socialLinks,
      webLinks,
    };
  }

  async function saveListing(draft = getListingDraft()) {
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

              {currentStep === 0 ? (
                <div className="log">
                  <div className="login">
                    <h4>{isEditMode ? "Edit Listing" : "Listing Details"}</h4>
                    <form className="listing_form_1" noValidate>
                      <Input placeholder="Listing Name*" value={sellerName} onChange={setSellerName} />
                      <div className="row">
                        <InputColumn placeholder="Phone number" value={form.mobileNumber} onChange={(value) => updateField("mobileNumber", value)} />
                        <InputColumn placeholder="Email Id" type="email" value={form.email} onChange={(value) => updateField("email", value)} />
                      </div>
                      <Input placeholder="Whatsapp Number (e.g. +919876543210)" value={form.whatsapp} onChange={(value) => updateField("whatsapp", value)} />
                      <Input placeholder="Website(www.Symplore)" value={form.website} onChange={(value) => updateField("website", value)} />
                      <Select placeholder="Select Country*" value={form.country} options={countries.map((country) => country.name)} onChange={(value) => updateField("country", value)} />
                      <Select placeholder="Select State*" value={form.state} options={states.map((state) => state.name)} onChange={(value) => updateField("state", value)} disabled={!form.country} />
                      <Select placeholder="Select City*" value={form.city} options={cities.map((city) => city.name)} onChange={(value) => updateField("city", value)} disabled={!form.state} />
                      <Input placeholder="Shop address*" value={form.address} onChange={(value) => updateField("address", value)} />
                      <Input placeholder="Zip code" value={form.pincode} onChange={(value) => updateField("pincode", value)} />
                      <Select placeholder="Select Category" value={form.categoryName} options={categories} onChange={(value) => updateField("categoryName", value)} />
                      <Select
                        placeholder="Select Sub Category"
                        value={form.subCategory}
                        options={subCategoryOptions}
                        onChange={(value) => updateField("subCategory", value)}
                        disabled={!form.categoryName}
                      />
                      <Select
                        placeholder="Select Detailed Category"
                        value={form.detailCategory}
                        options={detailCategoryOptions}
                        onChange={(value) => updateField("detailCategory", value)}
                        disabled={!form.subCategory || !detailCategoryOptions.length}
                      />
                      <Input placeholder="Ad Title (e.g., 2BHK Flat for Rent in Hyderabad)*" value={form.title} onChange={(value) => updateField("title", value)} />
                      {form.categoryName === "Real Estate" ? (
                        <>
                          <DetailCategoryFields form={form} updateField={updateField} />
                          <PriceAndAmenitiesFields
                            form={form}
                            updateField={updateField}
                            updateBooleanField={(name, value) => setForm((currentForm) => ({ ...currentForm, [name]: value }))}
                          />
                        </>
                      ) : null}
                      {form.categoryName === "Restaurants & Food" ? (
                        <RestaurantInfoFields restaurantInfo={restaurantInfo} onChange={setRestaurantInfo} />
                      ) : null}
                      <Textarea placeholder="Details about your listing" value={form.description} onChange={(value) => updateField("description", value)} />
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
                        placeholder={"Enter your service locations...\n(i.e) London, Dallas, Wall Street, Opera House"}
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
                          <ListingSectionCard title="Business Description">
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
                                </div>
                              </div>
                            </div>
                          </ListingSectionCard>
                        </li>
                        <li>
                          <BusinessHoursEditor hours={businessHours} onChange={setBusinessHours} />
                        </li>
                        <li>
                          <ContactLocationFields contactInfo={contactInfo} onChange={setContactInfo} />
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
                      <h4>Map and 360 view</h4>
                      <Textarea placeholder="Shop location" value={form.googleMap} onChange={(value) => updateField("googleMap", value)} />
                      <Textarea placeholder="360 view" value={form.view360} onChange={(value) => updateField("view360", value)} />
                      <div className="row">
                        <div className="col-md-6">
                          <button type="button" className="btn btn-primary" onClick={handlePrevious}>Previous</button>
                        </div>
                        <div className="col-md-6">
                          <button type="button" className="btn btn-primary" onClick={handleFinish} disabled={isSaving}>{isSaving ? "Saving..." : isEditMode ? "Save" : "Finish"}</button>
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

function Input({ placeholder, value, onChange, type = "text", readOnly = false }: FieldProps & { type?: string; readOnly?: boolean }) {
  return (
    <div className="row">
      <InputColumn placeholder={placeholder} value={value} onChange={onChange} type={type} width="col-md-12" readOnly={readOnly} />
    </div>
  );
}

function InputColumn({ placeholder, value, onChange, type = "text", width = "col-md-6", readOnly = false }: FieldProps & { type?: string; width?: string; readOnly?: boolean }) {
  return (
    <div className={width}>
      <div className="form-group">
        <input className="form-control" type={type} value={value} placeholder={placeholder} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} />
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

function SelectColumn({ placeholder, value, options, onChange, width = "col-md-6", disabled = false }: FieldProps & { options: string[]; width?: string; disabled?: boolean }) {
  return (
    <div className={width}>
      <div className="form-group">
        <select className="chosen-select form-control" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  const inputId = `listing-checkbox-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="form-group listing-checkbox-field">
      <div className="chbox">
        <input id={inputId} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <label htmlFor={inputId}>{label}</label>
      </div>
    </div>
  );
}

function Textarea({ placeholder, value, onChange }: FieldProps) {
  return (
    <div className="row">
      <div className="col-md-12">
        <div className="form-group">
          <textarea className="form-control" value={value} rows={4} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
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

function Select({ placeholder, value, options, onChange, disabled = false }: FieldProps & { options: string[]; disabled?: boolean }) {
  return (
    <div className="row">
      <div className="col-md-12">
        <div className="form-group">
          <select className="chosen-select form-control" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
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

  if (form.subCategory === "Sale" || form.subCategory === "Rent") {
    return (
      <>
        <h5 className="mt-3 mb-3">Residential Details</h5>
        <Select placeholder="Property Type*" value={form.propertyType || form.detailCategory} options={["Apartment", "Villa", "House"]} onChange={(value) => updateField("propertyType", value)} />
        <div className="row">
          <SelectColumn placeholder="BHK*" value={form.bhk} options={["1 BHK", "2 BHK", "3 BHK", "4+ BHK"]} onChange={(value) => updateField("bhk", value)} />
          <InputColumn placeholder="Bathrooms*" type="number" value={form.bathrooms} onChange={(value) => updateField("bathrooms", value)} />
        </div>
        <div className="row">
          <InputColumn placeholder="Balconies" type="number" value={form.balconies} onChange={(value) => updateField("balconies", value)} />
          <SelectColumn placeholder="Furnishing" value={form.furnishingType} options={["Furnished", "Semi Furnished", "Unfurnished"]} onChange={(value) => updateField("furnishingType", value)} />
        </div>
      </>
    );
  }

  if (form.subCategory === "Plot") {
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
          <InputColumn placeholder="Approval Type (DTCP / HMDA)" value={form.approvalType} onChange={(value) => updateField("approvalType", value)} />
        </div>
        <Input placeholder="Road Width" type="number" value={form.roadWidth} onChange={(value) => updateField("roadWidth", value)} />
      </>
    );
  }

  if (form.subCategory === "Commercial") {
    return (
      <>
        <h5 className="mt-3 mb-3">Commercial Details</h5>
        <Select placeholder="Commercial Type*" value={form.propertyType || form.detailCategory} options={["Office", "Shop", "Warehouse"]} onChange={(value) => updateField("propertyType", value)} />
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

  if (form.subCategory === "PG") {
    return (
      <>
        <h5 className="mt-3 mb-3">PG / Co-living</h5>
        <Select placeholder="Room Type*" value={form.roomType} options={["Single", "Shared", "Co-living"]} onChange={(value) => updateField("roomType", value)} />
        <Select placeholder="Gender Preference*" value={form.genderPreference} options={["Male", "Female", "Any"]} onChange={(value) => updateField("genderPreference", value)} />
        <Select placeholder="Food" value={form.foodIncluded} options={["Food Included", "No Food"]} onChange={(value) => updateField("foodIncluded", value)} />
        <Input placeholder="Amenities (WiFi, AC, Laundry)" value={form.pgAmenities} onChange={(value) => updateField("pgAmenities", value)} />
      </>
    );
  }

  return null;
}

function PriceAndAmenitiesFields({
  form,
  updateField,
  updateBooleanField,
}: {
  form: FormState;
  updateField: (name: StringFormField, value: string) => void;
  updateBooleanField: (name: BooleanFormField, value: boolean) => void;
}) {
  return (
    <>
      <h5 className="mt-3 mb-3">Price Details</h5>
      <div className="row">
        <InputColumn placeholder="Price / Rent" type="number" value={form.price} onChange={(value) => updateField("price", value)} />
        <SelectColumn placeholder="Price Type" value={form.priceNegotiable} options={["Negotiable", "Fixed"]} onChange={(value) => updateField("priceNegotiable", value)} />
      </div>
      <div className="row">
        <InputColumn placeholder="Maintenance Charges" type="number" value={form.maintenanceCharges} onChange={(value) => updateField("maintenanceCharges", value)} />
        <InputColumn placeholder="Security Deposit" type="number" value={form.securityDeposit} onChange={(value) => updateField("securityDeposit", value)} />
      </div>
      <CheckboxField label="Loan Eligible" checked={form.loanEligible} onChange={(value) => updateBooleanField("loanEligible", value)} />

      <h5 className="mt-3 mb-3">Amenities</h5>
      <div className="row listing-amenity-row">
        <div className="col-md-6">
          <CheckboxField label="Parking" checked={form.amenityParking} onChange={(value) => updateBooleanField("amenityParking", value)} />
          <CheckboxField label="Lift" checked={form.amenityLift} onChange={(value) => updateBooleanField("amenityLift", value)} />
          <CheckboxField label="Gym" checked={form.amenityGym} onChange={(value) => updateBooleanField("amenityGym", value)} />
        </div>
        <div className="col-md-6">
          <CheckboxField label="CCTV" checked={form.amenityCctv} onChange={(value) => updateBooleanField("amenityCctv", value)} />
          <CheckboxField label="Swimming Pool" checked={form.amenitySwimmingPool} onChange={(value) => updateBooleanField("amenitySwimmingPool", value)} />
          <CheckboxField label="Garden" checked={form.amenityGarden} onChange={(value) => updateBooleanField("amenityGarden", value)} />
        </div>
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
    const nextFiles = Array.from(fileList || []).map((file, index) => ({
      file,
      marker: `${galleryImageUploadMarkerPrefix}${index}__`,
    }));

    const existingUrls = items.filter((item) => item && !item.startsWith(galleryImageUploadMarkerPrefix));
    onFilesChange(nextFiles);
    onChange([...existingUrls, ...nextFiles.map((item) => item.marker)]);
  }

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
      <div className="imageuploadify well">
        <div className="imageuploadify-overlay">
          <i className="fa fa-picture-o"></i>
        </div>
        <div className="imageuploadify-images-list text-center">
          <img src="/template-17/images/icon/upload.png" alt="" />
          <span className="imageuploadify-message">
            Drag&amp;Drop your image here or <button type="button" className="btn-default" onClick={() => inputRef.current?.click()}>select file to upload</button>
          </span>
          <span className="img-notes">Supports: JPG,JPEG and PNG</span>
          {files.map((item) => (
            <div className="imageuploadify-container" key={item.marker}>
              <button type="button" className="btn btn-danger" onClick={() => {
                onFilesChange(files.filter((file) => file.marker !== item.marker));
                onChange(items.filter((value) => value !== item.marker));
              }}>
                <i className="material-icons">close</i>
              </button>
              <div className="imageuploadify-details">
                <span>{item.file.name}</span>
                <span>{item.file.type}</span>
                <span>{item.file.size}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RestaurantInfoFields({
  restaurantInfo,
  onChange,
}: {
  restaurantInfo: RestaurantInfo;
  onChange: (value: RestaurantInfo) => void;
}) {
  return (
    <>
      <h5 className="mt-3 mb-3">Restaurant Info</h5>
      <div className="row">
        <InputColumn placeholder="Restaurant Name" value={restaurantInfo.restaurantName} onChange={(value) => onChange({ ...restaurantInfo, restaurantName: value })} />
        <InputColumn placeholder="Tagline" value={restaurantInfo.tagline} onChange={(value) => onChange({ ...restaurantInfo, tagline: value })} />
      </div>
      <div className="row">
        <SelectColumn placeholder="Cuisine" value={restaurantInfo.cuisine} options={["Indian", "Chinese", "Italian", "Mexican"]} onChange={(value) => onChange({ ...restaurantInfo, cuisine: value })} />
        <SelectColumn placeholder="Food Type" value={restaurantInfo.foodType} options={["Veg", "Non-Veg", "Vegan"]} onChange={(value) => onChange({ ...restaurantInfo, foodType: value })} />
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
  const [bulkHour, setBulkHour] = useState({ status: "Open", open: "", close: "" });
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
        ? { ...hour, status: bulkHour.status, open: bulkHour.open, close: bulkHour.close }
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
        <div className="listing-hours-grid-head">
          <span>Day</span>
          <span>Status</span>
          <span>Opening</span>
          <span>Closing</span>
        </div>
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
              <input type="time" className="form-control" value={hour.open} disabled={hour.status === "Closed"} onChange={(event) => updateHour(index, { ...hour, open: event.target.value })} />
            </div>
            <div>
              <input type="time" className="form-control" value={hour.close} disabled={hour.status === "Closed"} onChange={(event) => updateHour(index, { ...hour, close: event.target.value })} />
            </div>
          </div>
        ))}
      </div>
    </ListingSectionCard>
  );
}

function ContactLocationFields({
  contactInfo,
  onChange,
}: {
  contactInfo: ContactInfo;
  onChange: (value: ContactInfo) => void;
}) {
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
        <Input placeholder="Street Address" value={contactInfo.streetAddress} onChange={(value) => onChange({ ...contactInfo, streetAddress: value })} />
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
): UpsertListingPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    categoryName: form.categoryName.trim(),
    subCategory: form.subCategory.trim(),
    detailCategory: form.detailCategory.trim() || form.subCategory.trim(),
    propertyDetails: {
      listingKind: getListingKind(form.subCategory, form.detailCategory),
      propertyType: form.propertyType.trim() || form.detailCategory.trim(),
      bhk: form.bhk.trim(),
      bathrooms: numberOrNull(form.bathrooms),
      balconies: numberOrNull(form.balconies),
      furnishingType: form.furnishingType.trim(),
      plotArea: numberOrNull(form.plotArea),
      length: numberOrNull(form.length),
      breadth: numberOrNull(form.breadth),
      boundaryWall: boolOrNull(form.boundaryWall),
      facing: form.facing.trim(),
      approvalType: form.approvalType.trim(),
      roadWidth: numberOrNull(form.roadWidth),
      area: numberOrNull(form.area),
      washrooms: numberOrNull(form.washrooms),
      parking: boolOrNull(form.parking),
      suitableFor: form.suitableFor.trim(),
      roomType: form.roomType.trim(),
      genderPreference: form.genderPreference.trim(),
      foodIncluded: form.foodIncluded ? form.foodIncluded === "Food Included" : null,
      pgAmenities: form.pgAmenities.trim(),
      services: JSON.stringify(services.filter((item) => item.name.trim())),
      offers: JSON.stringify(offers.filter((item) => item.name.trim() || item.price.trim() || item.detail.trim())),
      otherInformation: JSON.stringify(infoItems.filter((item) => item.question.trim() || item.answer.trim())),
      businessDescription: form.businessDescription.trim(),
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
      price: numberOrNull(form.price) ?? numberOrNull(offers[0]?.price) ?? 0,
      priceNegotiable: form.priceNegotiable !== "Fixed",
      maintenanceCharges: numberOrNull(form.maintenanceCharges),
      securityDeposit: numberOrNull(form.securityDeposit),
      loanEligible: form.loanEligible,
    },
    locationDetails: {
      country: form.country.trim(),
      state: form.state.trim(),
      city: form.city.trim(),
      locality: form.address.trim(),
      landmark: form.serviceLocations.trim(),
      pincode: form.pincode.trim(),
      latitude: null,
      longitude: null,
    },
    amenities: {
      parking: form.amenityParking,
      lift: form.amenityLift,
      gym: form.amenityGym,
      cctv: form.amenityCctv,
      swimmingPool: form.amenitySwimmingPool,
      garden: form.amenityGarden,
    },
    media: {
      imageUrls: [
        form.profileImageName,
        form.coverImageName,
        ...form.galleryMedia,
      ].map((value) => value.trim()).filter((value) => value && !isVideoValue(value)),
      videoUrl: form.listingVideo.trim() || form.galleryMedia.find(isVideoValue) || "",
      virtualTourUrl: form.view360.trim(),
    },
    sellerInformation: {
      name: sellerName.trim() || form.title.trim(),
      mobileNumber: form.mobileNumber.trim(),
      email: form.email.trim(),
      whatsAppNumber: form.whatsapp.trim(),
      websiteUrl: form.website.trim(),
      isMobileOtpVerified: false,
    },
    settings: {
      adType: "Free",
      adDurationDays: 30,
      autoRenew: false,
      verifiedByAdmin: false,
    },
  };
}

function mapListingToForm(listing: ListingSummary, currentForm: FormState, isDuplicate: boolean): FormState {
  const propertyDetails = listing.propertyDetails || {};
  const priceDetails = listing.priceDetails || {};
  const locationDetails = listing.locationDetails || {};
  const amenities = listing.amenities || {};
  const sellerInformation = listing.sellerInformation || {};
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
    country: stringValue(locationDetails.country),
    state: stringValue(locationDetails.state),
    city: stringValue(locationDetails.city || listing.city),
    pincode: stringValue(locationDetails.pincode),
    categoryName: listing.categoryName || "",
    subCategory: listing.subCategory || "",
    detailCategory: listing.detailCategory || "",
    description: listing.description || "",
    businessDescription: stringValue(propertyDetails.businessDescription),
    profileImageName,
    coverImageName,
    serviceLocations: stringValue(locationDetails.landmark),
    listingVideo: listing.videoUrl || "",
    view360: listing.virtualTourUrl || "",
    galleryMedia,
    propertyType: stringValue(propertyDetails.propertyType) || listing.detailCategory || "",
    bhk: stringValue(propertyDetails.bhk),
    bathrooms: stringValue(propertyDetails.bathrooms),
    balconies: stringValue(propertyDetails.balconies),
    furnishingType: stringValue(propertyDetails.furnishingType),
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
    foodIncluded: propertyDetails.foodIncluded === true ? "Food Included" : propertyDetails.foodIncluded === false ? "No Food" : "",
    pgAmenities: stringValue(propertyDetails.pgAmenities),
    price: stringValue(priceDetails.price || listing.price),
    priceNegotiable: priceDetails.priceNegotiable === false ? "Fixed" : "Negotiable",
    maintenanceCharges: stringValue(priceDetails.maintenanceCharges),
    securityDeposit: stringValue(priceDetails.securityDeposit),
    loanEligible: priceDetails.loanEligible === true,
    amenityParking: amenities.parking === true,
    amenityLift: amenities.lift === true,
    amenityGym: amenities.gym === true,
    amenityCctv: amenities.cctv === true,
    amenitySwimmingPool: amenities.swimmingPool === true,
    amenityGarden: amenities.garden === true,
  };
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

function getListingKind(subCategory: string, detailCategory: string) {
  void detailCategory;

  if (subCategory === "Commercial") return "Commercial";
  if (subCategory === "PG") return "PG";
  if (subCategory === "Plot") return "Plot";
  if (["Restaurants", "Fast Food", "Cafes"].includes(subCategory)) return "Restaurant";
  return "Residential";
}

function getRequiredDetailFields(subCategory: string, detailCategory: string): Array<[StringFormField, string]> {
  void detailCategory;

  if (subCategory === "Sale" || subCategory === "Rent") {
    return [["bhk", "BHK"], ["bathrooms", "Bathrooms"]];
  }

  if (subCategory === "Plot") {
    return [["plotArea", "Plot Area"]];
  }

  if (subCategory === "Commercial") {
    return [["area", "Area"], ["washrooms", "Washrooms"]];
  }

  if (subCategory === "PG") {
    return [["roomType", "Room Type"], ["genderPreference", "Gender Preference"]];
  }

  return [];
}

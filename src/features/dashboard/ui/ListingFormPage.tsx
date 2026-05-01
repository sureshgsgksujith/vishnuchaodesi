import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createListing, getListing, getListingApiErrorMessage, updateListing, type ListingSummary, type UpsertListingPayload } from "../api/listingsApi";
import { getMyProfile } from "../api/profileApi";
import { getLocationCities, getLocationCountries, getLocationStates, type CityOption, type CountryOption, type StateOption } from "../../../shared/api/locationMastersApi";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import DashboardFooter from "../components/DashboardFooter";

const wizardSteps = [
  { title: "Step 1", label: "Basic Info" },
  { title: "Step 2", label: "Services" },
  { title: "Step 3", label: "Offers" },
  { title: "Step 4", label: "Map" },
  { title: "Step 5", label: "Other" },
  { title: "Step 6", label: "Done" },
];

const categories = ["Real Estate"];

const subCategoriesByCategory: Record<string, string[]> = {
  "Real Estate": ["Sale", "Rent", "Commercial", "Plot", "PG"],
};

const detailCategoriesBySubCategory: Record<string, string[]> = {
  Sale: ["Apartment", "Villa", "Plot"],
  Rent: ["Apartment", "House", "PG"],
  PG: ["Single Room", "Shared Room", "Co-living"],
  Commercial: ["Office", "Shop", "Warehouse"],
  Plot: ["Residential Plot", "Commercial Plot"],
};

const profileImageUploadMarker = "__profileImageFile__";
const coverImageUploadMarker = "__coverImageFile__";
const galleryImageUploadMarkerPrefix = "__galleryFile_";

type ServiceItem = { name: string; imageName: string };
type OfferItem = { name: string; price: string; detail: string; imageName: string; link: string };
type InfoItem = { question: string; answer: string };
type GalleryUploadFile = { file: File; marker: string };

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
  const [errorMessage, setErrorMessage] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<GalleryUploadFile[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [savedListingId, setSavedListingId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { listingId } = useParams();
  const [searchParams] = useSearchParams();
  const editListingId = numberOrNull(listingId);
  const duplicateListingId = numberOrNull(searchParams.get("duplicate") || undefined);
  const sourceListingId = editListingId || duplicateListingId;
  const isEditMode = Boolean(editListingId);

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
        setForm((currentForm) => mapListingToForm(listing, currentForm, !isEditMode));
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

      if (name === "city") {
        const city = cities.find((item) => item.name === value);
        if (city?.zipCode) {
          nextForm.pincode = city.zipCode;
        }
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

    const missingDetailField = getRequiredDetailFields(form.detailCategory).find(([name]) => !form[name].trim());

    if (missingDetailField) {
      setErrorMessage(`${missingDetailField[1]} is required.`);
      return false;
    }

    return true;
  }

  async function handleFinish() {
    if (!validateStep(currentStep)) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload = buildListingPayload(form, services, offers, infoItems, sellerName);
      const galleryMarkers = new Set(form.galleryMedia);
      const uploadFiles = {
        profileImageFile,
        coverImageFile,
        galleryFiles: galleryFiles.filter((item) => galleryMarkers.has(item.marker)),
      };
      const savedListing = isEditMode && editListingId
        ? await updateListing(editListingId, payload, uploadFiles)
        : await createListing(payload, uploadFiles);
      setSavedListingId(savedListing.id);
      setCurrentStep(5);
    } catch (error) {
      setErrorMessage(getListingApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
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
                      <Input placeholder="User Name" value={sellerName} onChange={setSellerName} readOnly />
                      <div className="row">
                        <InputColumn placeholder="Phone number" value={form.mobileNumber} onChange={(value) => updateField("mobileNumber", value)} />
                        <InputColumn placeholder="Email Id" type="email" value={form.email} onChange={(value) => updateField("email", value)} />
                      </div>
                      <Input placeholder="Whatsapp Number (e.g. +919876543210)" value={form.whatsapp} onChange={(value) => updateField("whatsapp", value)} />
                      <Input placeholder="Website(www.Symplore)" value={form.website} onChange={(value) => updateField("website", value)} />
                      <Select placeholder="Country*" value={form.country} options={countries.map((country) => country.name)} onChange={(value) => updateField("country", value)} />
                      <div className="row">
                        <SelectColumn placeholder="State*" value={form.state} options={states.map((state) => state.name)} onChange={(value) => updateField("state", value)} disabled={!form.country} />
                        <SelectColumn placeholder="City*" value={form.city} options={cities.map((city) => city.name)} onChange={(value) => updateField("city", value)} disabled={!form.state} />
                      </div>
                      <div className="row">
                        <InputColumn placeholder="Zip code" value={form.pincode} onChange={(value) => updateField("pincode", value)} />
                        <InputColumn placeholder="Address*" value={form.address} onChange={(value) => updateField("address", value)} />
                      </div>
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
                      <DetailCategoryFields form={form} updateField={updateField} />
                      <PriceAndAmenitiesFields
                        form={form}
                        updateField={updateField}
                        updateBooleanField={(name, value) => setForm((currentForm) => ({ ...currentForm, [name]: value }))}
                      />
                      <Textarea placeholder="Details about your listing" value={form.description} onChange={(value) => updateField("description", value)} />
                      <div className="row">
                        <MediaColumn
                          label="Choose profile image"
                          value={form.profileImageName}
                          onChange={(value) => updateField("profileImageName", value)}
                          onFileChange={(file) => {
                            setProfileImageFile(file);
                            updateField("profileImageName", file ? profileImageUploadMarker : "");
                          }}
                          aspectRatio={1}
                        />
                        <MediaColumn
                          label="Choose cover image"
                          value={form.coverImageName}
                          onChange={(value) => updateField("coverImageName", value)}
                          onFileChange={(file) => {
                            setCoverImageFile(file);
                            updateField("coverImageName", file ? coverImageUploadMarker : "");
                          }}
                          aspectRatio={16 / 9}
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
                  <div className="login add-list-ser">
                    <h4>Services provide</h4>
                    <button type="button" className="add-list-add-btn" title="add new service" onClick={() => setServices((items) => [...items, { name: "", imageName: "" }])}>+</button>
                    <button type="button" className="add-list-rem-btn" title="remove service" onClick={() => setServices((items) => items.length > 1 ? items.slice(0, -1) : items)}>-</button>
                    <ul>
                      {services.map((service, index) => (
                        <li key={index}>
                          <Input placeholder="Ex: Plumbile" value={service.name} onChange={(value) => setServices((items) => updateArrayItem(items, index, { ...service, name: value }))} />
                          <MediaFull
                            value={service.imageName}
                            onChange={(value) => setServices((items) => updateArrayItem(items, index, { ...service, imageName: value }))}
                            aspectRatio={4 / 3}
                          />
                        </li>
                      ))}
                    </ul>
                    <StepNavigation onPrevious={handlePrevious} onNext={() => handleNext()} progress={40} />
                  </div>
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div className="log">
                  <div className="login add-list-off">
                    <h4>Special offers</h4>
                    <button type="button" className="add-list-add-btn" title="add new offer" onClick={() => setOffers((items) => [...items, { name: "", price: "", detail: "", imageName: "", link: "" }])}>+</button>
                    <button type="button" className="add-list-rem-btn" title="remove offer" onClick={() => setOffers((items) => items.length > 1 ? items.slice(0, -1) : items)}>-</button>
                    <ul>
                      {offers.map((offer, index) => (
                        <li key={index}>
                          <div className="row">
                            <InputColumn placeholder="Offer name*" value={offer.name} onChange={(value) => setOffers((items) => updateArrayItem(items, index, { ...offer, name: value }))} />
                            <InputColumn placeholder="Price" value={offer.price} onChange={(value) => setOffers((items) => updateArrayItem(items, index, { ...offer, price: value }))} />
                          </div>
                          <Textarea placeholder="Details about this offer" value={offer.detail} onChange={(value) => setOffers((items) => updateArrayItem(items, index, { ...offer, detail: value }))} />
                          <MediaFull
                            value={offer.imageName}
                            onChange={(value) => setOffers((items) => updateArrayItem(items, index, { ...offer, imageName: value }))}
                            aspectRatio={4 / 3}
                          />
                          <Input placeholder="View More Link" value={offer.link} onChange={(value) => setOffers((items) => updateArrayItem(items, index, { ...offer, link: value }))} />
                        </li>
                      ))}
                    </ul>
                    <StepNavigation onPrevious={handlePrevious} onNext={() => handleNext()} progress={60} />
                  </div>
                </div>
              ) : null}

              {currentStep === 3 ? (
                <div className="log add-list-map">
                  <div className="login add-list-map">
                    <h4>Photo gallery</h4>
                    <GalleryMediaEditor
                      items={form.galleryMedia}
                      files={galleryFiles}
                      onChange={(items) => setForm((currentForm) => ({ ...currentForm, galleryMedia: items }))}
                      onFilesChange={setGalleryFiles}
                    />
                    <h4>Video Gallery</h4>
                    <ul>
                      <button type="button" className="add-list-add-btn" title="add new video">+</button>
                      <button type="button" className="add-list-rem-btn" title="remove video">-</button>
                      <li>
                        <Textarea placeholder="Paste Your Youtube iframe Code here" value={form.listingVideo} onChange={(value) => updateField("listingVideo", value)} />
                      </li>
                    </ul>
                    <h4>Map and 360 view</h4>
                    <Textarea placeholder="Shop location" value={form.googleMap} onChange={(value) => updateField("googleMap", value)} />
                    <Textarea placeholder="360 view" value={form.view360} onChange={(value) => updateField("view360", value)} />
                    <StepNavigation onPrevious={handlePrevious} onNext={() => handleNext()} progress={80} />
                  </div>
                </div>
              ) : null}

              {currentStep === 4 ? (
                <div className="log">
                  <div className="login add-list-off">
                    <h4>Other informations</h4>
                    <button type="button" className="add-list-add-btn" title="add new offer" onClick={() => setInfoItems((items) => [...items, { question: "", answer: "" }])}>+</button>
                    <button type="button" className="add-list-rem-btn" title="remove offer" onClick={() => setInfoItems((items) => items.length > 1 ? items.slice(0, -1) : items)}>-</button>
                    <ul>
                      {infoItems.map((item, index) => (
                        <li key={index}>
                          <div className="row">
                            <InputColumn width="col-md-5" placeholder="Experience" value={item.question} onChange={(value) => setInfoItems((items) => updateArrayItem(items, index, { ...item, question: value }))} />
                            <div className="col-md-2">
                              <div className="form-group listing-info-arrow">
                                <i className="material-icons">arrow_forward</i>
                              </div>
                            </div>
                            <InputColumn width="col-md-5" placeholder="20 years" value={item.answer} onChange={(value) => setInfoItems((items) => updateArrayItem(items, index, { ...item, answer: value }))} />
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="row">
                      <div className="col-md-6">
                        <button type="button" className="btn btn-primary" onClick={handlePrevious}>Previous</button>
                      </div>
                      <div className="col-md-6">
                        <button type="button" className="btn btn-primary" onClick={handleFinish} disabled={isSaving}>{isSaving ? "Saving..." : "Finish"}</button>
                      </div>
                    </div>
                    <Progress value={90} />
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

  if (["Apartment", "House", "Villa"].includes(form.detailCategory)) {
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

  if (["Plot", "Residential Plot", "Commercial Plot"].includes(form.detailCategory)) {
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

  if (["Office", "Shop", "Warehouse"].includes(form.detailCategory)) {
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

  if (["PG", "Single Room", "Shared Room", "Co-living"].includes(form.detailCategory)) {
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

function MediaColumn({
  label,
  value,
  onChange,
  onFileChange,
  aspectRatio,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFileChange?: (file: File | null) => void;
  aspectRatio: number;
}) {
  return (
    <div className="col-md-6">
      <div className="form-group">
        <MediaPicker label={label} value={value} onChange={onChange} onFileChange={onFileChange} aspectRatio={aspectRatio} />
      </div>
    </div>
  );
}

function MediaFull({
  value,
  onChange,
  aspectRatio,
}: {
  value: string;
  onChange: (value: string) => void;
  aspectRatio: number;
}) {
  return (
    <div className="row">
      <div className="col-md-12">
        <div className="form-group">
          <MediaPicker label="Choose image or video" value={value} onChange={onChange} aspectRatio={aspectRatio} />
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
  function updateItem(index: number, value: string) {
    const nextItems = items.length ? [...items] : [""];
    nextItems[index] = value;
    onChange(nextItems.filter(Boolean));
  }

  function updateFile(index: number, file: File | null) {
    const nextItems = items.length ? [...items] : [""];
    const marker = `${galleryImageUploadMarkerPrefix}${index}__`;

    if (file) {
      const nextFiles = files.filter((item) => item.marker !== marker);
      nextFiles.push({ file, marker });
      nextItems[index] = `${galleryImageUploadMarkerPrefix}${index}__`;
      onFilesChange(nextFiles);
    } else {
      nextItems[index] = "";
      onFilesChange(files.filter((item) => item.marker !== marker));
    }

    onChange(nextItems.filter(Boolean));
  }

  function removeItem(index: number) {
    const marker = `${galleryImageUploadMarkerPrefix}${index}__`;
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    onFilesChange(files.filter((item) => item.marker !== marker));
  }

  return (
    <div className="listing-gallery-editor">
      <button type="button" className="add-list-add-btn" title="add new media" onClick={() => onChange([...items, ""])}>
        +
      </button>
      <button type="button" className="add-list-rem-btn" title="remove media" onClick={() => onChange(items.slice(0, -1))}>
        -
      </button>
      {(items.length ? items : [""]).map((item, index) => (
        <MediaPicker
          key={index}
          label={`Gallery media ${index + 1}`}
          value={item}
          onChange={(value) => updateItem(index, value)}
          onFileChange={(file) => updateFile(index, file)}
          onRemove={() => removeItem(index)}
          aspectRatio={4 / 3}
          allowVideo
        />
      ))}
    </div>
  );
}

function MediaPicker({
  label,
  value,
  onChange,
  onFileChange,
  onRemove,
  aspectRatio,
  allowVideo = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFileChange?: (file: File | null) => void;
  onRemove?: () => void;
  aspectRatio: number;
  allowVideo?: boolean;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [draftUrl, setDraftUrl] = useState(value);
  const [draftType, setDraftType] = useState<"image" | "video" | "">("");
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);
  const [selectedName, setSelectedName] = useState("");
  const isVideo = draftType === "video" || isVideoValue(draftUrl);
  const isImage = draftType === "image" || isImageValue(draftUrl);
  const inputId = `listing-media-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  useEffect(() => {
    if (isUploadMarker(value)) {
      return;
    }

    setDraftUrl(value);
    setDraftType("");
  }, [value]);

  function handleFileChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    onFileChange?.(file);
    const reader = new FileReader();
    reader.onload = () => {
      const nextValue = String(reader.result || "");
      setDraftUrl(nextValue);
      setDraftType(file.type.startsWith("video/") ? "video" : "image");
      setSelectedName(file.name);
      setZoom(1);
      setPositionX(50);
      setPositionY(50);
      if (!onFileChange) {
        onChange(nextValue);
      }
    };
    reader.readAsDataURL(file);
  }

  function applyCrop() {
    if (!isImage || !draftUrl) {
      onChange(draftUrl);
      return;
    }

    const image = imageRef.current;
    if (!image?.naturalWidth || !image.naturalHeight) {
      onChange(draftUrl);
      return;
    }

    const croppedUrl = cropImageToDataUrl(image, aspectRatio, zoom, positionX, positionY);
    onChange(croppedUrl);
    setDraftUrl(croppedUrl);
    setZoom(1);
    setPositionX(50);
    setPositionY(50);
  }

  void onRemove;
  void applyCrop;

  return (
    <div className="listing-media-picker">
      <div className="listing-media-head">
        <label htmlFor={inputId}>{label}</label>
        {selectedName ? <span>{selectedName}</span> : null}
      </div>
      <input
        id={inputId}
        type="file"
        accept={allowVideo ? "image/*,video/*,.jpg,.jpeg,.png,.mp4,.webm,.mov" : "image/*,.jpg,.jpeg,.png"}
        className="listing-media-input"
        onChange={(event) => handleFileChange(event.target.files)}
      />
      {!draftUrl ? (
        <label className="listing-media-empty" htmlFor={inputId}>
          <span className="material-icons">cloud_upload</span>
          <strong>Choose media</strong>
          <small>{allowVideo ? "JPG, PNG, MP4, WEBM" : "JPG or PNG image"}</small>
        </label>
      ) : null}
      {draftUrl ? (
        <div className="listing-media-tools">
          <div className="listing-media-frame-wrap">
            <div className="listing-media-frame" style={{ aspectRatio }}>
              {isVideo ? (
                <video
                  src={draftUrl}
                  controls
                  style={{ objectPosition: `${positionX}% ${positionY}%`, transform: `scale(${zoom})` }}
                />
              ) : (
                <img
                  ref={imageRef}
                  src={draftUrl}
                  alt=""
                  style={{ objectPosition: `${positionX}% ${positionY}%`, transform: `scale(${zoom})` }}
                />
              )}
            </div>
          </div>
          {/* <div className="listing-media-side">
            <div className="listing-media-controls">
              <label>
                <span>Zoom</span>
                <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
              </label>
              <label>
                <span>Horizontal</span>
                <input type="range" min="0" max="100" value={positionX} onChange={(event) => setPositionX(Number(event.target.value))} />
              </label>
              <label>
                <span>Vertical</span>
                <input type="range" min="0" max="100" value={positionY} onChange={(event) => setPositionY(Number(event.target.value))} />
              </label>
            </div>
            <div className="listing-media-actions">
              <button type="button" className="listing-media-button listing-media-button-primary" onClick={applyCrop}>
              {isVideo ? "Use video preview" : "Crop image"}
              </button>
              <label className="listing-media-button" htmlFor={inputId}>Change</label>
              <button type="button" className="listing-media-button" onClick={() => { setDraftUrl(""); setSelectedName(""); onFileChange?.(null); onChange(""); }}>
                Clear
              </button>
              {onRemove ? (
                <button type="button" className="listing-media-button" onClick={onRemove}>
                  Remove
                </button>
              ) : null}
            </div>
          </div> */}
        </div>
      ) : null}
    </div>
  );
}

function StepNavigation({
  isFirst = false,
  onCancel,
  onPrevious,
  onNext,
  progress,
}: {
  isFirst?: boolean;
  onCancel?: () => void;
  onPrevious?: () => void;
  onNext: () => void;
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

function cropImageToDataUrl(image: HTMLImageElement, aspectRatio: number, zoom: number, positionX: number, positionY: number) {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  let cropWidth = sourceWidth / zoom;
  let cropHeight = cropWidth / aspectRatio;

  if (cropHeight > sourceHeight / zoom) {
    cropHeight = sourceHeight / zoom;
    cropWidth = cropHeight * aspectRatio;
  }

  const centerX = (positionX / 100) * sourceWidth;
  const centerY = (positionY / 100) * sourceHeight;
  const sourceX = clamp(centerX - cropWidth / 2, 0, sourceWidth - cropWidth);
  const sourceY = clamp(centerY - cropHeight / 2, 0, sourceHeight - cropHeight);
  const canvas = document.createElement("canvas");
  const outputWidth = Math.min(1200, Math.round(cropWidth));
  canvas.width = outputWidth;
  canvas.height = Math.round(outputWidth / aspectRatio);
  const context = canvas.getContext("2d");

  if (!context) {
    return image.src;
  }

  context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function clamp(value: number, min: number, max: number) {
  const upperBound = Math.max(min, max);
  return Math.min(Math.max(value, min), upperBound);
}

function isImageValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return Boolean(normalized) && !isUploadMarker(normalized) && !isVideoValue(normalized);
}

function isVideoValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("data:video/") || /\.(mp4|webm|mov|m4v)(\?|#|$)/.test(normalized);
}

function isUploadMarker(value: string) {
  return value.startsWith("__") && value.endsWith("__");
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
  if (["Office", "Shop", "Warehouse"].includes(detailCategory) || subCategory === "Commercial") return "Commercial";
  if (["PG", "Single Room", "Shared Room", "Co-living"].includes(detailCategory) || subCategory === "PG") return "PG";
  if (["Plot", "Residential Plot", "Commercial Plot"].includes(detailCategory) || subCategory === "Plot") return "Plot";
  return "Residential";
}

function getRequiredDetailFields(detailCategory: string): Array<[StringFormField, string]> {
  if (["Apartment", "House", "Villa"].includes(detailCategory)) {
    return [["bhk", "BHK"], ["bathrooms", "Bathrooms"]];
  }

  if (["Plot", "Residential Plot", "Commercial Plot"].includes(detailCategory)) {
    return [["plotArea", "Plot Area"]];
  }

  if (["Office", "Shop", "Warehouse"].includes(detailCategory)) {
    return [["area", "Area"], ["washrooms", "Washrooms"]];
  }

  if (["PG", "Single Room", "Shared Room", "Co-living"].includes(detailCategory)) {
    return [["roomType", "Room Type"], ["genderPreference", "Gender Preference"]];
  }

  return [];
}

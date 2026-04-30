import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createListing, getListing, getListingApiErrorMessage, updateListing, type ListingSummary, type UpsertListingPayload } from "../api/listingsApi";
import { getMyProfile } from "../api/profileApi";
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

const categories = [
  "Restaurants",
  "Wedding halls",
  "Pet shop",
  "Technology",
  "Spa and Facial",
  "Real Estate",
  "Sports",
  "Education",
  "Electricals",
  "Automobiles",
  "Transportation",
  "Hospitals",
];

const subCategoriesByCategory: Record<string, string[]> = {
  Restaurants: ["Indian Restaurants", "Cafe", "Bakery", "Catering"],
  "Wedding halls": ["Banquet Hall", "Marriage Garden", "Convention Center"],
  "Pet shop": ["Pet Food", "Pet Grooming", "Veterinary"],
  Technology: ["Software", "Computer Repair", "Digital Marketing", "IT Services"],
  "Spa and Facial": ["Spa", "Facial", "Massage", "Beauty Parlour"],
  "Real Estate": ["Rent", "Sale", "PG", "Commercial", "Land / Plots"],
  Sports: ["Coaching", "Sports Shop", "Fitness Center"],
  Education: ["Schools", "College", "Tuition", "Training Institute"],
  Electricals: ["Electrician", "Appliances", "Lighting"],
  Automobiles: ["Car Service", "Bike Service", "Car Dealers", "Used Cars"],
  Transportation: ["Taxi", "Movers", "Logistics", "Bus Service"],
  Hospitals: ["General Hospital", "Clinic", "Dental", "Pharmacy"],
};

const detailCategoriesBySubCategory: Record<string, string[]> = {
  Rent: ["Apartment", "House", "Villa", "Room"],
  Sale: ["Apartment", "House", "Villa", "Plot"],
  PG: ["Single Room", "Shared Room", "Co-living"],
  Commercial: ["Office", "Shop", "Warehouse"],
  "Land / Plots": ["Residential Plot", "Agricultural Land", "Farmhouse"],
};

type ServiceItem = { name: string; imageName: string };
type OfferItem = { name: string; price: string; detail: string; imageName: string; link: string };
type InfoItem = { question: string; answer: string };

type FormState = {
  title: string;
  mobileNumber: string;
  email: string;
  whatsapp: string;
  website: string;
  address: string;
  country: string;
  city: string;
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
  plotArea: string;
  area: string;
  washrooms: string;
  roomType: string;
  genderPreference: string;
};

type StringFormField = Exclude<keyof FormState, "galleryMedia">;

const initialForm: FormState = {
  title: "",
  mobileNumber: "",
  email: "",
  whatsapp: "",
  website: "",
  address: "",
  country: "",
  city: "",
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
  plotArea: "",
  area: "",
  washrooms: "",
  roomType: "",
  genderPreference: "",
};

export default function ListingFormPage() {
  const [form, setForm] = useState<FormState>(initialForm);
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
      })
      .catch(() => {
        if (!isActive) return;
        setForm((currentForm) => ({
          ...currentForm,
          email: localStorage.getItem("email") || currentForm.email,
          mobileNumber:
            localStorage.getItem("mobileNumber") ||
            localStorage.getItem("mobile_number") ||
            currentForm.mobileNumber,
        }));
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

  function updateField(name: keyof FormState, value: string) {
    setForm((currentForm) => {
      const nextForm = { ...currentForm, [name]: value };

      if (name === "categoryName") {
        nextForm.subCategory = "";
        nextForm.detailCategory = "";
      }

      if (name === "subCategory") {
        nextForm.detailCategory = "";
        nextForm.propertyType = "";
        nextForm.bhk = "";
        nextForm.bathrooms = "";
        nextForm.plotArea = "";
        nextForm.area = "";
        nextForm.washrooms = "";
        nextForm.roomType = "";
        nextForm.genderPreference = "";
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

    const requiredFields: Array<[StringFormField, string]> = [
      ["title", "Listing Name"],
      ["country", "Country"],
      ["city", "City"],
      ["categoryName", "Category"],
      ["subCategory", "Sub Category"],
      ["description", "Details about your listing"],
      ["profileImageName", "Profile image"],
      ["coverImageName", "Cover image"],
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
      const payload = buildListingPayload(form, services, offers, infoItems);
      const savedListing = isEditMode && editListingId
        ? await updateListing(editListingId, payload)
        : await createListing(payload);
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
                      <Input placeholder="Listing Name*" value={form.title} onChange={(value) => updateField("title", value)} />
                      <div className="row">
                        <InputColumn placeholder="Phone number" value={form.mobileNumber} onChange={(value) => updateField("mobileNumber", value)} />
                        <InputColumn placeholder="Email Id" type="email" value={form.email} onChange={(value) => updateField("email", value)} />
                      </div>
                      <Input placeholder="Whatsapp Number (e.g. +919876543210)" value={form.whatsapp} onChange={(value) => updateField("whatsapp", value)} />
                      <Input placeholder="Website(www.Symplore)" value={form.website} onChange={(value) => updateField("website", value)} />
                      <Input placeholder="Shop address" value={form.address} onChange={(value) => updateField("address", value)} />
                      <Select placeholder="Select your Country" value={form.country} options={["India", "England", "United States"]} onChange={(value) => updateField("country", value)} />
                      <Input placeholder="Select your Cities" value={form.city} onChange={(value) => updateField("city", value)} />
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
                      <DetailCategoryFields form={form} updateField={updateField} />
                      <Textarea placeholder="Details about your listing" value={form.description} onChange={(value) => updateField("description", value)} />
                      <div className="row">
                        <MediaColumn
                          label="Choose profile image"
                          value={form.profileImageName}
                          onChange={(value) => updateField("profileImageName", value)}
                          aspectRatio={1}
                        />
                        <MediaColumn
                          label="Choose cover image"
                          value={form.coverImageName}
                          onChange={(value) => updateField("coverImageName", value)}
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
                      onChange={(items) => setForm((currentForm) => ({ ...currentForm, galleryMedia: items }))}
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

function Input({ placeholder, value, onChange, type = "text" }: FieldProps & { type?: string }) {
  return (
    <div className="row">
      <InputColumn placeholder={placeholder} value={value} onChange={onChange} type={type} width="col-md-12" />
    </div>
  );
}

function InputColumn({ placeholder, value, onChange, type = "text", width = "col-md-6" }: FieldProps & { type?: string; width?: string }) {
  return (
    <div className={width}>
      <div className="form-group">
        <input className="form-control" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
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
  updateField: (name: keyof FormState, value: string) => void;
}) {
  if (!form.detailCategory) {
    return null;
  }

  if (["Apartment", "House", "Villa"].includes(form.detailCategory)) {
    return (
      <>
        <div className="row">
          <InputColumn placeholder="BHK*" value={form.bhk} onChange={(value) => updateField("bhk", value)} />
          <InputColumn placeholder="Bathrooms*" type="number" value={form.bathrooms} onChange={(value) => updateField("bathrooms", value)} />
        </div>
      </>
    );
  }

  if (["Plot", "Residential Plot", "Agricultural Land", "Farmhouse"].includes(form.detailCategory)) {
    return <Input placeholder="Plot Area*" type="number" value={form.plotArea} onChange={(value) => updateField("plotArea", value)} />;
  }

  if (["Office", "Shop", "Warehouse"].includes(form.detailCategory)) {
    return (
      <div className="row">
        <InputColumn placeholder="Area*" type="number" value={form.area} onChange={(value) => updateField("area", value)} />
        <InputColumn placeholder="Washrooms*" type="number" value={form.washrooms} onChange={(value) => updateField("washrooms", value)} />
      </div>
    );
  }

  if (["Single Room", "Shared Room", "Co-living"].includes(form.detailCategory)) {
    return (
      <>
        <Select placeholder="Room Type*" value={form.roomType} options={["Single", "Shared", "Co-living"]} onChange={(value) => updateField("roomType", value)} />
        <Select placeholder="Gender Preference*" value={form.genderPreference} options={["Male", "Female", "Any"]} onChange={(value) => updateField("genderPreference", value)} />
      </>
    );
  }

  return null;
}

function MediaColumn({
  label,
  value,
  onChange,
  aspectRatio,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  aspectRatio: number;
}) {
  return (
    <div className="col-md-6">
      <div className="form-group">
        <MediaPicker label={label} value={value} onChange={onChange} aspectRatio={aspectRatio} />
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

function GalleryMediaEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  function updateItem(index: number, value: string) {
    const nextItems = items.length ? [...items] : [""];
    nextItems[index] = value;
    onChange(nextItems.filter(Boolean));
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
          onRemove={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
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
  onRemove,
  aspectRatio,
  allowVideo = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
    setDraftUrl(value);
    setDraftType("");
  }, [value]);

  function handleFileChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const nextValue = String(reader.result || "");
      setDraftUrl(nextValue);
      setDraftType(file.type.startsWith("video/") ? "video" : "image");
      setSelectedName(file.name);
      setZoom(1);
      setPositionX(50);
      setPositionY(50);
      if (file.type.startsWith("video/")) {
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
              <button type="button" className="listing-media-button" onClick={() => { setDraftUrl(""); setSelectedName(""); onChange(""); }}>
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
      plotArea: numberOrNull(form.plotArea),
      area: numberOrNull(form.area),
      washrooms: numberOrNull(form.washrooms),
      roomType: form.roomType.trim(),
      genderPreference: form.genderPreference.trim(),
      services: JSON.stringify(services.filter((item) => item.name.trim())),
      offers: JSON.stringify(offers.filter((item) => item.name.trim() || item.price.trim() || item.detail.trim())),
      otherInformation: JSON.stringify(infoItems.filter((item) => item.question.trim() || item.answer.trim())),
    },
    priceDetails: {
      price: numberOrNull(offers[0]?.price) || 0,
      priceNegotiable: true,
    },
    locationDetails: {
      country: form.country.trim(),
      state: "",
      city: form.city.trim(),
      locality: form.address.trim(),
      landmark: form.serviceLocations.trim(),
      pincode: "",
      latitude: null,
      longitude: null,
    },
    amenities: {},
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
      name: form.title.trim(),
      mobileNumber: form.mobileNumber.trim(),
      email: form.email.trim(),
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
  const locationDetails = listing.locationDetails || {};
  const sellerInformation = listing.sellerInformation || {};
  const imageUrls = listing.imageUrls || [];
  const [profileImageName = "", coverImageName = "", ...galleryMedia] = imageUrls;

  return {
    ...currentForm,
    title: isDuplicate ? "" : listing.title || "",
    mobileNumber: stringValue(sellerInformation.mobileNumber) || currentForm.mobileNumber,
    email: stringValue(sellerInformation.email) || currentForm.email,
    address: stringValue(locationDetails.locality),
    country: stringValue(locationDetails.country),
    city: stringValue(locationDetails.city || listing.city),
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
    plotArea: stringValue(propertyDetails.plotArea),
    area: stringValue(propertyDetails.area),
    washrooms: stringValue(propertyDetails.washrooms),
    roomType: stringValue(propertyDetails.roomType),
    genderPreference: stringValue(propertyDetails.genderPreference),
  };
}

function stringValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
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
  return Boolean(normalized) && !isVideoValue(normalized);
}

function isVideoValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("data:video/") || /\.(mp4|webm|mov|m4v)(\?|#|$)/.test(normalized);
}

function numberOrNull(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && String(value || "").trim() !== "" ? parsed : null;
}

function getListingKind(subCategory: string, detailCategory: string) {
  if (["Office", "Shop", "Warehouse"].includes(detailCategory) || subCategory === "Commercial") return "Commercial";
  if (["Single Room", "Shared Room", "Co-living"].includes(detailCategory) || subCategory === "PG") return "PG";
  if (["Plot", "Residential Plot", "Agricultural Land", "Farmhouse"].includes(detailCategory) || subCategory === "Land / Plots") return "Plot";
  return "Residential";
}

function getRequiredDetailFields(detailCategory: string): Array<[StringFormField, string]> {
  if (["Apartment", "House", "Villa"].includes(detailCategory)) {
    return [["bhk", "BHK"], ["bathrooms", "Bathrooms"]];
  }

  if (["Plot", "Residential Plot", "Agricultural Land", "Farmhouse"].includes(detailCategory)) {
    return [["plotArea", "Plot Area"]];
  }

  if (["Office", "Shop", "Warehouse"].includes(detailCategory)) {
    return [["area", "Area"], ["washrooms", "Washrooms"]];
  }

  if (["Single Room", "Shared Room", "Co-living"].includes(detailCategory)) {
    return [["roomType", "Room Type"], ["genderPreference", "Gender Preference"]];
  }

  return [];
}

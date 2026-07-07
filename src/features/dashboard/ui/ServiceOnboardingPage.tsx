import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  getAllServiceDirectoryTree,
  type AllServiceCategoryOption,
  type AllServiceDetailedCategoryOption,
  type AllServiceSubCategoryOption,
} from "../../allServices/api/allServiceDirectoryApi";
import { createAllServicePosting, type AllServicePostingPayload } from "../api/allServicePostingsApi";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import DashboardFooter from "../components/DashboardFooter";
import "../styles/serviceOnboarding.css";

const professionOptions = [
  {
    id: "professional",
    title: "Independent Service Professional",
    description: "For individuals who directly serve customers, such as tutors, consultants, and repair experts.",
  },
  {
    id: "establishment",
    title: "Local Shop, Office, or Service Center",
    description: "For customers who visit your location, such as schools, clinics, stores, and studios.",
  },
  {
    id: "brand",
    title: "Brand or Franchise Business",
    description: "For recognized brands, franchise locations, product companies, and multi-location providers.",
  },
  {
    id: "agent",
    title: "Agent or Channel Partner",
    description: "For representatives, brokers, referral partners, and agencies connecting customers with services.",
  },
];

const setupSteps = [
  "Business profile",
  "Service offered",
  "Details and hours",
  "Contact",
  "Package",
];

const hoursDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const helperCards = [
  {
    icon: "business_center",
    title: "Business profile",
    text: "Choose provider type and enter the public business name.",
  },
  {
    icon: "room_service",
    title: "Service offered",
    text: "Pick the main service category and detailed service checkboxes.",
  },
  {
    icon: "schedule",
    title: "Details and hours",
    text: "Add experience, description, and customer-facing working hours.",
  },
  {
    icon: "verified_user",
    title: "Contact verification",
    text: "Collect contact details and prepare phone verification.",
  },
  {
    icon: "payments",
    title: "Package",
    text: "Choose the package before sending the service posting for admin approval.",
  },
];

type ServicePostingForm = {
  providerType: string;
  businessName: string;
  tagline: string;
  primaryServiceLocation: string;
  serviceName: string;
  experienceYears: string;
  timeZone: string;
  description: string;
  workingMode: string;
  contactName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  verificationMethod: string;
  packageCode: string;
};

const initialForm: ServicePostingForm = {
  providerType: "professional",
  businessName: "",
  tagline: "",
  primaryServiceLocation: "",
  serviceName: "",
  experienceYears: "0",
  timeZone: "EST",
  description: "",
  workingMode: "business",
  contactName: "",
  email: "",
  phoneCountryCode: "US (+1)",
  phoneNumber: "",
  verificationMethod: "sms",
  packageCode: "base",
};

export default function ServiceOnboardingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<ServicePostingForm>(initialForm);
  const [openDays, setOpenDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [categories, setCategories] = useState<AllServiceCategoryOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedDetailedIds, setSelectedDetailedIds] = useState<number[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) || null,
    [categories, selectedCategoryId],
  );
  const progress = Math.round(((activeStep + 1) / setupSteps.length) * 100);
  const heading = useMemo(() => getStepHeading(activeStep), [activeStep]);

  useEffect(() => {
    let isActive = true;

    setIsLoadingCategories(true);
    getAllServiceDirectoryTree()
      .then((items) => {
        if (!isActive) {
          return;
        }

        setCategories(items);
        setErrorMessage("");
      })
      .catch(() => {
        if (isActive) {
          setErrorMessage("Unable to load service categories. Please try again.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingCategories(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  function updateField<K extends keyof ServicePostingForm>(key: K, value: ServicePostingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice("");
    setErrorMessage("");
  }

  function selectCategory(category: AllServiceCategoryOption) {
    setSelectedCategoryId(category.id);
    setSelectedDetailedIds([]);
    updateField("serviceName", category.name);
  }

  function updateServiceSearch(value: string) {
    if (selectedCategory && value !== selectedCategory.name) {
      setSelectedCategoryId(null);
      setSelectedDetailedIds([]);
    }

    updateField("serviceName", value);
  }

  function toggleDetailedService(detailId: number) {
    setSelectedDetailedIds((current) =>
      current.includes(detailId) ? current.filter((item) => item !== detailId) : [...current, detailId],
    );
  }

  function toggleOpenDay(day: string) {
    setOpenDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  }

  function changeWorkingMode(value: string) {
    updateField("workingMode", value);

    if (value === "open") {
      setOpenDays(hoursDays);
      return;
    }

    if (value === "appointment") {
      setOpenDays([]);
      return;
    }

    setOpenDays((current) => current.length ? current : ["Mon", "Tue", "Wed", "Thu", "Fri"]);
  }

  function goNext() {
    setNotice("");
    setErrorMessage("");

    if (activeStep === 1) {
      if (!selectedCategory) {
        setErrorMessage("Select a service category.");
        return;
      }

      if (!selectedDetailedIds.length) {
        setErrorMessage("Select at least one detailed service checkbox.");
        return;
      }
    }

    setActiveStep((current) => Math.min(current + 1, setupSteps.length - 1));
  }

  function goBack() {
    setNotice("");
    setErrorMessage("");
    setActiveStep((current) => Math.max(current - 1, 0));
  }

  async function submitPosting(saveAsDraft: boolean) {
    setNotice("");
    setErrorMessage("");

    if (!selectedCategory) {
      setErrorMessage("Select a service category.");
      setActiveStep(1);
      return;
    }

    if (!selectedDetailedIds.length) {
      setErrorMessage("Select at least one detailed service checkbox.");
      setActiveStep(1);
      return;
    }

    const payload: AllServicePostingPayload = {
      providerType: form.providerType,
      businessName: form.businessName.trim(),
      tagline: form.tagline.trim(),
      primaryServiceLocation: form.primaryServiceLocation.trim(),
      allServiceCategoryId: selectedCategory.id,
      serviceName: form.serviceName.trim() || selectedCategory.name,
      selectedDetailedCategoryIds: selectedDetailedIds,
      experienceYears: Number(form.experienceYears) || 0,
      timeZone: form.timeZone,
      description: form.description.trim(),
      workingMode: form.workingMode,
      openDays,
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phoneCountryCode: form.phoneCountryCode,
      phoneNumber: form.phoneNumber.trim(),
      verificationMethod: form.verificationMethod,
      isPhoneVerified: false,
      packageCode: form.packageCode,
      saveAsDraft,
    };

    try {
      setIsSubmitting(true);
      const createdPosting = await createAllServicePosting(payload);
      setNotice(
        saveAsDraft
          ? `Draft saved for ${createdPosting.businessName}.`
          : `Service posting submitted for admin approval. Reference #${createdPosting.id}.`,
      );

      if (!saveAsDraft) {
        setActiveStep(setupSteps.length - 1);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <>
      <UserHomeHeader />
      <main className="service-onboarding-page">
        <section className="service-onboarding-band">
          <div className="service-onboarding-container">
            <span>Service provider setup</span>
            <strong>Add your service to Chao Desi</strong>
          </div>
        </section>

        <section className="service-onboarding-container service-onboarding-layout">
          <div className="service-onboarding-main">
            <div className="service-onboarding-heading">
              <p>Step {activeStep + 1} of {setupSteps.length}</p>
              <h1>{heading.title}</h1>
              <span>{heading.description}</span>
            </div>

            <div className="service-onboarding-stepper" aria-label="Service setup steps">
              {setupSteps.map((step, index) => (
                <button
                  className={`${index === activeStep ? "is-active" : ""} ${index < activeStep ? "is-complete" : ""}`}
                  key={step}
                  onClick={() => {
                    setNotice("");
                    setErrorMessage("");
                    setActiveStep(index);
                  }}
                  type="button"
                >
                  <b>{index + 1}</b>
                  <span>{step}</span>
                </button>
              ))}
            </div>

            <form className="service-onboarding-form" onSubmit={handleFormSubmit}>
              {activeStep === 0 ? (
                <BusinessProfileStep form={form} onFieldChange={updateField} />
              ) : null}
              {activeStep === 1 ? (
                <ServiceOfferStep
                  categories={categories}
                  isLoading={isLoadingCategories}
                  selectedCategory={selectedCategory}
                  selectedDetailedIds={selectedDetailedIds}
                  serviceName={form.serviceName}
                  onServiceNameChange={updateServiceSearch}
                  onSelectCategory={selectCategory}
                  onToggleDetailedService={toggleDetailedService}
                />
              ) : null}
              {activeStep === 2 ? (
                <ServiceDetailsStep
                  form={form}
                  openDays={openDays}
                  selectedCategory={selectedCategory}
                  onFieldChange={updateField}
                  onWorkingModeChange={changeWorkingMode}
                  onToggleOpenDay={toggleOpenDay}
                />
              ) : null}
              {activeStep === 3 ? (
                <ContactStep form={form} onFieldChange={updateField} />
              ) : null}
              {activeStep === 4 ? (
                <PackageStep
                  form={form}
                  selectedCategory={selectedCategory}
                  selectedCount={selectedDetailedIds.length}
                  onChoosePackage={(value) => updateField("packageCode", value)}
                />
              ) : null}

              <div className="service-onboarding-actions">
                {activeStep === 0 ? <Link to="/all-services">Back</Link> : <button type="button" onClick={goBack}>Back</button>}
                <button type="button" onClick={() => submitPosting(true)} disabled={isSubmitting}>Save draft</button>
                {activeStep === setupSteps.length - 1 ? (
                  <button type="button" className="service-onboarding-primary" onClick={() => submitPosting(false)} disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit for approval"}
                  </button>
                ) : (
                  <button type="button" className="service-onboarding-primary" onClick={goNext}>
                    Next
                  </button>
                )}
              </div>
              {errorMessage ? <p className="service-onboarding-notice is-error">{errorMessage}</p> : null}
              {notice ? <p className="service-onboarding-notice">{notice}</p> : null}
            </form>
          </div>

          <aside className="service-onboarding-side" aria-label="Completion status">
            <div className="service-onboarding-status">
              <span>Completion status</span>
              <div><b style={{ width: `${progress}%` }} /></div>
              <strong>{progress}%</strong>
            </div>

            {helperCards.map((card, index) => (
              <div className={index === activeStep ? "service-onboarding-help is-current" : "service-onboarding-help"} key={card.title}>
                <i className="material-icons">{card.icon}</i>
                <div>
                  <h2>{card.title}</h2>
                  <p>{card.text}</p>
                </div>
              </div>
            ))}
          </aside>
        </section>
      </main>
      <DashboardFooter onOpenSupport={() => undefined} onOpenMobileMenu={() => undefined} />
    </>
  );
}

function BusinessProfileStep({
  form,
  onFieldChange,
}: {
  form: ServicePostingForm;
  onFieldChange: <K extends keyof ServicePostingForm>(key: K, value: ServicePostingForm[K]) => void;
}) {
  return (
    <>
      <fieldset>
        <legend>What best describes your business or profession?</legend>
        <div className="service-onboarding-options">
          {professionOptions.map((option) => (
            <label className="service-onboarding-option" htmlFor={`profession-${option.id}`} key={option.id}>
              <input
                checked={form.providerType === option.id}
                id={`profession-${option.id}`}
                name="professionType"
                onChange={() => onFieldChange("providerType", option.id)}
                type="radio"
              />
              <span>
                <strong>{option.title}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="service-onboarding-field-grid">
        <label>
          <span>Business or professional name</span>
          <input
            type="text"
            placeholder="Enter your business name"
            value={form.businessName}
            onChange={(event) => onFieldChange("businessName", event.target.value)}
          />
        </label>
        <label>
          <span>Business tagline</span>
          <input
            type="text"
            placeholder="Example: Tutoring, catering, immigration help"
            value={form.tagline}
            onChange={(event) => onFieldChange("tagline", event.target.value)}
          />
        </label>
        <label className="service-onboarding-wide-field">
          <span>Primary service location</span>
          <input
            type="text"
            placeholder="City, state, ZIP code, or service area"
            value={form.primaryServiceLocation}
            onChange={(event) => onFieldChange("primaryServiceLocation", event.target.value)}
          />
        </label>
      </div>
    </>
  );
}

function ServiceOfferStep({
  categories,
  isLoading,
  selectedCategory,
  selectedDetailedIds,
  serviceName,
  onServiceNameChange,
  onSelectCategory,
  onToggleDetailedService,
}: {
  categories: AllServiceCategoryOption[];
  isLoading: boolean;
  selectedCategory: AllServiceCategoryOption | null;
  selectedDetailedIds: number[];
  serviceName: string;
  onServiceNameChange: (value: string) => void;
  onSelectCategory: (category: AllServiceCategoryOption) => void;
  onToggleDetailedService: (value: number) => void;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const filteredCategories = useMemo(() => {
    const query = serviceName.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return categories.filter((category) => {
      const text = [
        category.name,
        ...category.subCategories.flatMap((subCategory) => [
          subCategory.name,
          ...subCategory.detailedCategories.map((detail) => detail.name),
        ]),
      ].join(" ").toLowerCase();
      return text.includes(query);
    });
  }, [categories, serviceName]);
  const shouldShowDropdown = isDropdownOpen && serviceName.trim().length > 0;

  return (
    <div className="service-onboarding-card-section">
      <label className="service-onboarding-search-field service-onboarding-dropdown-field">
        <span>What service do you provide?</span>
        <div className="service-onboarding-input-wrap">
          <input
            type="text"
            value={serviceName}
            onBlur={() => window.setTimeout(() => setIsDropdownOpen(false), 120)}
            onChange={(event) => {
              onServiceNameChange(event.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Search Educational Institutes, Schools, Catering, Tax..."
          />
          <i className="material-icons">search</i>
        </div>
        {shouldShowDropdown ? (
          <div className="service-onboarding-dropdown-menu">
            {isLoading ? <p className="service-onboarding-inline-status">Loading service categories...</p> : null}
            {!isLoading && !filteredCategories.length ? <p className="service-onboarding-inline-status">No matching service category found.</p> : null}
            {filteredCategories.map((category) => (
              <button
                className={category.id === selectedCategory?.id ? "is-selected" : ""}
                key={category.id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelectCategory(category);
                  setIsDropdownOpen(false);
                }}
                type="button"
              >
                <b>{category.code || category.name.slice(0, 2).toUpperCase()}</b>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        ) : null}
      </label>

      {selectedCategory ? (
        <>
          <div className="service-onboarding-selected-category">
            <b>{selectedCategory.code || selectedCategory.name.slice(0, 2).toUpperCase()}</b>
            <span>{selectedCategory.name}</span>
          </div>

          <fieldset>
            <legend>Select the services you provide</legend>
            <div className="service-onboarding-subcategory-stack">
              {selectedCategory.subCategories.map((subCategory) => (
                <ServiceSubCategoryChoices
                  key={subCategory.id}
                  selectedDetailedIds={selectedDetailedIds}
                  subCategory={subCategory}
                  onToggle={onToggleDetailedService}
                />
              ))}
            </div>
          </fieldset>
        </>
      ) : null}
    </div>
  );
}

function ServiceSubCategoryChoices({
  subCategory,
  selectedDetailedIds,
  onToggle,
}: {
  subCategory: AllServiceSubCategoryOption;
  selectedDetailedIds: number[];
  onToggle: (value: number) => void;
}) {
  return (
    <section className="service-onboarding-subcategory-card">
      <h3>{subCategory.name}</h3>
      <div className="service-onboarding-checkbox-grid">
        {subCategory.detailedCategories.map((detail) => (
          <ServiceDetailCheckbox
            key={detail.id}
            detail={detail}
            isChecked={selectedDetailedIds.includes(detail.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </section>
  );
}

function ServiceDetailCheckbox({
  detail,
  isChecked,
  onToggle,
}: {
  detail: AllServiceDetailedCategoryOption;
  isChecked: boolean;
  onToggle: (value: number) => void;
}) {
  return (
    <label>
      <input
        checked={isChecked}
        onChange={() => onToggle(detail.id)}
        type="checkbox"
      />
      <span>{detail.name}</span>
    </label>
  );
}

function ServiceDetailsStep({
  form,
  openDays,
  selectedCategory,
  onFieldChange,
  onWorkingModeChange,
  onToggleOpenDay,
}: {
  form: ServicePostingForm;
  openDays: string[];
  selectedCategory: AllServiceCategoryOption | null;
  onFieldChange: <K extends keyof ServicePostingForm>(key: K, value: ServicePostingForm[K]) => void;
  onWorkingModeChange: (value: string) => void;
  onToggleOpenDay: (value: string) => void;
}) {
  const defaultDescription = selectedCategory
    ? `Describe your ${selectedCategory.name} service, coverage area, experience, and customer process.`
    : "Describe your service, coverage area, experience, and customer process.";

  return (
    <div className="service-onboarding-card-section">
      <div className="service-onboarding-field-grid service-onboarding-compact-grid">
        <label>
          <span>Business experience</span>
          <input
            type="number"
            min="0"
            placeholder="Can accept numbers only"
            value={form.experienceYears}
            onChange={(event) => onFieldChange("experienceYears", event.target.value)}
          />
        </label>
        <label>
          <span>Select time zone</span>
          <select value={form.timeZone} onChange={(event) => onFieldChange("timeZone", event.target.value)}>
            <option>EST</option>
            <option>CST</option>
            <option>MST</option>
            <option>PST</option>
          </select>
        </label>
        <label className="service-onboarding-wide-field">
          <span>Business description</span>
          <textarea
            value={form.description}
            onChange={(event) => onFieldChange("description", event.target.value)}
            placeholder={defaultDescription}
            rows={5}
          />
        </label>
      </div>

      <fieldset className="service-onboarding-radio-row">
        <legend>Enter working hours</legend>
        <label>
          <input checked={form.workingMode === "business"} onChange={() => onWorkingModeChange("business")} type="radio" />
          <span>Business hours</span>
        </label>
        <label>
          <input checked={form.workingMode === "open"} onChange={() => onWorkingModeChange("open")} type="radio" />
          <span>Open 24x7</span>
        </label>
        <label>
          <input checked={form.workingMode === "appointment"} onChange={() => onWorkingModeChange("appointment")} type="radio" />
          <span>By appointment</span>
        </label>
      </fieldset>

      {form.workingMode === "business" ? (
        <div className="service-onboarding-hours">
          {hoursDays.map((day) => {
            const isOpen = openDays.includes(day);
            return (
              <div className={isOpen ? "is-open" : ""} key={day}>
                <strong>{day}</strong>
                <button type="button" onClick={() => onToggleOpenDay(day)}>
                  <span />
                </button>
                <em>{isOpen ? "9:00 AM - 6:00 PM" : "Closed"}</em>
              </div>
            );
          })}
        </div>
      ) : null}

      {form.workingMode === "open" ? (
        <div className="service-onboarding-hours service-onboarding-hours-summary">
          <div className="is-open">
            <strong>24x7</strong>
            <i className="material-icons">schedule</i>
            <em>Open 24 hours, every day</em>
          </div>
          {hoursDays.map((day) => (
            <div className="is-open" key={day}>
              <strong>{day}</strong>
              <span className="service-onboarding-hours-badge">Open</span>
              <em>12:00 AM - 11:59 PM</em>
            </div>
          ))}
        </div>
      ) : null}

      {form.workingMode === "appointment" ? (
        <div className="service-onboarding-hours service-onboarding-appointment-panel">
          <div>
            <strong>Booking</strong>
            <i className="material-icons">event_available</i>
            <em>By appointment only</em>
          </div>
          <p>Customers must contact you to confirm availability before visiting or booking this service.</p>
        </div>
      ) : null}
    </div>
  );
}

function ContactStep({
  form,
  onFieldChange,
}: {
  form: ServicePostingForm;
  onFieldChange: <K extends keyof ServicePostingForm>(key: K, value: ServicePostingForm[K]) => void;
}) {
  return (
    <div className="service-onboarding-card-section">
      <div className="service-onboarding-field-grid">
        <label>
          <span>Business contact name</span>
          <input type="text" value={form.contactName} onChange={(event) => onFieldChange("contactName", event.target.value)} />
        </label>
        <label>
          <span>Email</span>
          <input type="email" value={form.email} onChange={(event) => onFieldChange("email", event.target.value)} />
        </label>
        <label className="service-onboarding-wide-field">
          <span>Phone</span>
          <div className="service-onboarding-phone-field">
            <select value={form.phoneCountryCode} onChange={(event) => onFieldChange("phoneCountryCode", event.target.value)}>
              <option>US (+1)</option>
              <option>CA (+1)</option>
              <option>IN (+91)</option>
            </select>
            <input type="tel" value={form.phoneNumber} onChange={(event) => onFieldChange("phoneNumber", event.target.value)} />
          </div>
        </label>
      </div>

      <div className="service-onboarding-verification">
        <h3>Verify your business phone number</h3>
        <p>Phone verification can be completed after your posting is submitted for review.</p>
        <fieldset className="service-onboarding-radio-row">
          <legend>How would you like to verify your phone number?</legend>
          <label>
            <input checked={form.verificationMethod === "sms"} onChange={() => onFieldChange("verificationMethod", "sms")} type="radio" />
            <span>SMS</span>
          </label>
          <label>
            <input checked={form.verificationMethod === "call"} onChange={() => onFieldChange("verificationMethod", "call")} type="radio" />
            <span>Call</span>
          </label>
        </fieldset>
      </div>
    </div>
  );
}

function PackageStep({
  form,
  selectedCategory,
  selectedCount,
  onChoosePackage,
}: {
  form: ServicePostingForm;
  selectedCategory: AllServiceCategoryOption | null;
  selectedCount: number;
  onChoosePackage: (value: string) => void;
}) {
  return (
    <div className="service-onboarding-card-section">
      <div className="service-onboarding-package-head">
        <span>{selectedCategory?.name || "Service"} - {form.primaryServiceLocation || "Service area"}</span>
        <h2>Review and choose a package</h2>
        <p>{selectedCount} detailed service{selectedCount === 1 ? "" : "s"} selected for admin approval.</p>
      </div>

      <div className="service-onboarding-package-grid">
        <article className={form.packageCode === "base" ? "is-selected" : ""}>
          <header className="is-blue">1 Month</header>
          <h3>Base</h3>
          <strong>$50</strong>
          <ul>
            <li>30 days validity</li>
            <li>Standard response visibility</li>
            <li>Basic service listing placement</li>
          </ul>
          <button type="button" onClick={() => onChoosePackage("base")}>Select Base</button>
        </article>
        <article className={form.packageCode === "starter" ? "is-selected" : ""}>
          <header className="is-purple">2 Months</header>
          <h3>Starter</h3>
          <strong>$75</strong>
          <ul>
            <li>60 days validity</li>
            <li>More customer response visibility</li>
            <li>Priority listing signal</li>
          </ul>
          <button type="button" onClick={() => onChoosePackage("starter")}>Select Starter</button>
        </article>
      </div>
    </div>
  );
}

function getStepHeading(step: number) {
  switch (step) {
    case 1:
      return {
        title: "Start with the service you offer",
        description: "Search the new all-services directory, select the main category, and choose detailed services.",
      };
    case 2:
      return {
        title: "Describe your services",
        description: "Add experience, business description, and working hours for customers.",
      };
    case 3:
      return {
        title: "Confirm contact and phone verification",
        description: "Collect the contact details for admin review and customer enquiries.",
      };
    case 4:
      return {
        title: "Submit for admin approval",
        description: "Choose a package and submit the service posting to the admin approval queue.",
      };
    default:
      return {
        title: "Tell us about your service business",
        description: "This posting uses the new all-services tables and does not use listing categories.",
      };
  }
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || "Unable to save service posting.";
  }

  return "Unable to save service posting.";
}

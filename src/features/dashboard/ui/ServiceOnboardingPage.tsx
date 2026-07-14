import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  getAllServiceDirectoryTree,
  type AllServiceCategoryOption,
  type AllServiceDetailedCategoryOption,
  type AllServiceSubCategoryOption,
} from "../../allServices/api/allServiceDirectoryApi";
import { createAllServicePosting, type AllServicePostingPayload } from "../api/allServicePostingsApi";
import { getAllServicePricingPlans, type AllServicePricingPlan } from "../api/allServicePricingPlansApi";
import { lookupPostalCodeLocation } from "../../../shared/api/postalCodeLookup";
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

type ServicePlanCard = {
  code: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  description: string;
  features: string[];
  isHighlighted: boolean;
};

const fallbackServicePlans: ServicePlanCard[] = [
  {
    code: "SERVICE_STARTER",
    name: "Starter Visibility",
    price: 49,
    currency: "USD",
    durationDays: 30,
    description: "Basic paid placement for service providers.",
    features: ["30 days validity", "Standard category placement", "Customer enquiry notifications"],
    isHighlighted: false,
  },
  {
    code: "SERVICE_GROWTH",
    name: "Growth Boost",
    price: 99,
    currency: "USD",
    durationDays: 60,
    description: "Improved visibility for more customer reach.",
    features: ["60 days validity", "Improved search placement", "More service areas"],
    isHighlighted: false,
  },
  {
    code: "SERVICE_PREMIUM",
    name: "Premium Spotlight",
    price: 199,
    currency: "USD",
    durationDays: 90,
    description: "Priority category placement for stronger customer reach.",
    features: ["90 days validity", "Priority placement", "Premium badge"],
    isHighlighted: true,
  },
];

function mapServicePlan(plan: AllServicePricingPlan): ServicePlanCard {
  return {
    code: plan.code,
    name: plan.name,
    price: plan.price,
    currency: plan.currency || "USD",
    durationDays: plan.durationDays,
    description: plan.tagline || "Service provider package.",
    features: plan.features,
    isHighlighted: plan.isHighlighted,
  };
}

type ServicePostingLocation = {
  id: string;
  label: string;
  formattedAddress: string;
  streetAddress: string;
  suite: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: string;
  longitude: string;
};

type ServicePostingLocationField = keyof Omit<ServicePostingLocation, "id">;

type AddressSuggestion = {
  displayName: string;
  latitude: string;
  longitude: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
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
  packageCode: "SERVICE_STARTER",
};

function createBlankServiceLocation(index = 0): ServicePostingLocation {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: index === 0 ? "Primary location" : `Service location ${index + 1}`,
    formattedAddress: "",
    streetAddress: "",
    suite: "",
    city: "",
    state: "",
    postalCode: "",
    country: "United States",
    latitude: "",
    longitude: "",
  };
}

function getServiceLocationDisplay(location?: ServicePostingLocation) {
  if (!location) {
    return "";
  }

  return location.formattedAddress.trim() || [
    location.streetAddress,
    location.suite,
    location.city,
    location.state,
    location.postalCode,
    location.country,
  ].map((part) => part.trim()).filter(Boolean).join(", ");
}

function toServiceLocationPayload(location: ServicePostingLocation, index: number) {
  return {
    label: location.label.trim() || (index === 0 ? "Primary location" : `Service location ${index + 1}`),
    formattedAddress: getServiceLocationDisplay(location),
    streetAddress: location.streetAddress.trim(),
    suite: location.suite.trim(),
    city: location.city.trim(),
    state: location.state.trim(),
    postalCode: location.postalCode.trim(),
    country: location.country.trim(),
    latitude: location.latitude.trim(),
    longitude: location.longitude.trim(),
    isPrimary: index === 0,
  };
}

export default function ServiceOnboardingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<ServicePostingForm>(initialForm);
  const [serviceLocations, setServiceLocations] = useState<ServicePostingLocation[]>(() => [createBlankServiceLocation()]);
  const [openDays, setOpenDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [categories, setCategories] = useState<AllServiceCategoryOption[]>([]);
  const [servicePlans, setServicePlans] = useState<ServicePlanCard[]>(fallbackServicePlans);
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
  const primaryServiceLocation = useMemo(() => getServiceLocationDisplay(serviceLocations[0]), [serviceLocations]);
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

  useEffect(() => {
    getAllServicePricingPlans()
      .then((plans) => {
        const mappedPlans = plans.map(mapServicePlan);
        if (mappedPlans.length) {
          setServicePlans(mappedPlans);
          if (!mappedPlans.some((plan) => plan.code === form.packageCode)) {
            updateField("packageCode", mappedPlans[0].code);
          }
        }
      })
      .catch(() => setServicePlans(fallbackServicePlans));
  }, []);

  useEffect(() => {
    const pendingLookups = serviceLocations
      .map((location) => {
        const postalCode = location.postalCode.trim();

        if (!/^\d{5}$/.test(postalCode) && !/^\d{6}$/.test(postalCode)) {
          return null;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => {
          lookupPostalCodeLocation(postalCode, location.country || undefined, controller.signal)
            .then((postalLocation) => {
              if (!postalLocation) {
                return;
              }

              setServiceLocations((currentLocations) =>
                currentLocations.map((currentLocation) => {
                  if (currentLocation.id !== location.id || currentLocation.postalCode.trim() !== postalCode) {
                    return currentLocation;
                  }

                  return {
                    ...currentLocation,
                    city: postalLocation.city || currentLocation.city,
                    state: postalLocation.state || currentLocation.state,
                    country: postalLocation.country || currentLocation.country,
                    latitude: postalLocation.latitude || currentLocation.latitude,
                    longitude: postalLocation.longitude || currentLocation.longitude,
                  };
                }),
              );
            })
            .catch((error) => {
              if (error instanceof DOMException && error.name === "AbortError") {
                return;
              }
            });
        }, 500);

        return { controller, timeoutId };
      })
      .filter((lookup): lookup is { controller: AbortController; timeoutId: number } => Boolean(lookup));

    return () => {
      pendingLookups.forEach((lookup) => {
        lookup.controller.abort();
        window.clearTimeout(lookup.timeoutId);
      });
    };
  }, [serviceLocations.map((location) => `${location.id}:${location.postalCode}:${location.country}`).join("|")]);

  function updateField<K extends keyof ServicePostingForm>(key: K, value: ServicePostingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice("");
    setErrorMessage("");
  }

  function updateServiceLocation(locationId: string, field: ServicePostingLocationField, value: string) {
    setServiceLocations((currentLocations) =>
      currentLocations.map((location) => (
        location.id === locationId
          ? {
              ...location,
              [field]: value,
              formattedAddress: field === "formattedAddress"
                ? value
                : field === "streetAddress" || field === "suite" || field === "city" || field === "state" || field === "postalCode" || field === "country"
                ? ""
                : location.formattedAddress,
            }
          : location
      )),
    );
    setNotice("");
    setErrorMessage("");
  }

  function selectServiceAddress(locationId: string, suggestion: AddressSuggestion) {
    setServiceLocations((currentLocations) =>
      currentLocations.map((location) => (
        location.id === locationId
          ? {
              ...location,
              formattedAddress: suggestion.displayName,
              streetAddress: suggestion.streetAddress || location.streetAddress,
              city: suggestion.city || location.city,
              state: suggestion.state || location.state,
              postalCode: suggestion.postalCode || location.postalCode,
              country: suggestion.country || location.country,
              latitude: suggestion.latitude,
              longitude: suggestion.longitude,
            }
          : location
      )),
    );
    setNotice("");
    setErrorMessage("");
  }

  function addServiceLocation() {
    setServiceLocations((currentLocations) => [...currentLocations, createBlankServiceLocation(currentLocations.length)]);
    setNotice("");
    setErrorMessage("");
  }

  function removeServiceLocation(locationId: string) {
    setServiceLocations((currentLocations) =>
      currentLocations.length <= 1
        ? currentLocations
        : currentLocations.filter((location) => location.id !== locationId),
    );
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

    if (activeStep === 0) {
      if (!form.businessName.trim()) {
        setErrorMessage("Business or professional name is required.");
        return;
      }

      if (!primaryServiceLocation) {
        setErrorMessage("Add at least one service posting location.");
        return;
      }
    }

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
    if (isSubmitting) {
      return;
    }

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

    if (!primaryServiceLocation) {
      setErrorMessage("Add at least one service posting location.");
      setActiveStep(0);
      return;
    }

    const normalizedServiceLocations = serviceLocations
      .map(toServiceLocationPayload)
      .filter((location) => location.formattedAddress);

    const payload: AllServicePostingPayload = {
      providerType: form.providerType,
      businessName: form.businessName.trim(),
      tagline: form.tagline.trim(),
      primaryServiceLocation,
      serviceLocations: normalizedServiceLocations,
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
                <BusinessProfileStep
                  form={form}
                  serviceLocations={serviceLocations}
                  onAddLocation={addServiceLocation}
                  onFieldChange={updateField}
                  onLocationFieldChange={updateServiceLocation}
                  onRemoveLocation={removeServiceLocation}
                  onSelectAddress={selectServiceAddress}
                />
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
                  primaryServiceLocation={primaryServiceLocation}
                  selectedCategory={selectedCategory}
                  selectedCount={selectedDetailedIds.length}
                  servicePlans={servicePlans}
                  onChoosePackage={(value) => updateField("packageCode", value)}
                />
              ) : null}

              <div className="service-onboarding-actions">
                {activeStep === 0 ? <Link to="/all-services">Back</Link> : <button type="button" onClick={goBack}>Back</button>}
                <button type="button" className="app-loading-button" onClick={() => submitPosting(true)} disabled={isSubmitting} aria-busy={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="app-button-spinner" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : "Save draft"}
                </button>
                {activeStep === setupSteps.length - 1 ? (
                  <button type="button" className="service-onboarding-primary app-loading-button" onClick={() => submitPosting(false)} disabled={isSubmitting} aria-busy={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="app-button-spinner" aria-hidden="true"></span>
                        Submitting...
                      </>
                    ) : "Submit for approval"}
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
  serviceLocations,
  onAddLocation,
  onFieldChange,
  onLocationFieldChange,
  onRemoveLocation,
  onSelectAddress,
}: {
  form: ServicePostingForm;
  serviceLocations: ServicePostingLocation[];
  onAddLocation: () => void;
  onFieldChange: <K extends keyof ServicePostingForm>(key: K, value: ServicePostingForm[K]) => void;
  onLocationFieldChange: (locationId: string, field: ServicePostingLocationField, value: string) => void;
  onRemoveLocation: (locationId: string) => void;
  onSelectAddress: (locationId: string, suggestion: AddressSuggestion) => void;
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
      </div>

      <ServicePostingLocations
        locations={serviceLocations}
        onAddLocation={onAddLocation}
        onFieldChange={onLocationFieldChange}
        onRemoveLocation={onRemoveLocation}
        onSelectAddress={onSelectAddress}
      />
    </>
  );
}

function ServicePostingLocations({
  locations,
  onAddLocation,
  onFieldChange,
  onRemoveLocation,
  onSelectAddress,
}: {
  locations: ServicePostingLocation[];
  onAddLocation: () => void;
  onFieldChange: (locationId: string, field: ServicePostingLocationField, value: string) => void;
  onRemoveLocation: (locationId: string) => void;
  onSelectAddress: (locationId: string, suggestion: AddressSuggestion) => void;
}) {
  return (
    <section className="service-onboarding-location-section">
      <div className="service-onboarding-section-heading">
        <div>
          <h2>Posting locations</h2>
          <p>Add every branch or service area where customers can find this posting.</p>
        </div>
        <button type="button" onClick={onAddLocation}>
          <i className="material-icons">add_location_alt</i>
          Add location
        </button>
      </div>

      <div className="service-onboarding-location-stack">
        {locations.map((location, index) => (
          <ServiceLocationCard
            index={index}
            key={location.id}
            location={location}
            canRemove={locations.length > 1}
            onFieldChange={onFieldChange}
            onRemove={onRemoveLocation}
            onSelectAddress={onSelectAddress}
          />
        ))}
      </div>
    </section>
  );
}

function ServiceLocationCard({
  index,
  location,
  canRemove,
  onFieldChange,
  onRemove,
  onSelectAddress,
}: {
  index: number;
  location: ServicePostingLocation;
  canRemove: boolean;
  onFieldChange: (locationId: string, field: ServicePostingLocationField, value: string) => void;
  onRemove: (locationId: string) => void;
  onSelectAddress: (locationId: string, suggestion: AddressSuggestion) => void;
}) {
  return (
    <article className="service-onboarding-location-card">
      <header>
        <div>
          <span>{index === 0 ? "Primary" : `Location ${index + 1}`}</span>
          <input
            aria-label="Location label"
            value={location.label}
            onChange={(event) => onFieldChange(location.id, "label", event.target.value)}
          />
        </div>
        {canRemove ? (
          <button type="button" onClick={() => onRemove(location.id)} aria-label="Remove location">
            <i className="material-icons">delete</i>
          </button>
        ) : null}
      </header>

      <AddressSearchInput
        location={location}
        onChange={(value) => onFieldChange(location.id, "formattedAddress", value)}
        onSelect={(suggestion) => onSelectAddress(location.id, suggestion)}
      />

      <div className="service-onboarding-field-grid service-onboarding-location-grid">
        <label className="service-onboarding-wide-field">
          <span>Street address or service area</span>
          <input
            type="text"
            value={location.streetAddress}
            onChange={(event) => onFieldChange(location.id, "streetAddress", event.target.value)}
            placeholder="Street address, neighborhood, or service area"
          />
        </label>
        <label>
          <span>Suite / unit</span>
          <input
            type="text"
            value={location.suite}
            onChange={(event) => onFieldChange(location.id, "suite", event.target.value)}
            placeholder="Suite, floor, unit"
          />
        </label>
        <label>
          <span>Zipcode</span>
          <input
            type="text"
            value={location.postalCode}
            onChange={(event) => onFieldChange(location.id, "postalCode", event.target.value)}
            placeholder="Enter zipcode"
          />
        </label>
        <label>
          <span>City</span>
          <input
            type="text"
            value={location.city}
            onChange={(event) => onFieldChange(location.id, "city", event.target.value)}
            placeholder="City"
          />
        </label>
        <label>
          <span>State</span>
          <input
            type="text"
            value={location.state}
            onChange={(event) => onFieldChange(location.id, "state", event.target.value)}
            placeholder="State"
          />
        </label>
        <label>
          <span>Country</span>
          <input
            type="text"
            value={location.country}
            onChange={(event) => onFieldChange(location.id, "country", event.target.value)}
            placeholder="Country"
          />
        </label>
      </div>
    </article>
  );
}

function AddressSearchInput({
  location,
  onChange,
  onSelect,
}: {
  location: ServicePostingLocation;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const query = location.formattedAddress;

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 4) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);
      searchAddressSuggestions(trimmedQuery, location.country, controller.signal)
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
    }, 550);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [location.country, query]);

  return (
    <label className="service-onboarding-search-field service-onboarding-dropdown-field service-onboarding-address-search">
      <span>Search address</span>
      <div className="service-onboarding-input-wrap">
        <input
          type="text"
          value={query}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length) {
              setIsOpen(true);
            }
          }}
          placeholder="Search street, city, zipcode, or business area"
        />
        <i className="material-icons">{isLoading ? "sync" : "search"}</i>
      </div>
      {isOpen ? (
        <div className="service-onboarding-dropdown-menu service-onboarding-address-menu">
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.displayName}-${suggestion.latitude}-${suggestion.longitude}`}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(suggestion);
                setIsOpen(false);
              }}
            >
              <b><i className="material-icons">place</i></b>
              <span>{suggestion.displayName}</span>
            </button>
          ))}
        </div>
      ) : null}
    </label>
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
  primaryServiceLocation,
  selectedCategory,
  selectedCount,
  servicePlans,
  onChoosePackage,
}: {
  form: ServicePostingForm;
  primaryServiceLocation: string;
  selectedCategory: AllServiceCategoryOption | null;
  selectedCount: number;
  servicePlans: ServicePlanCard[];
  onChoosePackage: (value: string) => void;
}) {
  return (
    <div className="service-onboarding-card-section">
      <div className="service-onboarding-package-head">
        <span>{selectedCategory?.name || "Service"} - {primaryServiceLocation || "Service area"}</span>
        <h2>Review and choose a package</h2>
        <p>{selectedCount} detailed service{selectedCount === 1 ? "" : "s"} selected for admin approval.</p>
      </div>

      <div className="service-onboarding-package-grid">
        {servicePlans.map((plan, index) => (
          <article className={form.packageCode === plan.code ? "is-selected" : ""} key={plan.code}>
            <header className={plan.isHighlighted || index % 2 === 1 ? "is-purple" : "is-blue"}>{plan.durationDays} Days</header>
            <h3>{plan.name}</h3>
            <strong>{formatServicePlanPrice(plan)}</strong>
            <ul>
              {(plan.features.length ? plan.features : [plan.description]).slice(0, 4).map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button type="button" onClick={() => onChoosePackage(plan.code)}>Select {plan.name}</button>
          </article>
        ))}
      </div>
    </div>
  );
}

function formatServicePlanPrice(plan: ServicePlanCard) {
  if (plan.price <= 0) {
    return "Free";
  }

  return `${plan.currency || "USD"} ${plan.price}`;
}

type NominatimAddressResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    province?: string;
    postcode?: string;
    country?: string;
  };
};

async function searchAddressSuggestions(query: string, country: string, signal: AbortSignal): Promise<AddressSuggestion[]> {
  const url = new URL(import.meta.env.VITE_ADDRESS_SEARCH_URL || "https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  url.searchParams.set("q", query);

  if (/^[a-z]{2}$/i.test(country.trim())) {
    url.searchParams.set("countrycodes", country.trim().toLowerCase());
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    return [];
  }

  const results = (await response.json()) as NominatimAddressResult[];
  return results.map(mapAddressSuggestion).filter((item): item is AddressSuggestion => Boolean(item));
}

function mapAddressSuggestion(result: NominatimAddressResult): AddressSuggestion | null {
  if (!result.display_name) {
    return null;
  }

  const address = result.address || {};
  const streetAddress = [
    address.house_number,
    address.road || address.pedestrian || address.neighbourhood || address.suburb,
  ].filter(Boolean).join(" ");

  return {
    displayName: result.display_name,
    latitude: result.lat || "",
    longitude: result.lon || "",
    streetAddress,
    city: address.city || address.town || address.village || address.municipality || "",
    state: address.state || address.province || "",
    postalCode: address.postcode || "",
    country: address.country || "",
  };
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

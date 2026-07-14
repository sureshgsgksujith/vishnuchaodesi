import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  getAllServiceDirectoryTree,
  type AllServiceCategoryOption,
} from "../../allServices/api/allServiceDirectoryApi";
import { useHomeSelectedLocation } from "../../home/hooks/useHomeSelectedLocation";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import { createAllServicePosting, type AllServicePostingLocation } from "../api/allServicePostingsApi";
import { getAllServicePricingPlans, type AllServicePricingPlan } from "../api/allServicePricingPlansApi";
import { lookupPostalCodeLocation } from "../../../shared/api/postalCodeLookup";

type LocationForm = {
  label: string;
  location: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude: string;
  longitude: string;
};

type AddressSuggestion = {
  displayName: string;
  location: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude: string;
  longitude: string;
};

type PostingForm = {
  providerType: string;
  businessName: string;
  tagline: string;
  businessImageName: string;
  businessImagePreview: string;
  contactName: string;
  email: string;
  phoneCode: string;
  phone: string;
  verificationMethod: "" | "sms" | "call";
  generatedPhoneOtp: string;
  phoneOtp: string;
  isPhoneVerified: boolean;
  secondaryEmail: string;
  secondaryPhone: string;
  whatsapp: string;
  landline: string;
  serviceSearch: string;
  delivery: string;
  experience: string;
  description: string;
  yearEstablished: string;
  teamSize: string;
  openTime: string;
  closeTime: string;
  website: string;
  facebook: string;
  instagram: string;
  plan: string;
};

type FieldErrors = Record<string, string>;

const totalSteps = 4;
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const paymentModes = ["Cash", "Credit Card", "Debit Card", "UPI / Zelle", "PayPal", "Cheque"];
type ServicePlanCard = {
  code: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  duration: string;
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
    duration: "30 days",
    description: "Basic paid listing with standard category placement.",
    features: ["Standard category placement", "Customer enquiry notifications"],
    isHighlighted: false,
  },
  {
    code: "SERVICE_GROWTH",
    name: "Growth Boost",
    price: 99,
    currency: "USD",
    durationDays: 60,
    duration: "60 days",
    description: "Improved placement with more visibility in service searches.",
    features: ["Improved search placement", "More service areas"],
    isHighlighted: false,
  },
  {
    code: "SERVICE_PREMIUM",
    name: "Premium Spotlight",
    price: 199,
    currency: "USD",
    durationDays: 90,
    duration: "90 days",
    description: "Priority category placement for stronger customer reach.",
    features: ["Priority placement", "Premium badge"],
    isHighlighted: true,
  },
  {
    code: "SERVICE_ELITE",
    name: "Elite Featured",
    price: 299,
    currency: "USD",
    durationDays: 120,
    duration: "120 days",
    description: "Top visibility package for featured local service promotion.",
    features: ["Featured placement", "Highest visibility package"],
    isHighlighted: false,
  },
];

function mapServicePlan(plan: AllServicePricingPlan): ServicePlanCard {
  return {
    code: plan.code,
    name: plan.name,
    price: plan.price,
    currency: plan.currency || "USD",
    durationDays: plan.durationDays,
    duration: `${plan.durationDays} days`,
    description: plan.tagline || "Service provider package.",
    features: plan.features,
    isHighlighted: plan.isHighlighted,
  };
}

const stepMeta = [
  { title: "Enter basic information", subtitle: "Tell us about your business name, location and contact details." },
  { title: "Select your service", subtitle: "Choose your primary service and map all the services you offer." },
  { title: "Complete your profile", subtitle: "Add photos, description, working hours and payment details to build trust." },
  { title: "Review and submit", subtitle: "Review your listing details and submit for verification." },
];

const professionOptions = [
  ["Service Professional", "Experts delivering personalized services at your location (e.g., Beauticians, Astrologers)."],
  ["Commercial Establishment", "Providers offering services at their business premises (e.g., Beauty Salon, Grocery Store)."],
  ["Brand Business", "Businesses building customer trust through a recognizable brand."],
  ["Channel Partner", "Professionals acting as a bridge between clients and service providers."],
];

const initialForm: PostingForm = {
  providerType: "Service Professional",
  businessName: "",
  tagline: "",
  businessImageName: "",
  businessImagePreview: "",
  contactName: "",
  email: "",
  phoneCode: "+1",
  phone: "",
  verificationMethod: "",
  generatedPhoneOtp: "",
  phoneOtp: "",
  isPhoneVerified: false,
  secondaryEmail: "",
  secondaryPhone: "",
  whatsapp: "",
  landline: "",
  serviceSearch: "",
  delivery: "At customer location",
  experience: "",
  description: "",
  yearEstablished: "",
  teamSize: "",
  openTime: "09:00",
  closeTime: "18:00",
  website: "",
  facebook: "",
  instagram: "",
  plan: "",
};

function blankLocation(label: string, country = "United States"): LocationForm {
  return {
    label,
    location: "",
    city: "",
    state: "",
    zip: "",
    country,
    latitude: "",
    longitude: "",
  };
}

function addTemplateAssets() {
  const head = document.head;
  const assets = [
    ["link", "spaw-font-source", "https://fonts.googleapis.com/css?family=Oswald:700|Source+Sans+Pro:300,400,600,700&display=swap"],
    ["link", "spaw-font-icons", "https://fonts.googleapis.com/icon?family=Material+Icons"],
    ["link", "spaw-bootstrap", "/template-17/css/bootstrap.css"],
    ["link", "spaw-theme", "/template-17/css/theme-color.css"],
    ["link", "spaw-style", "/template-17/css/style.css"],
    ["link", "spaw-fonts", "/template-17/css/fonts.css"],
    ["link", "spaw-custom", "/template-17/css/custom.css"],
  ];

  assets.forEach(([tagName, id, href]) => {
    if (document.getElementById(id)) {
      return;
    }

    const element = document.createElement(tagName);
    element.id = id;
    element.setAttribute("rel", "stylesheet");
    element.setAttribute("href", href);
    head.appendChild(element);
  });
}

function formatLocation(location: LocationForm) {
  return [location.location, location.city, location.state, location.zip, location.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function formatServicePlanPrice(plan: ServicePlanCard) {
  if (plan.price <= 0) {
    return "Free";
  }

  return `${plan.currency || "USD"} ${plan.price}`;
}

function yearsToNumber(value: string) {
  if (value.includes("10+")) return 10;
  if (value.includes("5 - 10")) return 5;
  if (value.includes("3 - 5")) return 3;
  if (value.includes("1 - 3")) return 1;
  return 0;
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || "Unable to submit service posting.";
  }

  return "Unable to submit service posting.";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, "");
}

function createDemoOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function parseServiceAreas(value: string) {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeServiceAreas(currentAreas: string[], inputValue: string) {
  const merged = [...currentAreas];

  parseServiceAreas(inputValue).forEach((area) => {
    if (!merged.some((item) => item.toLowerCase() === area.toLowerCase())) {
      merged.push(area);
    }
  });

  return merged;
}

function scrollToFirstFieldError() {
  window.setTimeout(() => {
    const firstError = document.querySelector<HTMLElement>(".spaw-field-error, .spaw-input-error");
    firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 50);
}

export default function ServicePartnerPostingPage() {
  const { currentLocation, selectedLocation } = useHomeSelectedLocation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [primaryLocation, setPrimaryLocation] = useState(() => blankLocation("Primary location"));
  const [branches, setBranches] = useState<LocationForm[]>([]);
  const [categories, setCategories] = useState<AllServiceCategoryOption[]>([]);
  const [servicePlans, setServicePlans] = useState<ServicePlanCard[]>(fallbackServicePlans);
  const [selectedCategory, setSelectedCategory] = useState<AllServiceCategoryOption | null>(null);
  const [selectedDetailedIds, setSelectedDetailedIds] = useState<number[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [areaInput, setAreaInput] = useState("");
  const [openDays, setOpenDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [payments, setPayments] = useState(["Cash"]);
  const [showSecondaryEmail, setShowSecondaryEmail] = useState(false);
  const [showSecondaryPhone, setShowSecondaryPhone] = useState(false);
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [showLandline, setShowLandline] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentGatewayOpen, setIsPaymentGatewayOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paidPlan, setPaidPlan] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [successReference, setSuccessReference] = useState("");

  const currentMeta = stepMeta[step - 1];
  const homeLocationDefaults = useMemo(() => ({
    country: selectedLocation.countryName || currentLocation.country || "United States",
  }), [
    currentLocation.country,
    selectedLocation.countryName,
  ]);
  const serviceAreas = useMemo(() => mergeServiceAreas(areas, areaInput), [areaInput, areas]);
  const isSelectedPlanPaid = Boolean(form.plan && paidPlan === form.plan && paymentReference);
  const progress = useMemo(() => {
    const filled = [
      form.providerType,
      form.businessName,
      formatLocation(primaryLocation),
      form.contactName,
      form.email,
      form.phone,
      selectedCategory?.name || "",
      selectedDetailedIds.length ? "services" : "",
      serviceAreas.length ? "areas" : "",
      form.description,
      isSelectedPlanPaid ? "payment" : "",
      acceptedTerms ? "terms" : "",
    ].filter(Boolean).length;

    return Math.min(100, Math.round((filled / 12) * 100));
  }, [acceptedTerms, form, isSelectedPlanPaid, primaryLocation, selectedCategory, selectedDetailedIds.length, serviceAreas.length]);

  const filteredCategories = useMemo(() => {
    const query = form.serviceSearch.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return categories.filter((category) => [
      category.name,
      ...category.subCategories.flatMap((sub) => [
        sub.name,
        ...sub.detailedCategories.map((detail) => detail.name),
      ]),
    ].join(" ").toLowerCase().includes(query)).slice(0, 8);
  }, [categories, form.serviceSearch]);

  useEffect(() => {
    addTemplateAssets();
    document.body.classList.add("spa-biz-page");
    return () => document.body.classList.remove("spa-biz-page");
  }, []);

  useEffect(() => {
    let isActive = true;
    getAllServiceDirectoryTree()
      .then((items) => {
        if (isActive) {
          setCategories(items);
        }
      })
      .catch(() => setNotice("Unable to load service categories."));

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
        }
      })
      .catch(() => setServicePlans(fallbackServicePlans));
  }, []);

  useEffect(() => {
    if (!homeLocationDefaults.country) {
      return;
    }

    setPrimaryLocation((current) => ({
      ...current,
      country: current.country && current.country !== "United States" ? current.country : homeLocationDefaults.country,
    }));

    setBranches((current) =>
      current.map((branch) => ({
        ...branch,
        country: branch.country && branch.country !== "United States" ? branch.country : homeLocationDefaults.country,
      }))
    );
  }, [homeLocationDefaults.country]);

  useEffect(() => {
    const locations = [primaryLocation, ...branches];
    const timers = locations.map((location, index) => {
      const zip = location.zip.trim();
      if (!/^\d{5}$/.test(zip) && !/^\d{6}$/.test(zip)) {
        return null;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        lookupPostalCodeLocation(zip, location.country, controller.signal)
          .then((result) => {
            if (!result) return;
            const next = { ...location, city: result.city || location.city, state: result.state || location.state, country: result.country || location.country, latitude: result.latitude || "", longitude: result.longitude || "" };
            if (index === 0) {
              setPrimaryLocation((current) => current.zip === zip ? { ...current, ...next } : current);
            } else {
              setBranches((current) => current.map((branch, branchIndex) => branchIndex === index - 1 && branch.zip === zip ? { ...branch, ...next } : branch));
            }
          })
          .catch(() => undefined);
      }, 450);

      return { controller, timeoutId };
    }).filter((timer): timer is { controller: AbortController; timeoutId: number } => Boolean(timer));

    return () => timers.forEach((timer) => {
      timer.controller.abort();
      window.clearTimeout(timer.timeoutId);
    });
  }, [[primaryLocation, ...branches].map((location) => `${location.zip}:${location.country}`).join("|")]);

  function updateField<K extends keyof PostingForm>(key: K, value: PostingForm[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "phone" || key === "phoneCode") {
        next.isPhoneVerified = false;
        next.verificationMethod = "";
        next.phoneOtp = "";
        next.generatedPhoneOtp = "";
      }

      if (key === "verificationMethod") {
        next.isPhoneVerified = false;
        next.phoneOtp = "";
        next.generatedPhoneOtp = current.phone.trim() && cleanPhone(current.phone).length >= 7 ? createDemoOtp() : "";
      }
      return next;
    });
    setNotice("");
    setFieldErrors((current) => {
      if (!current[key] && !(key === "phone" || key === "phoneCode" || key === "verificationMethod")) return current;
      const next = { ...current };
      delete next[key];
      if (key === "phone" || key === "phoneCode" || key === "verificationMethod") {
        delete next.phone;
        delete next.phoneOtp;
      }
      return next;
    });
  }

  function clearBusinessImageError() {
    setFieldErrors((current) => {
      if (!current.businessImage) return current;
      const next = { ...current };
      delete next.businessImage;
      return next;
    });
  }

  function handleBusinessImageChange(file: File | null) {
    setNotice("");
    clearBusinessImageError();

    if (!file) {
      setForm((current) => ({ ...current, businessImageName: "", businessImagePreview: "" }));
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setForm((current) => ({ ...current, businessImageName: "", businessImagePreview: "" }));
      setFieldErrors((current) => ({ ...current, businessImage: "Upload a JPG, PNG, or WebP image." }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setForm((current) => ({ ...current, businessImageName: "", businessImagePreview: "" }));
      setFieldErrors((current) => ({ ...current, businessImage: "Image size must be 5 MB or less." }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        businessImageName: file.name,
        businessImagePreview: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
  }

  function selectListingPlan(plan: string) {
    updateField("plan", plan);
    setPaidPlan("");
    setPaymentReference("");
    setIsPaymentGatewayOpen(false);
    setIsProcessingPayment(false);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.plan;
      delete next.payment;
      return next;
    });
  }

  function openDummyPaymentGateway() {
    if (!form.plan) {
      setFieldErrors((current) => ({ ...current, plan: "Select a listing plan before payment." }));
      scrollToFirstFieldError();
      return;
    }

    setNotice("");
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.plan;
      delete next.payment;
      return next;
    });
    setIsPaymentGatewayOpen(true);
  }

  function completeDummyPayment() {
    if (!form.plan || isProcessingPayment) {
      return;
    }

    setIsProcessingPayment(true);
    window.setTimeout(() => {
      setPaidPlan(form.plan);
      setPaymentReference(`DUMMY-${Date.now()}`);
      setIsPaymentGatewayOpen(false);
      setIsProcessingPayment(false);
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.plan;
        delete next.payment;
        return next;
      });
    }, 700);
  }

  function updateLocation(index: number, value: Partial<LocationForm>) {
    setNotice("");
    setFieldErrors((current) => {
      const key = index === 0 ? "primaryLocation" : `branchLocation${index}`;
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

    if (index === 0) {
      setPrimaryLocation((current) => ({ ...current, ...value }));
      return;
    }

    setBranches((current) => current.map((branch, branchIndex) => branchIndex === index - 1 ? { ...branch, ...value } : branch));
  }

  function chooseCategory(category: AllServiceCategoryOption) {
    setSelectedCategory(category);
    setSelectedDetailedIds([]);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.serviceCategory;
      delete next.detailedServices;
      return next;
    });
    updateField("serviceSearch", category.name);
  }

  function toggleDetailed(id: number) {
    setSelectedDetailedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setFieldErrors((current) => {
      if (!current.detailedServices) return current;
      const next = { ...current };
      delete next.detailedServices;
      return next;
    });
  }

  function toggleValue(value: string, current: string[], setter: (value: string[]) => void) {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function addArea() {
    const nextAreas = mergeServiceAreas(areas, areaInput);
    if (nextAreas.length !== areas.length) {
      setAreas(nextAreas);
      setFieldErrors((current) => {
        if (!current.serviceAreas) return current;
        const next = { ...current };
        delete next.serviceAreas;
        return next;
      });
    }
    setAreaInput("");
  }

  function updateAreaInput(value: string) {
    setAreaInput(value);
    if (value.trim()) {
      setFieldErrors((current) => {
        if (!current.serviceAreas) return current;
        const next = { ...current };
        delete next.serviceAreas;
        return next;
      });
      setNotice("");
    }
  }

  function validatePhoneOtp() {
    const errors: FieldErrors = {};
    if (!form.phone.trim()) {
      errors.phone = "Enter a phone number before validating.";
    } else if (cleanPhone(form.phone).length < 7) {
      errors.phone = "Enter a valid phone number before validating.";
    }

    if (!form.verificationMethod) {
      errors.phoneOtp = "Select SMS or Call to receive OTP.";
    }

    if (!form.verificationMethod) {
      // The user must choose how to receive the OTP before entering it.
    } else if (!form.phoneOtp.trim()) {
      errors.phoneOtp = "Enter the OTP received by phone.";
    } else if (!/^\d{4,6}$/.test(form.phoneOtp.trim())) {
      errors.phoneOtp = "Enter a valid 4 to 6 digit OTP.";
    } else if (form.generatedPhoneOtp && form.phoneOtp.trim() !== form.generatedPhoneOtp) {
      errors.phoneOtp = "OTP does not match. Enter the OTP shown above.";
    }

    if (Object.keys(errors).length) {
      setFieldErrors((current) => ({ ...current, ...errors }));
      setNotice("Please fix the highlighted fields.");
      scrollToFirstFieldError();
      return;
    }

    setForm((current) => ({ ...current, isPhoneVerified: true }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.phone;
      delete next.phoneOtp;
      return next;
    });
    setNotice("");
  }

  function validateStep(nextStep: number) {
    const errors: FieldErrors = {};

    if (step === 1) {
      if (form.businessName.trim().length < 3) {
        errors.businessName = "Enter a business name with at least 3 characters.";
      }

      if (!primaryLocation.location.trim()) {
        errors.primaryLocation = "Select a business location from the suggestions.";
      } else if (!primaryLocation.city.trim()) {
        errors.primaryLocation = "City is missing. Select a more specific city/address suggestion or enter city manually.";
      } else if (!primaryLocation.zip.trim() && getCountryCode(primaryLocation.country) === "us") {
        errors.primaryLocation = "ZIP code is missing. Select a city/address suggestion or enter ZIP code manually.";
      }

      if (!form.contactName.trim()) {
        errors.contactName = "Enter the business contact name.";
      }

      if (!form.email.trim()) {
        errors.email = "Enter an email address.";
      } else if (!isValidEmail(form.email)) {
        errors.email = "Enter a valid email address.";
      }

      if (!form.phone.trim()) {
        errors.phone = "Enter a phone number.";
      } else if (cleanPhone(form.phone).length < 7) {
        errors.phone = "Enter a valid phone number.";
      } else if (!form.verificationMethod) {
        errors.phoneOtp = "Select SMS or Call to receive OTP.";
      } else if (!form.isPhoneVerified) {
        errors.phoneOtp = "Validate the phone number using OTP.";
      }

      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setNotice("Please fix the highlighted fields.");
        scrollToFirstFieldError();
        return false;
      }
    }

    if (step === 2) {
      if (!selectedCategory) {
        errors.serviceCategory = "Select the main service category.";
      }

      if (!selectedDetailedIds.length) {
        errors.detailedServices = "Select at least one detailed service.";
      }

      const nextAreas = mergeServiceAreas(areas, areaInput);
      if (!nextAreas.length) {
        errors.serviceAreas = "Add at least one service area.";
      }

      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setNotice("Please fix the highlighted fields.");
        scrollToFirstFieldError();
        return false;
      }

      if (nextAreas.length !== areas.length || areaInput.trim()) {
        setAreas(nextAreas);
        setAreaInput("");
      }
    }

    if (step === 3 && form.description.trim().length < 20) {
      errors.description = "Add a business description with at least 20 characters.";
      setFieldErrors(errors);
      setNotice("Please fix the highlighted fields.");
      scrollToFirstFieldError();
      return false;
    }

    setFieldErrors({});
    setNotice("");
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (isSubmitting) {
      return;
    }

    if (!selectedCategory || !selectedDetailedIds.length || !form.plan || !isSelectedPlanPaid || !acceptedTerms) {
      const errors: FieldErrors = {};
      if (!selectedCategory) errors.serviceCategory = "Select the main service category.";
      if (!selectedDetailedIds.length) errors.detailedServices = "Select at least one detailed service.";
      if (!form.plan) errors.plan = "Select one paid service plan.";
      if (form.plan && !isSelectedPlanPaid) errors.payment = "Complete payment before submitting your service posting.";
      if (!acceptedTerms) errors.terms = "Accept the terms to submit your service posting.";
      setFieldErrors(errors);
      setNotice("Please fix the highlighted fields.");
      scrollToFirstFieldError();
      return;
    }

    const locations: AllServicePostingLocation[] = [primaryLocation, ...branches]
      .map((location, index) => ({
        label: location.label || (index === 0 ? "Primary location" : `Branch ${index}`),
        formattedAddress: formatLocation(location),
        streetAddress: location.location,
        city: location.city,
        state: location.state,
        postalCode: location.zip,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        isPrimary: index === 0,
      }))
      .filter((location) => location.formattedAddress);

    try {
      setIsSubmitting(true);
      const posting = await createAllServicePosting({
        providerType: form.providerType,
        businessName: form.businessName.trim(),
        tagline: form.tagline.trim(),
        primaryServiceLocation: locations[0]?.formattedAddress || formatLocation(primaryLocation),
        serviceLocations: locations,
        allServiceCategoryId: selectedCategory.id,
        serviceName: selectedCategory.name,
        selectedDetailedCategoryIds: selectedDetailedIds,
        experienceYears: yearsToNumber(form.experience),
        timeZone: "EST",
        description: form.description.trim(),
        workingMode: form.delivery,
        openDays,
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phoneCountryCode: form.phoneCode,
        phoneNumber: form.phone.trim(),
        verificationMethod: form.verificationMethod,
        isPhoneVerified: form.isPhoneVerified,
        packageCode: form.plan,
        saveAsDraft: false,
      });
      setSuccessReference(String(posting.id));
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successReference) {
    return (
      <main className="spa-biz-page">
        <TemplateHeader />
        <section className="spaw-wrap">
          <div className="container">
            <div className="spaw-success" style={{ display: "block" }}>
              <i className="material-icons">check_circle</i>
              <h2>You're all set!</h2>
              <p>Thanks for submitting your business details. Reference #{successReference}. Our team will review your listing and notify you once it goes live.</p>
              <a href="/" className="spaw-btn spaw-btn-next">Back to Home</a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="spa-biz-page">
      <TemplateHeader />
      <PromoBar />

      <section className="spaw-page-head">
        <div className="container">
          <nav className="spaw-crumb" aria-label="breadcrumb">
            <a href="/">Home</a><span>/</span><a href="/all-services">All Services</a><span>/</span><span className="spaw-crumb-cur">Post Your Business</span>
          </nav>
          <h1>{currentMeta.title}</h1>
          <p>{currentMeta.subtitle}</p>
          <Stepper step={step} onStep={setStep} />
        </div>
      </section>

      <section className="spaw-wrap">
        <div className="container">
          <div className="spaw-layout">
            <div className="spaw-main">
              <form id="spawForm" onSubmit={submit}>
                {step === 1 ? (
                  <StepBasic
                    form={form}
                    primaryLocation={primaryLocation}
                    branches={branches}
                    errors={fieldErrors}
                    showSecondaryEmail={showSecondaryEmail}
                    showSecondaryPhone={showSecondaryPhone}
                    showWhatsapp={showWhatsapp}
                    showLandline={showLandline}
                    onField={updateField}
                    onLocation={updateLocation}
                    onAddBranch={() => setBranches((current) => [...current, blankLocation(`Branch ${current.length + 1}`, homeLocationDefaults.country)])}
                    onRemoveBranch={(index) => setBranches((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    onBusinessImageChange={handleBusinessImageChange}
                    onBusinessImageRemove={() => handleBusinessImageChange(null)}
                    onValidatePhoneOtp={validatePhoneOtp}
                    onToggleSecondaryEmail={setShowSecondaryEmail}
                    onToggleSecondaryPhone={setShowSecondaryPhone}
                    onToggleWhatsapp={setShowWhatsapp}
                    onToggleLandline={setShowLandline}
                  />
                ) : null}

                {step === 2 ? (
                  <StepService
                    form={form}
                    filteredCategories={filteredCategories}
                    selectedCategory={selectedCategory}
                    selectedDetailedIds={selectedDetailedIds}
                    areas={areas}
                    areaInput={areaInput}
                    errors={fieldErrors}
                    onAreaInput={updateAreaInput}
                    onAddArea={addArea}
                    onRemoveArea={(index) => setAreas((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    onChooseCategory={chooseCategory}
                    onField={updateField}
                    onToggleDetailed={toggleDetailed}
                  />
                ) : null}

                {step === 3 ? (
                  <StepProfile
                    form={form}
                    openDays={openDays}
                    payments={payments}
                    errors={fieldErrors}
                    onField={updateField}
                    onToggleDay={(day) => toggleValue(day, openDays, setOpenDays)}
                    onTogglePayment={(payment) => toggleValue(payment, payments, setPayments)}
                  />
                ) : null}

                {step === 4 ? (
                  <StepReview
                    form={form}
                    primaryLocation={primaryLocation}
                    branches={branches}
                    selectedCategory={selectedCategory}
                    selectedDetailedIds={selectedDetailedIds}
                    servicePlans={servicePlans}
                    areas={serviceAreas}
                    openDays={openDays}
                    payments={payments}
                    acceptedTerms={acceptedTerms}
                    isPaymentGatewayOpen={isPaymentGatewayOpen}
                    isPaymentPaid={isSelectedPlanPaid}
                    isProcessingPayment={isProcessingPayment}
                    paymentReference={paymentReference}
                    errors={fieldErrors}
                    onGoto={setStep}
                    onPlan={selectListingPlan}
                    onOpenPayment={openDummyPaymentGateway}
                    onCompletePayment={completeDummyPayment}
                    onTerms={(value) => {
                      setAcceptedTerms(value);
                      setFieldErrors((current) => {
                        if (!current.terms) return current;
                        const next = { ...current };
                        delete next.terms;
                        return next;
                      });
                    }}
                  />
                ) : null}
              </form>

              <div className="spaw-actions">
                <button type="button" className="spaw-btn spaw-btn-back" style={{ visibility: step === 1 ? "hidden" : "visible" }} onClick={() => setStep((current) => Math.max(1, current - 1))}>
                  <i className="material-icons">arrow_back</i> Back
                </button>
                <div className="spaw-actions-right">
                  {step < totalSteps ? (
                    <button type="button" className="spaw-btn spaw-btn-next" onClick={() => validateStep(step + 1)} disabled={isSubmitting}>Next</button>
                  ) : (
                    <button type="button" className="spaw-btn spaw-btn-submit app-loading-button" onClick={() => submit()} disabled={isSubmitting || !isSelectedPlanPaid} aria-busy={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <span className="app-button-spinner" aria-hidden="true"></span>
                          Submitting...
                        </>
                      ) : "Submit for Review"}
                    </button>
                  )}
                </div>
              </div>
              {notice ? <p className="spaw-tip-note" style={{ color: "#d12b2b", marginTop: 12 }}>{notice}</p> : null}
            </div>

            <aside className="spaw-side">
              <div className="spaw-side-card spaw-progress-card">
                <div className="spaw-progress-head">
                  <span>Completion status</span>
                  <b>{progress}% completed</b>
                </div>
                <div className="spaw-progress-track"><span className="spaw-progress-fill" style={{ width: `${progress}%` }} /></div>
              </div>
              <TipCard providerType={form.providerType} />
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function TemplateHeader() {
  return <UserHomeHeader hideAddAction />;
}

function PromoBar() {
  const [show, setShow] = useState(true);
  return show ? (
    <div className="spaw-promo-bar">
      <span>Get up to 10% off. List your service now! Use code <strong>CHAODESI10</strong></span>
      <button type="button" className="spaw-promo-close" aria-label="Close" onClick={() => setShow(false)}>&times;</button>
    </div>
  ) : null;
}

function Stepper({ step, onStep }: { step: number; onStep: (step: number) => void }) {
  return (
    <div className="spaw-stepper">
      {[1, 2, 3, 4].map((item, index) => (
        <FragmentStep key={item} item={item} activeStep={step} isLast={index === 3} onStep={onStep} />
      ))}
    </div>
  );
}

function FragmentStep({ item, activeStep, isLast, onStep }: { item: number; activeStep: number; isLast: boolean; onStep: (step: number) => void }) {
  return (
    <>
      <div className={`spaw-step-item ${item === activeStep ? "active" : ""} ${item < activeStep ? "completed" : ""}`} onClick={() => onStep(item)}>
        <span className="spaw-step-circle">{item < activeStep ? <i className="material-icons">check</i> : item}</span>
      </div>
      {!isLast ? <span className={`spaw-step-track ${item < activeStep ? "filled" : ""}`} /> : null}
    </>
  );
}

function StepBasic({
  form,
  primaryLocation,
  branches,
  errors,
  showSecondaryEmail,
  showSecondaryPhone,
  showWhatsapp,
  showLandline,
  onField,
  onLocation,
  onAddBranch,
  onRemoveBranch,
  onBusinessImageChange,
  onBusinessImageRemove,
  onValidatePhoneOtp,
  onToggleSecondaryEmail,
  onToggleSecondaryPhone,
  onToggleWhatsapp,
  onToggleLandline,
}: {
  form: PostingForm;
  primaryLocation: LocationForm;
  branches: LocationForm[];
  errors: FieldErrors;
  showSecondaryEmail: boolean;
  showSecondaryPhone: boolean;
  showWhatsapp: boolean;
  showLandline: boolean;
  onField: <K extends keyof PostingForm>(key: K, value: PostingForm[K]) => void;
  onLocation: (index: number, value: Partial<LocationForm>) => void;
  onAddBranch: () => void;
  onRemoveBranch: (index: number) => void;
  onBusinessImageChange: (file: File | null) => void;
  onBusinessImageRemove: () => void;
  onValidatePhoneOtp: () => void;
  onToggleSecondaryEmail: (value: boolean) => void;
  onToggleSecondaryPhone: (value: boolean) => void;
  onToggleWhatsapp: (value: boolean) => void;
  onToggleLandline: (value: boolean) => void;
}) {
  return (
    <div className="spaw-panel active">
      <div className="spaw-field-block">
        <label className="spaw-label">What best describes your business or profession? <span className="spaw-req">*</span></label>
        <div className="spaw-prof-grid">
          {professionOptions.map(([title, description]) => (
            <label className={`spaw-prof-card ${form.providerType === title ? "active" : ""}`} key={title}>
              <input type="radio" checked={form.providerType === title} onChange={() => onField("providerType", title)} />
              <span className="spaw-prof-radio" />
              <span className="spaw-prof-text"><strong>{title}</strong><em>{description}</em></span>
            </label>
          ))}
        </div>
      </div>

      <TextField label="Enter Your Business Name ?" required small="(Min. 3 characters)" value={form.businessName} error={errors.businessName} onChange={(value) => onField("businessName", value)} placeholder="Business name" />
      <TextField label="Your Business Motto?" value={form.tagline} onChange={(value) => onField("tagline", value)} placeholder="Business tagline" />
      <BusinessImageUpload
        fileName={form.businessImageName}
        preview={form.businessImagePreview}
        error={errors.businessImage}
        onChange={onBusinessImageChange}
        onRemove={onBusinessImageRemove}
      />

      <LocationFields title="Business Service Location?" location={primaryLocation} index={0} error={errors.primaryLocation} onChange={onLocation} />

      <div className="spaw-check-row">
        <label className="spaw-checkbox">
          <input type="checkbox" checked={branches.length > 0} onChange={(event) => event.target.checked ? onAddBranch() : branches.forEach((_, index) => onRemoveBranch(index))} />
          <span /> Do you have other business locations?
        </label>
      </div>
      {branches.length ? (
        <div className="spaw-branch-wrap" style={{ display: "block" }}>
          <div className="spaw-branch-list">
            {branches.map((branch, index) => (
              <BranchLocationRow
                branch={branch}
                index={index}
                key={`${branch.label}-${index}`}
                onChange={(value) => onLocation(index + 1, value)}
                onRemove={() => onRemoveBranch(index)}
              />
            ))}
          </div>
          <button type="button" className="spaw-add-link" onClick={onAddBranch}><i className="material-icons">add</i> Add another branch</button>
        </div>
      ) : null}

      <TextField label="Official Business Contact" required value={form.contactName} error={errors.contactName} onChange={(value) => onField("contactName", value)} placeholder="Contact name" />
      <TextField label="Email" required small="This email address will be used to access your dashboard and receive all responses." type="email" value={form.email} error={errors.email} onChange={(value) => onField("email", value)} placeholder="Email address" />
      <Toggle label="Add a secondary email address (Optional)" value={showSecondaryEmail} onChange={onToggleSecondaryEmail} />
      {showSecondaryEmail ? <TextField value={form.secondaryEmail} onChange={(value) => onField("secondaryEmail", value)} placeholder="Secondary email address" /> : null}

      <div className={`spaw-field-block${errors.phone ? " spaw-input-error" : ""}`}>
        <label className="spaw-label">Phone <span className="spaw-req">*</span><small>All responses will be directed to the latest phone number updated here.</small></label>
        <div className="spaw-phone-group">
          <select className="spaw-phone-code" value={form.phoneCode} onChange={(event) => onField("phoneCode", event.target.value)}>
            <option value="+1">US (+1)</option><option value="+91">IN (+91)</option><option value="+44">UK (+44)</option><option value="+61">AU (+61)</option><option value="+971">UAE (+971)</option>
          </select>
          <input type="tel" className={`spaw-input${errors.phone ? " is-invalid" : ""}`} value={form.phone} onChange={(event) => onField("phone", event.target.value)} placeholder="Contact number" />
        </div>
        <FieldError message={errors.phone} />
        <div className="spaw-phone-verify">
          <div className="spaw-verify-methods" role="radiogroup" aria-label="Phone verification method">
            <label>
              <input name="phoneVerificationMethod" type="radio" checked={form.verificationMethod === "sms"} onChange={() => onField("verificationMethod", "sms")} />
              <span>SMS</span>
            </label>
            <label>
              <input name="phoneVerificationMethod" type="radio" checked={form.verificationMethod === "call"} onChange={() => onField("verificationMethod", "call")} />
              <span>Call</span>
            </label>
          </div>
          {form.verificationMethod && form.generatedPhoneOtp ? (
            <div className="spaw-demo-otp">
              Demo OTP sent by {form.verificationMethod === "sms" ? "SMS" : "Call"}: <strong>{form.generatedPhoneOtp}</strong>
            </div>
          ) : null}
          <div className="spaw-otp-row">
            <input
              type="text"
              inputMode="numeric"
              className={`spaw-input${errors.phoneOtp ? " is-invalid" : ""}`}
              value={form.phoneOtp}
              onChange={(event) => onField("phoneOtp", event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter OTP"
              disabled={!form.verificationMethod || form.isPhoneVerified}
            />
            <button type="button" className="spaw-otp-btn" onClick={onValidatePhoneOtp} disabled={form.isPhoneVerified}>
              {form.isPhoneVerified ? "Validated" : "Validate"}
            </button>
          </div>
          <FieldError message={errors.phoneOtp} />
          {form.isPhoneVerified ? <div className="spaw-verify-success">Phone number validated by {form.verificationMethod === "sms" ? "SMS" : "Call"}.</div> : null}
        </div>
      </div>
      <Toggle label="Would you like to add a secondary phone number?" value={showSecondaryPhone} onChange={onToggleSecondaryPhone} />
      {showSecondaryPhone ? <TextField value={form.secondaryPhone} onChange={(value) => onField("secondaryPhone", value)} placeholder="Secondary phone number" /> : null}
      <Toggle label="Would you like to add a WhatsApp number?" value={showWhatsapp} onChange={onToggleWhatsapp} />
      {showWhatsapp ? <TextField value={form.whatsapp} onChange={(value) => onField("whatsapp", value)} placeholder="WhatsApp number" /> : null}
      <Toggle label="Would you like to add a landline number?" value={showLandline} onChange={onToggleLandline} />
      {showLandline ? <TextField value={form.landline} onChange={(value) => onField("landline", value)} placeholder="Landline number" /> : null}
    </div>
  );
}

function LocationFields({ title, location, index, error, onChange }: { title: string; location: LocationForm; index: number; error?: string; onChange: (index: number, value: Partial<LocationForm>) => void }) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const selectedLocationRef = useRef("");
  const locationPlaceholder = index === 0 ? "Location" : "Branch location";

  function applySuggestion(suggestion: AddressSuggestion) {
    selectedLocationRef.current = suggestion.location;
    onChange(index, suggestion);
    setSuggestions([]);
    setIsOpen(false);

    if (suggestion.zip) {
      return;
    }

    const controller = new AbortController();
    lookupCityPostalCode(suggestion.city, suggestion.state, suggestion.country || location.country, controller.signal)
      .then((zip) => {
        if (zip) {
          onChange(index, { zip });
        }
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    const query = location.location.trim();
    if (query && query === selectedLocationRef.current) {
      setSuggestions([]);
      setIsOpen(false);
      return undefined;
    }

    if (query.length < 4) {
      setSuggestions([]);
      setIsOpen(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      searchAddressSuggestions(query, location.country, controller.signal)
        .then((items) => {
          setSuggestions(items);
          setIsOpen(items.length > 0);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
            setIsOpen(false);
          }
        });
    }, 500);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [location.country, location.location]);

  return (
    <div className="spaw-field-block">
      <label className="spaw-label">{title} <span className="spaw-req">*</span></label>
      <div className={`spaw-branch-wrap spaw-location-compact${error ? " spaw-input-error" : ""}`} style={{ marginTop: 0 }}>
        <div className="spaw-location-block">
          <div className="spaw-search-wrap spaw-branch-search">
            <input
          type="text"
          placeholder={locationPlaceholder}
              value={location.location}
              className={error ? "is-invalid" : ""}
              onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
              onChange={(event) => {
                selectedLocationRef.current = "";
                onChange(index, { location: event.target.value });
                setIsOpen(true);
              }}
              onFocus={() => suggestions.length && setIsOpen(true)}
            />
            {isOpen ? (
              <ul className="spaw-suggest-list" style={{ display: "block" }}>
                {suggestions.map((suggestion) => (
                  <li
                    key={`${suggestion.displayName}-${suggestion.latitude}-${suggestion.longitude}`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      applySuggestion(suggestion);
                    }}
                  >
                    <strong>{suggestion.location || suggestion.displayName}</strong>
                    <span>{suggestion.displayName}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="spaw-location-row">
            <input type="text" className={error ? "is-invalid" : ""} placeholder="City" value={location.city} onChange={(event) => onChange(index, { city: event.target.value })} />
            <input type="text" className={error ? "is-invalid" : ""} placeholder="Zipcode" value={location.zip} onChange={(event) => onChange(index, { zip: event.target.value })} />
          </div>
        </div>
        <FieldError message={error} />
      </div>
    </div>
  );
}

function BranchLocationRow({
  branch,
  onChange,
  onRemove,
}: {
  branch: LocationForm;
  index: number;
  onChange: (value: Partial<LocationForm>) => void;
  onRemove: () => void;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const selectedLocationRef = useRef("");

  function applySuggestion(suggestion: AddressSuggestion) {
    selectedLocationRef.current = suggestion.location;
    onChange(suggestion);
    setSuggestions([]);
    setIsOpen(false);

    if (suggestion.zip) {
      return;
    }

    const controller = new AbortController();
    lookupCityPostalCode(suggestion.city, suggestion.state, suggestion.country || branch.country, controller.signal)
      .then((zip) => {
        if (zip) {
          onChange({ zip });
        }
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    const query = branch.location.trim();
    if (query && query === selectedLocationRef.current) {
      setSuggestions([]);
      setIsOpen(false);
      return undefined;
    }

    if (query.length < 4) {
      setSuggestions([]);
      setIsOpen(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      searchAddressSuggestions(query, branch.country, controller.signal)
        .then((items) => {
          setSuggestions(items);
          setIsOpen(items.length > 0);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
            setIsOpen(false);
          }
        });
    }, 500);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [branch.country, branch.location]);

  return (
    <div className="spaw-location-block spaw-location-branch-block">
      <div className="spaw-search-wrap spaw-branch-search">
        <input
          type="text"
          value={branch.location}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            selectedLocationRef.current = "";
            onChange({ location: event.target.value });
            setIsOpen(true);
          }}
          onFocus={() => suggestions.length && setIsOpen(true)}
          placeholder="Branch location"
        />
        {isOpen ? (
          <ul className="spaw-suggest-list" style={{ display: "block" }}>
            {suggestions.map((suggestion) => (
              <li
                key={`${suggestion.displayName}-${suggestion.latitude}-${suggestion.longitude}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applySuggestion(suggestion);
                }}
              >
                <strong>{suggestion.location || suggestion.displayName}</strong>
                <span>{suggestion.displayName}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="spaw-location-row">
        <input type="text" value={branch.city} onChange={(event) => onChange({ city: event.target.value })} placeholder="City" />
        <input type="text" value={branch.zip} onChange={(event) => onChange({ zip: event.target.value })} placeholder="Zipcode" />
        <button type="button" className="spaw-branch-remove" onClick={onRemove}><i className="material-icons">close</i></button>
      </div>
    </div>
  );
}

function StepService({
  form,
  filteredCategories,
  selectedCategory,
  selectedDetailedIds,
  areas,
  areaInput,
  errors,
  onAreaInput,
  onAddArea,
  onRemoveArea,
  onChooseCategory,
  onField,
  onToggleDetailed,
}: {
  form: PostingForm;
  filteredCategories: AllServiceCategoryOption[];
  selectedCategory: AllServiceCategoryOption | null;
  selectedDetailedIds: number[];
  areas: string[];
  areaInput: string;
  errors: FieldErrors;
  onAreaInput: (value: string) => void;
  onAddArea: () => void;
  onRemoveArea: (index: number) => void;
  onChooseCategory: (category: AllServiceCategoryOption) => void;
  onField: <K extends keyof PostingForm>(key: K, value: PostingForm[K]) => void;
  onToggleDetailed: (id: number) => void;
}) {
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const selectedServiceRef = useRef("");

  function chooseService(category: AllServiceCategoryOption) {
    selectedServiceRef.current = category.name;
    onChooseCategory(category);
    setIsServiceOpen(false);
  }

  return (
    <div className="spaw-panel active">
      <div className={`spaw-field-block${errors.serviceCategory ? " spaw-input-error" : ""}`}>
        <label className="spaw-label">Select the services your business provides. <span className="spaw-req">*</span><small>Enter a keyword and choose from the suggested results.</small></label>
        <div className="spaw-search-wrap">
          <i className="material-icons">search</i>
          <input
            type="text"
            className={`spaw-input${errors.serviceCategory ? " is-invalid" : ""}`}
            value={form.serviceSearch}
            onBlur={() => window.setTimeout(() => setIsServiceOpen(false), 120)}
            onChange={(event) => {
              selectedServiceRef.current = "";
              onField("serviceSearch", event.target.value);
              setIsServiceOpen(true);
            }}
            onFocus={() => {
              if (filteredCategories.length && form.serviceSearch !== selectedServiceRef.current) {
                setIsServiceOpen(true);
              }
            }}
            placeholder="Eg: Astrologer, Plumber, Real estate service"
          />
          {isServiceOpen && filteredCategories.length ? (
            <ul className="spaw-suggest-list" style={{ display: "block" }}>
              {filteredCategories.map((category) => (
                <li key={category.id} onMouseDown={() => chooseService(category)}><strong>{category.name}</strong><span>{category.code}</span></li>
              ))}
            </ul>
          ) : null}
        </div>
        <FieldError message={errors.serviceCategory} />
      </div>

      {selectedCategory ? (
        <>
          <div className="spaw-selected-service" style={{ display: "block" }}>
            <div className="spaw-selected-head">
              <i className="material-icons">check_circle</i>
              <div><strong>{selectedCategory.name}</strong><span>Parent category: {selectedCategory.code || selectedCategory.slug}</span></div>
              <button
                type="button"
                className="spaw-change-link"
                onClick={() => {
                  selectedServiceRef.current = "";
                  setIsServiceOpen(true);
                }}
              >
                Change
              </button>
            </div>
          </div>
          <div className={`spaw-field-block${errors.detailedServices ? " spaw-input-error" : ""}`} style={{ display: "block" }}>
            <label className="spaw-label">Select every service you provide. <span className="spaw-req">*</span></label>
            <div className="spaw-subcategory-groups">
              {selectedCategory.subCategories.map((subCategory) => (
                <section className="spaw-subcategory-group" key={subCategory.id}>
                  <div className="spaw-subcategory-head">
                    <h4>{subCategory.name}</h4>
                    <span>{subCategory.detailedCategories.length} services</span>
                  </div>
                  <div className="spaw-check-grid">
                    {subCategory.detailedCategories.map((detail) => (
                      <label className="spaw-check-pill" key={detail.id}>
                        <input type="checkbox" checked={selectedDetailedIds.includes(detail.id)} onChange={() => onToggleDetailed(detail.id)} />
                        <span>{detail.name}</span>
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <FieldError message={errors.detailedServices} />
          </div>
        </>
      ) : null}

      <div className={`spaw-field-block${errors.serviceAreas ? " spaw-input-error" : ""}`}>
        <label className="spaw-label">Which cities, towns, or neighborhoods do you serve? <span className="spaw-req">*</span></label>
        <div className="spaw-tag-input">
          <div className="spaw-tag-chips">
            {areas.map((area, index) => <span className="spaw-chip" key={area}>{area}<i className="material-icons" onClick={() => onRemoveArea(index)}>close</i></span>)}
          </div>
          <input
            value={areaInput}
            onBlur={onAddArea}
            onChange={(event) => onAreaInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                onAddArea();
              }
            }}
            placeholder="Type a city or area and press Enter"
          />
        </div>
        <FieldError message={errors.serviceAreas} />
      </div>

      <div className="spaw-field-block">
        <label className="spaw-label">How do you deliver your service? <span className="spaw-req">*</span></label>
        <div className="spaw-prof-grid spaw-delivery-grid">
          {["At customer location", "At my business location", "Both"].map((value) => (
            <label className={`spaw-prof-card ${form.delivery === value ? "active" : ""}`} key={value}>
              <input type="radio" checked={form.delivery === value} onChange={() => onField("delivery", value)} />
              <span className="spaw-prof-radio" />
              <span className="spaw-prof-text"><strong>{value}</strong><em>{value === "Both" ? "I offer both options." : value === "At customer location" ? "I visit the customer's home or office." : "Customers visit my shop, salon or office."}</em></span>
            </label>
          ))}
        </div>
      </div>

      <div className="spaw-field-block">
        <label className="spaw-label">Years in business / experience</label>
        <select className="spaw-input" value={form.experience} onChange={(event) => onField("experience", event.target.value)}>
          <option value="">Select</option><option>Less than 1 year</option><option>1 - 3 years</option><option>3 - 5 years</option><option>5 - 10 years</option><option>10+ years</option>
        </select>
      </div>
    </div>
  );
}

function StepProfile({ form, openDays, payments, errors, onField, onToggleDay, onTogglePayment }: { form: PostingForm; openDays: string[]; payments: string[]; errors: FieldErrors; onField: <K extends keyof PostingForm>(key: K, value: PostingForm[K]) => void; onToggleDay: (day: string) => void; onTogglePayment: (payment: string) => void }) {
  return (
    <div className="spaw-panel active">
      <div className={`spaw-field-block${errors.description ? " spaw-input-error" : ""}`}>
        <label className="spaw-label">Introduce Your Business <span className="spaw-req">*</span><small>Tell customers about your services, experience, specialties, and what sets you apart.</small></label>
        <textarea className={`spaw-input spaw-textarea${errors.description ? " is-invalid" : ""}`} rows={5} value={form.description} onChange={(event) => onField("description", event.target.value.slice(0, 500))} placeholder="Describe your experience, specialties, certifications, and service guarantees..." />
        <div className="spaw-char-count"><span>{form.description.length}</span> / 500 characters</div>
        <FieldError message={errors.description} />
      </div>
      <div className="spaw-field-block spaw-row-2">
        <TextField label="Year established" type="number" value={form.yearEstablished} onChange={(value) => onField("yearEstablished", value)} placeholder="e.g., 2015" />
        <div><label className="spaw-label">Team size</label><select className="spaw-input" value={form.teamSize} onChange={(event) => onField("teamSize", event.target.value)}><option value="">Select</option><option>Just me</option><option>2 - 5 people</option><option>6 - 10 people</option><option>11 - 25 people</option><option>25+ people</option></select></div>
      </div>
      <div className="spaw-field-block"><label className="spaw-label">Working days &amp; hours</label><div className="spaw-days-grid">{days.map((day) => <label className="spaw-day-chip" key={day}><input type="checkbox" checked={openDays.includes(day)} onChange={() => onToggleDay(day)} /><span>{day}</span></label>)}</div></div>
      <div className="spaw-field-block spaw-row-2"><TextField label="Opening time" type="time" value={form.openTime} onChange={(value) => onField("openTime", value)} /><TextField label="Closing time" type="time" value={form.closeTime} onChange={(value) => onField("closeTime", value)} /></div>
      <div className="spaw-field-block"><label className="spaw-label">Payment modes accepted</label><div className="spaw-check-grid spaw-pay-grid">{paymentModes.map((mode) => <label className="spaw-check-pill" key={mode}><input type="checkbox" checked={payments.includes(mode)} onChange={() => onTogglePayment(mode)} /><span>{mode}</span></label>)}</div></div>
      <TextField label="Website" small="(optional)" type="url" value={form.website} onChange={(value) => onField("website", value)} placeholder="https://www.yourbusiness.com" />
      <div className="spaw-field-block spaw-row-2"><TextField label="Facebook" type="url" value={form.facebook} onChange={(value) => onField("facebook", value)} placeholder="Facebook page URL" /><TextField label="Instagram" type="url" value={form.instagram} onChange={(value) => onField("instagram", value)} placeholder="Instagram profile URL" /></div>
    </div>
  );
}

function StepReview({
  form,
  primaryLocation,
  branches,
  selectedCategory,
  selectedDetailedIds,
  servicePlans,
  areas,
  openDays,
  payments,
  acceptedTerms,
  isPaymentGatewayOpen,
  isPaymentPaid,
  isProcessingPayment,
  paymentReference,
  errors,
  onGoto,
  onPlan,
  onOpenPayment,
  onCompletePayment,
  onTerms,
}: {
  form: PostingForm;
  primaryLocation: LocationForm;
  branches: LocationForm[];
  selectedCategory: AllServiceCategoryOption | null;
  selectedDetailedIds: number[];
  servicePlans: ServicePlanCard[];
  areas: string[];
  openDays: string[];
  payments: string[];
  acceptedTerms: boolean;
  isPaymentGatewayOpen: boolean;
  isPaymentPaid: boolean;
  isProcessingPayment: boolean;
  paymentReference: string;
  errors: FieldErrors;
  onGoto: (step: number) => void;
  onPlan: (value: string) => void;
  onOpenPayment: () => void;
  onCompletePayment: () => void;
  onTerms: (value: boolean) => void;
}) {
  const selectedPlan = servicePlans.find((plan) => plan.code === form.plan);

  return (
    <div className="spaw-panel active">
      <p className="spaw-review-intro">Verify your business details below. If any information needs to be changed, you can edit it before submitting your listing for review.</p>
      <ReviewCard title="Basic information" step={1} onGoto={onGoto} rows={[["Profession type", form.providerType], ["Business name", form.businessName], ["Tagline", form.tagline], ["Business image", form.businessImageName || "Not uploaded"], ["Location", [formatLocation(primaryLocation), ...branches.map(formatLocation)].filter(Boolean).join(" | ")], ["Contact name", form.contactName], ["Email", form.email], ["Phone", `${form.phoneCode} ${form.phone}`]]} />
      <ReviewCard title="Service & category" step={2} onGoto={onGoto} rows={[["Primary service", selectedCategory?.name || ""], ["Services selected", String(selectedDetailedIds.length)], ["Areas served", areas.join(", ")], ["Service delivery", form.delivery], ["Years in business", form.experience]]} />
      <ReviewCard title="Business profile" step={3} onGoto={onGoto} rows={[["Description", form.description], ["Year established", form.yearEstablished], ["Team size", form.teamSize], ["Working days", openDays.join(", ")], ["Working hours", `${form.openTime} - ${form.closeTime}`], ["Payment modes", payments.join(", ")], ["Website", form.website]]} />
      <div className={`spaw-field-block${errors.plan ? " spaw-input-error" : ""}`}>
        <label className="spaw-label">Choose your service plan <span className="spaw-req">*</span><small>Select one paid Add Service plan to continue.</small></label>
        <div className="spaw-plan-grid">
          {servicePlans.map((plan) => (
            <label className={`spaw-plan-card ${form.plan === plan.code ? "active" : ""} ${plan.isHighlighted ? "spaw-plan-premium" : ""}`} key={plan.code}>
              <input type="radio" checked={form.plan === plan.code} onChange={() => onPlan(plan.code)} />
              {plan.isHighlighted ? <span className="spaw-plan-badge">Popular</span> : null}
              <strong>{plan.name}</strong>
              <b style={{ color: "#ff6b00", fontSize: 22 }}>{formatServicePlanPrice(plan)}</b>
              <small style={{ display: "block", fontWeight: 700, color: "#64748b" }}>{plan.duration}</small>
              <p>{plan.description}</p>
            </label>
          ))}
        </div>
        <FieldError message={errors.plan} />
      </div>

      <div className={`spaw-field-block${errors.payment ? " spaw-input-error" : ""}`}>
        <label className="spaw-label">Payment <span className="spaw-req">*</span><small>Dummy payment is required before submit is enabled.</small></label>
        <div
          style={{
            border: "1px solid #dce5f1",
            borderRadius: 8,
            padding: 18,
            background: isPaymentPaid ? "#ecfdf3" : "#fbfdff",
          }}
        >
          {selectedPlan ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <strong style={{ display: "block", fontSize: 20, color: "#0a1b36" }}>{selectedPlan.name}</strong>
                <span style={{ color: "#64748b", fontWeight: 700 }}>{formatServicePlanPrice(selectedPlan)} payment due</span>
                {isPaymentPaid ? <p style={{ margin: "8px 0 0", color: "#008f67", fontWeight: 700 }}>Payment completed. Reference: {paymentReference}</p> : null}
              </div>
              <button type="button" className="spaw-btn spaw-btn-next" onClick={onOpenPayment} disabled={isPaymentPaid || isProcessingPayment}>
                {isPaymentPaid ? "Paid" : "Pay Now"}
              </button>
            </div>
          ) : (
            <p style={{ margin: 0, color: "#64748b", fontWeight: 700 }}>Select a listing plan to view payment amount.</p>
          )}

          {isPaymentGatewayOpen && selectedPlan ? (
            <div
              style={{
                marginTop: 18,
                border: "1px solid #ffb36b",
                borderRadius: 8,
                padding: 16,
                background: "#fff7ed",
              }}
            >
              <strong style={{ display: "block", color: "#0a1b36", fontSize: 18 }}>Dummy Payment Gateway</strong>
              <p style={{ margin: "6px 0 14px", color: "#52627a" }}>Pay {formatServicePlanPrice(selectedPlan)} for {selectedPlan.name}. This is a demo transaction only.</p>
              <button type="button" className="spaw-btn spaw-btn-submit app-loading-button" onClick={onCompletePayment} disabled={isProcessingPayment}>
                {isProcessingPayment ? (
                  <>
                    <span className="app-button-spinner" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : "Complete Dummy Payment"}
              </button>
            </div>
          ) : null}
        </div>
        <FieldError message={errors.payment} />
      </div>
      <div className={`spaw-check-row spaw-terms-row${errors.terms ? " spaw-input-error" : ""}`}>
        <label className="spaw-checkbox"><input type="checkbox" checked={acceptedTerms} onChange={(event) => onTerms(event.target.checked)} /><span /> By checking this box, I agree to the <a href="/terms-of-use" target="_blank">Terms of Use</a> and confirm that all information submitted is accurate and complete.</label>
        <FieldError message={errors.terms} />
      </div>
    </div>
  );
}

function BusinessImageUpload({
  fileName,
  preview,
  error,
  onChange,
  onRemove,
}: {
  fileName: string;
  preview: string;
  error?: string;
  onChange: (file: File | null) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleRemove() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onRemove();
  }

  return (
    <div className={`spaw-field-block${error ? " spaw-input-error" : ""}`}>
      <label className="spaw-label">Business Image <small>Upload JPG, PNG, or WebP up to 5 MB.</small></label>
      <div
        className="spaw-image-upload"
        style={{
          display: "flex",
          gap: "18px",
          alignItems: "center",
          border: "1px dashed #d8e1ee",
          borderRadius: "8px",
          padding: "16px",
          background: "#fbfdff",
        }}
      >
        <div
          style={{
            width: "120px",
            height: "92px",
            borderRadius: "8px",
            overflow: "hidden",
            background: "#f2f5fa",
            border: "1px solid #dce5f1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#718096",
            flex: "0 0 auto",
          }}
        >
          {preview ? (
            <img src={preview} alt="Business preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <i className="material-icons" aria-hidden="true">image</i>
          )}
        </div>
        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          <input
            ref={inputRef}
            type="file"
            className="spaw-input"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              onChange(event.target.files?.[0] || null);
              event.currentTarget.value = "";
            }}
          />
          {fileName ? <p style={{ margin: "10px 0 0", fontWeight: 700, color: "#0a1b36", wordBreak: "break-word" }}>{fileName}</p> : null}
          {preview ? (
            <button type="button" className="spaw-add-link" style={{ marginTop: "10px" }} onClick={handleRemove}>
              <i className="material-icons">close</i> Remove image
            </button>
          ) : null}
        </div>
      </div>
      <FieldError message={error} />
    </div>
  );
}

function ReviewCard({ title, rows, step, onGoto }: { title: string; rows: string[][]; step: number; onGoto: (step: number) => void }) {
  return (
    <div className="spaw-review-card">
      <h4>{title} <a href="#edit" onClick={(event) => { event.preventDefault(); onGoto(step); }}>Edit</a></h4>
      {rows.map(([label, value]) => <div className="spaw-review-row" key={label}><span>{label}</span><strong>{value || "-"}</strong></div>)}
    </div>
  );
}

function TipCard({ providerType }: { providerType: string }) {
  const option = professionOptions.find(([title]) => title === providerType) || professionOptions[0];
  return (
    <div className="spaw-side-card spaw-tip-card">
      <div className="spaw-tip-head"><span className="material-icons">person_pin_circle</span></div>
      <h4>{option[0]}</h4>
      <p>{option[1]}</p>
      <ul className="spaw-tip-list"><li>Use accurate contact details.</li><li>Add all branches and service areas.</li><li>Select only services you provide.</li></ul>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder = "", type = "text", required = false, small = "", error = "" }: { label?: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean; small?: string; error?: string }) {
  return (
    <div className={`spaw-field-block${error ? " spaw-input-error" : ""}`}>
      {label ? <label className="spaw-label">{label} {required ? <span className="spaw-req">*</span> : null}{small ? <small>{small}</small> : null}</label> : null}
      <input type={type} className={`spaw-input${error ? " is-invalid" : ""}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <div className="spaw-field-error">{message}</div> : null;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="spaw-check-row">
      <label className="spaw-checkbox"><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /><span /> {label}</label>
    </div>
  );
}

type NominatimAddressResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
  addresstype?: string;
  type?: string;
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

const countryCodeAliases: Record<string, string> = {
  australia: "au",
  au: "au",
  canada: "ca",
  ca: "ca",
  india: "in",
  in: "in",
  "united arab emirates": "ae",
  uae: "ae",
  ae: "ae",
  "united kingdom": "gb",
  uk: "gb",
  gb: "gb",
  england: "gb",
  "united states": "us",
  "united states of america": "us",
  usa: "us",
  us: "us",
};

const usStateCodes: Record<string, string> = {
  alabama: "al",
  alaska: "ak",
  arizona: "az",
  arkansas: "ar",
  california: "ca",
  colorado: "co",
  connecticut: "ct",
  delaware: "de",
  florida: "fl",
  georgia: "ga",
  hawaii: "hi",
  idaho: "id",
  illinois: "il",
  indiana: "in",
  iowa: "ia",
  kansas: "ks",
  kentucky: "ky",
  louisiana: "la",
  maine: "me",
  maryland: "md",
  massachusetts: "ma",
  michigan: "mi",
  minnesota: "mn",
  mississippi: "ms",
  missouri: "mo",
  montana: "mt",
  nebraska: "ne",
  nevada: "nv",
  "new hampshire": "nh",
  "new jersey": "nj",
  "new mexico": "nm",
  "new york": "ny",
  "north carolina": "nc",
  "north dakota": "nd",
  ohio: "oh",
  oklahoma: "ok",
  oregon: "or",
  pennsylvania: "pa",
  "rhode island": "ri",
  "south carolina": "sc",
  "south dakota": "sd",
  tennessee: "tn",
  texas: "tx",
  utah: "ut",
  vermont: "vt",
  virginia: "va",
  washington: "wa",
  "west virginia": "wv",
  wisconsin: "wi",
  wyoming: "wy",
  dc: "dc",
  "district of columbia": "dc",
};

type ZippopotamCityResponse = {
  places?: Array<{
    "post code"?: string;
    "place name"?: string;
    state?: string;
    "state abbreviation"?: string;
  }>;
};

function getCountryCode(country: string) {
  const normalized = country.trim().toLowerCase();
  if (/^[a-z]{2}$/i.test(normalized)) {
    return normalized;
  }

  return countryCodeAliases[normalized] || "";
}

function getUsStateCode(state: string) {
  const normalized = state.trim().toLowerCase();
  if (/^[a-z]{2}$/i.test(normalized)) {
    return normalized;
  }

  return usStateCodes[normalized] || "";
}

function normalizeAddressQuery(query: string) {
  return query
    .trim()
    .replace(/\bmechigan\b/gi, "Michigan")
    .replace(/\bmichagan\b/gi, "Michigan");
}

async function lookupCityPostalCode(city: string, state: string, country: string, signal: AbortSignal) {
  if (getCountryCode(country) !== "us") {
    return "";
  }

  const cleanCity = city.trim();
  const stateCode = getUsStateCode(state);

  if (!cleanCity || !stateCode) {
    return "";
  }

  const url = `https://api.zippopotam.us/us/${encodeURIComponent(stateCode)}/${encodeURIComponent(cleanCity)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal });

  if (!response.ok) {
    return "";
  }

  const data = (await response.json()) as ZippopotamCityResponse;
  const matchingPlace = data.places?.find((place) => place["place name"]?.toLowerCase() === cleanCity.toLowerCase());
  const firstZip = matchingPlace?.["post code"] || data.places?.[0]?.["post code"] || "";

  return firstZip.trim();
}

async function searchAddressSuggestions(query: string, country: string, signal: AbortSignal): Promise<AddressSuggestion[]> {
  const url = new URL(import.meta.env.VITE_ADDRESS_SEARCH_URL || "https://nominatim.openstreetmap.org/search");
  const countryCode = getCountryCode(country);
  const normalizedQuery = normalizeAddressQuery(query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "10");
  url.searchParams.set("q", normalizedQuery);

  if (countryCode) {
    url.searchParams.set("countrycodes", countryCode);
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
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
  const city = address.city || address.town || address.village || address.municipality || "";
  const street = [
    address.house_number,
    address.road || address.pedestrian || address.neighbourhood || address.suburb,
  ].filter(Boolean).join(" ");
  const hasSpecificLocation = Boolean(city || street || address.postcode || address.suburb || address.neighbourhood);

  if (!hasSpecificLocation) {
    return null;
  }

  const location = [
    address.house_number,
    address.road || address.pedestrian || address.neighbourhood || address.suburb,
  ].filter(Boolean).join(" ");

  return {
    displayName: result.display_name,
    location: location || result.display_name,
    city,
    state: address.state || address.province || "",
    zip: address.postcode || "",
    country: address.country || "",
    latitude: result.lat || "",
    longitude: result.lon || "",
  };
}

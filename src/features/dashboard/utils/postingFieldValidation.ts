export type PostingFieldKind = "text" | "number" | "date" | "time" | "checkbox" | "textarea" | "file" | "dropdown";

type PostingFieldDescriptor = {
  key: string;
  label: string;
  type?: PostingFieldKind | string;
  maxLength?: number;
};

export type PostingInputKind = "text" | "number" | "email" | "tel" | "url" | "date" | "time";

// These limits mirror the string lengths enforced by the listing tables in
// AppDbContext. Keeping them in the shared posting validator protects both the
// yellow-pages wizard and the classified posting wizard, including AI values.
const postingFieldMaxLengths: Record<string, number> = {
  title: 200,
  listingtitle: 200,
  adtitle: 200,
  description: 4000,
  businessdescription: 4000,
  category: 100,
  categoryname: 100,
  subcategory: 100,
  detailcategory: 150,
  listingkind: 50,
  propertytype: 100,
  bhk: 20,
  furnishingtype: 60,
  propertyage: 50,
  facing: 30,
  availability: 50,
  suitablefor: 100,
  approvaltype: 100,
  roomtype: 50,
  genderpreference: 30,
  pgamenities: 500,
  country: 100,
  state: 100,
  city: 100,
  locality: 1000,
  address: 1000,
  streetaddress: 1000,
  landmark: 1000,
  pincode: 20,
  zipcode: 20,
  sellername: 150,
  contactname: 150,
  mobilenumber: 30,
  phonenumber: 30,
  whatsappnumber: 30,
  email: 200,
  website: 500,
  websiteurl: 500,
  sellertype: 50,
  reranumber: 100,
  ownershiptype: 50,
  adtype: 50,
  metatitle: 200,
  metadescription: 500,

  // Vehicle details.
  brand: 100,
  make: 100,
  model: 100,
  variant: 100,
  vehiclecondition: 20,
  fueltype: 30,
  transmission: 30,
  insurancestatus: 30,
  registrationstate: 100,
  rto: 30,
  color: 60,
  bodytype: 50,
  bootspace: 50,
  commercialvehicletype: 50,
  permittype: 50,
  rentaltype: 50,
  parttype: 80,
  partcondition: 20,
  servicehistorystatus: 50,
  loanstatus: 50,

  // Electronics details.
  modelnamenumber: 120,
  condition: 30,
  usageduration: 80,
  ram: 50,
  storage: 80,
  processor: 120,
  screensize: 50,
  batteryhealth: 50,
  network: 20,
  graphicscard: 120,
  operatingsystem: 80,
  displaytype: 40,
  resolution: 40,
  appliancetype: 80,
  capacity: 80,
  energyrating: 30,
  powerconsumption: 80,
  accessorytype: 80,
  compatibility: 120,
  connectivity: 80,

  // Care-service details.
  providertype: 50,
  availabilitytype: 30,
  availabletimeslots: 200,
  ratetype: 30,
  licensenumber: 100,
  previousemployer: 200,
  education: 200,
  servicedisclaimer: 500,
  insurance: 200,

  // Restaurant details.
  restaurantname: 200,
  businessname: 200,
  tagline: 250,
  cuisinetype: 80,
  cuisine: 80,
  businesstype: 80,
  instagramurl: 500,
  facebookurl: 500,
  tiktokurl: 500,
  twitterurl: 500,
  youtubeurl: 500,
  couponcodes: 500,
  happyhours: 500,
  foodlicensenumber: 150,
  healthinspectionrating: 100,
  alcohollicensenumber: 150,
  taxidinternal: 100,
  agerestrictednotice: 500,
  itemname: 200,
  menucategory: 80,
  foodtype: 50,
  specialhoursnote: 500,
};

export function getPostingFieldMaxLength(field: PostingFieldDescriptor) {
  if (field.maxLength && field.maxLength > 0) return field.maxLength;

  const normalizedKey = normalizePostingFieldKey(field.key);
  const keyLimit = postingFieldMaxLengths[normalizedKey];
  if (keyLimit) return keyLimit;

  return postingFieldMaxLengths[normalizePostingFieldKey(field.label)];
}

export function getPostingInputKind(field: PostingFieldDescriptor): PostingInputKind {
  const fieldType = field.type?.toLowerCase();
  if (fieldType === "number" || fieldType === "date" || fieldType === "time") {
    return fieldType;
  }

  const identity = `${field.key} ${field.label}`.toLowerCase();
  if (/\b(e[-_ ]?mail|email)\b/.test(identity)) return "email";
  if (/\b(phone|mobile|telephone|whatsapp|contact[_ -]?number)\b/.test(identity)) return "tel";
  if (/\b(website|web[_ -]?site|url|link)\b/.test(identity)) return "url";
  return "text";
}

export function sanitizePostingFieldValue(field: PostingFieldDescriptor, value: string) {
  const kind = getPostingInputKind(field);

  if (kind === "number") {
    return sanitizeDecimal(value);
  }

  if (kind === "tel") {
    const hasLeadingPlus = value.trimStart().startsWith("+");
    const digits = value.replace(/\D/g, "").slice(0, 15);
    return `${hasLeadingPlus ? "+" : ""}${digits}`;
  }

  return value;
}

export function getPostingFieldValidationError(field: PostingFieldDescriptor, value?: string) {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) return "";

  const maxLength = getPostingFieldMaxLength(field);
  if (maxLength && normalizedValue.length > maxLength) {
    return `${field.label} must be ${maxLength} characters or fewer.`;
  }

  switch (getPostingInputKind(field)) {
    case "number":
      return /^-?(?:\d+|\d*\.\d+)$/.test(normalizedValue)
        ? ""
        : `${field.label} must contain numbers only.`;
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue)
        ? ""
        : `${field.label} must be a valid email address.`;
    case "tel": {
      const digits = normalizedValue.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15
        ? ""
        : `${field.label} must contain 7 to 15 digits.`;
    }
    case "url": {
      try {
        const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(normalizedValue)
          ? normalizedValue
          : `https://${normalizedValue}`;
        const url = new URL(candidate);
        return url.hostname.includes(".") ? "" : `${field.label} must be a valid website URL.`;
      } catch {
        return `${field.label} must be a valid website URL.`;
      }
    }
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)
        ? ""
        : `${field.label} must be a valid date.`;
    case "time":
      return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(normalizedValue)
        ? ""
        : `${field.label} must be a valid time.`;
    default:
      return "";
  }
}

function normalizePostingFieldKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function sanitizeDecimal(value: string) {
  const isNegative = value.trimStart().startsWith("-");
  const unsigned = value.replace(/[^\d.]/g, "");
  const decimalIndex = unsigned.indexOf(".");
  const normalized = decimalIndex < 0
    ? unsigned
    : `${unsigned.slice(0, decimalIndex + 1)}${unsigned.slice(decimalIndex + 1).replace(/\./g, "")}`;
  return `${isNegative ? "-" : ""}${normalized}`;
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import DashboardFooter from "../components/DashboardFooter";
import { createListing, getListing, getListingApiErrorMessage, isListingUpgradeRequired, updateListing, type ListingSummary, type UpsertListingPayload } from "../api/listingsApi";
import {
  getClassifiedSpecificationFields,
  getListingCategoryTree,
  type ListingCategoryFieldDefinition,
  type ListingCategoryOption,
} from "../api/listingCategoriesApi";
import { getMyProfile } from "../api/profileApi";
import {
  getLocationCities,
  getLocationCountries,
  getLocationStates,
  type CityOption,
  type CountryOption,
  type StateOption,
} from "../../../shared/api/locationMastersApi";
import { getAddressPlaceDetail, searchAddressPredictions } from "../../../shared/api/addressAutocompleteApi";
import "../styles/listings.css";

const classifiedDraftKey = "chaodesi_classified_draft";
const classifiedResultKey = "chaodesi_classified_result";
const galleryMarkerPrefix = "__classifiedGalleryFile_";

const classifiedSubCategories: Record<string, string[]> = {
  Cars: ["Cars"],
  Properties: [
    "For Sale: Houses & Apartments",
    "For Rent: Houses & Apartments",
    "For Sale: New Projects & Properties",
    "Lands & Plots",
    "For Rent: Shops & Offices",
    "For Sale: Shops & Offices",
    "PG & Guest Houses",
  ],
  Mobiles: ["Mobile Phones", "Accessories", "Tablets"],
  Jobs: [
    "Data entry & Back office",
    "Sales & Marketing",
    "BPO & Telecaller",
    "Driver",
    "Office Assistant",
    "Delivery & Collection",
    "Teacher",
    "Cook",
    "Receptionist & Front office",
    "Operator & Technician",
    "IT Engineer & Developer",
    "Hotel & Travel Executive",
    "Accountant",
    "Designer",
    "Warehouse Staff",
    "Security Guards",
    "Other Jobs",
  ],
  Bikes: ["Motorcycles", "Scooters", "Spare Parts", "Bicycles"],
  "Electronics & Appliances": [
    "TVs, Video - Audio",
    "Kitchen & Other Appliances",
    "Computers & Laptops",
    "Cameras & Lenses",
    "Games & Entertainment",
    "Fridges",
    "Computer Accessories",
    "Hard Disks, Printers & Monitors",
    "ACs",
    "Washing Machines",
  ],
  "Commercial Vehicles & Spares": ["Commercial & Other Vehicles", "Spare Parts"],
  Furniture: ["Sofa & Dining", "Beds & Wardrobes", "Home Decor & Garden", "Kids Furniture", "Other Household Items"],
  Fashion: ["Men", "Women", "Kids"],
  "Books, Sports & Hobbies": ["Books", "Gym & Fitness", "Musical Instruments", "Sports Equipment", "Other Hobbies"],
  Pets: ["Fishes & Aquarium", "Pet Food & Accessories", "Dogs", "Other Pets"],
  Services: [
    "Education & Classes",
    "Tours & Travel",
    "Electronics Repair & Services",
    "Health & Beauty",
    "Home Renovation & Repair",
    "Cleaning & Pest Control",
    "Legal & Documentation Services",
    "Packers & Movers",
    "Other Services",
  ],
};

type ClassifiedDraft = {
  countryId: number | null;
  stateId: number | null;
  cityId: number | null;
  country: string;
  state: string;
  city: string;
  address: string;
  pincode: string;
  latitude: string;
  longitude: string;
  category: string;
  subCategory: string;
  title: string;
  description: string;
  price: string;
  sellerName: string;
  sellerMobile: string;
  sellerEmail: string;
  customFields: Record<string, string>;
};

type ClassifiedResult = {
  id: number;
  title: string;
};

type ListingAddressDetails = {
  address: string;
  pincode: string;
  latitude: string;
  longitude: string;
};

const emptyDraft: ClassifiedDraft = {
  countryId: null,
  stateId: null,
  cityId: null,
  country: "",
  state: "",
  city: "",
  address: "",
  pincode: "",
  latitude: "",
  longitude: "",
  category: "",
  subCategory: "",
  title: "",
  description: "",
  price: "",
  sellerName: "",
  sellerMobile: "",
  sellerEmail: "",
  customFields: {},
};

function readDraft() {
  try {
    const raw = sessionStorage.getItem(classifiedDraftKey);
    return raw ? { ...emptyDraft, ...JSON.parse(raw) } as ClassifiedDraft : emptyDraft;
  } catch {
    return emptyDraft;
  }
}

function readResult() {
  try {
    const raw = sessionStorage.getItem(classifiedResultKey);
    return raw ? JSON.parse(raw) as ClassifiedResult : null;
  } catch {
    return null;
  }
}

function getStep(pathname: string) {
  if (pathname.includes("step-3")) {
    return 3;
  }

  if (pathname.includes("step-2")) {
    return 2;
  }

  return 1;
}

function optionName<T extends { id: number; name: string }>(items: T[], id: number | null) {
  return items.find((item) => item.id === id)?.name || "";
}

function findOptionByName<T extends { name: string }>(items: T[], name: string) {
  const normalizedName = normalizeLocationName(name);
  return items.find((item) => normalizeLocationName(item.name) === normalizedName);
}

function normalizeLocationName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function numberOrZero(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function numberOrNull(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function routeNumberOrNull(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getClassifiedStepPath(step: number, listingId: number | null) {
  if (listingId) {
    return `/dashboard/classifieds/${listingId}/edit/step-${step}`;
  }

  return `/dashboard/classifieds/step-${step}`;
}

export default function ClassifiedPostingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { listingId } = useParams();
  const editListingId = routeNumberOrNull(listingId);
  const isEditMode = Boolean(editListingId);
  const step = getStep(location.pathname);
  const [draft, setDraft] = useState<ClassifiedDraft>(() => step === 1 ? emptyDraft : readDraft());
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [listingCategories, setListingCategories] = useState<ListingCategoryOption[]>([]);
  const [dynamicFields, setDynamicFields] = useState<ListingCategoryFieldDefinition[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [isLoadingListing, setIsLoadingListing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ClassifiedResult | null>(() => readResult());
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

  const categoryOptions = useMemo(
    () => listingCategories.length
      ? listingCategories.map((category) => category.name)
      : Object.keys(classifiedSubCategories),
    [listingCategories],
  );

  const selectedListingCategory = useMemo(
    () => listingCategories.find((category) => category.name === draft.category),
    [draft.category, listingCategories],
  );

  const subCategories = useMemo(
    () => selectedListingCategory
      ? selectedListingCategory.subCategories.map((subCategory) => subCategory.name)
      : classifiedSubCategories[draft.category] || [],
    [draft.category, selectedListingCategory],
  );

  const selectedListingSubCategory = useMemo(
    () => selectedListingCategory?.subCategories.find((subCategory) => subCategory.name === draft.subCategory),
    [draft.subCategory, selectedListingCategory],
  );

  const visibleDynamicFields = useMemo(
    () => dynamicFields.filter((field) => shouldShowClassifiedField(field, draft.category, draft.subCategory, draft.customFields)),
    [draft.category, draft.customFields, draft.subCategory, dynamicFields],
  );

  useEffect(() => {
    if (isEditMode || step !== 1) {
      return;
    }

    sessionStorage.removeItem(classifiedDraftKey);
    sessionStorage.removeItem(classifiedResultKey);
    setResult(null);
  }, [isEditMode, step]);

  useEffect(() => {
    if (!isEditMode || !editListingId) {
      return;
    }

    let isActive = true;
    setIsLoadingListing(true);
    setError("");

    getListing(editListingId)
      .then((listing) => {
        if (!isActive) return;

        if (!isClassifiedListing(listing)) {
          navigate(`/dashboard/listings/${listing.id}/edit`, { replace: true });
          return;
        }

        const nextDraft = mapListingToClassifiedDraft(listing);
        setDraft(nextDraft);
        setExistingImageUrls(getExistingListingImageUrls(listing));
        sessionStorage.setItem(classifiedDraftKey, JSON.stringify(nextDraft));
        const nextResult = { id: listing.id, title: listing.title };
        setResult(nextResult);
        sessionStorage.setItem(classifiedResultKey, JSON.stringify(nextResult));
      })
      .catch((loadError) => {
        if (isActive) {
          setError(getListingApiErrorMessage(loadError));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingListing(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [editListingId, isEditMode, navigate]);

  useEffect(() => {
    getLocationCountries().then(setCountries).catch(() => setCountries([]));
    getListingCategoryTree().then(setListingCategories).catch(() => setListingCategories([]));
    getMyProfile()
      .then(({ profile }) => {
        setDraft((current) => {
          const next = {
            ...current,
            sellerName: current.sellerName || profile.fullName,
            sellerMobile: current.sellerMobile || profile.mobileNumber,
            sellerEmail: current.sellerEmail || profile.email,
          };
          sessionStorage.setItem(classifiedDraftKey, JSON.stringify(next));
          return next;
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (draft.countryId || !draft.country.trim() || !countries.length) {
      return;
    }

    const matchedCountry = findOptionByName(countries, draft.country);
    if (!matchedCountry) {
      return;
    }

    updateDraft({
      countryId: matchedCountry.id,
      country: matchedCountry.name,
    });
  }, [countries, draft.country, draft.countryId]);

  useEffect(() => {
    if (!draft.countryId) {
      setStates([]);
      return;
    }

    getLocationStates(draft.countryId).then(setStates).catch(() => setStates([]));
  }, [draft.countryId]);

  useEffect(() => {
    if (draft.stateId || !draft.state.trim() || !states.length) {
      return;
    }

    const matchedState = findOptionByName(states, draft.state);
    if (!matchedState) {
      return;
    }

    updateDraft({
      stateId: matchedState.id,
      state: matchedState.name,
    });
  }, [draft.state, draft.stateId, states]);

  useEffect(() => {
    if (!draft.stateId) {
      setCities([]);
      return;
    }

    getLocationCities(draft.stateId).then(setCities).catch(() => setCities([]));
  }, [draft.stateId]);

  useEffect(() => {
    if (draft.cityId || !draft.city.trim() || !cities.length) {
      return;
    }

    const matchedCity = findOptionByName(cities, draft.city);
    if (!matchedCity) {
      return;
    }

    updateDraft({
      cityId: matchedCity.id,
      city: matchedCity.name,
    });
  }, [cities, draft.city, draft.cityId]);

  useEffect(() => {
    if (!selectedListingCategory?.id) {
      setDynamicFields([]);
      return;
    }

    let isActive = true;
    getClassifiedSpecificationFields(selectedListingCategory.id, selectedListingSubCategory?.id)
      .then((fields) => {
        if (isActive) {
          setDynamicFields(fields.filter((field) => field.isActive));
        }
      })
      .catch(() => {
        if (isActive) {
          setDynamicFields([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedListingCategory?.id, selectedListingSubCategory?.id]);

  function updateDraft(patch: Partial<ClassifiedDraft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      sessionStorage.setItem(classifiedDraftKey, JSON.stringify(next));
      return next;
    });

    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      Object.keys(patch).forEach((key) => {
        delete nextErrors[key];
      });
      return nextErrors;
    });
  }

  function updateCustomField(fieldKey: string, value: string) {
    const customFields = { ...draft.customFields, [fieldKey]: value };
    updateDraft({ customFields });
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[customFieldErrorKey(fieldKey)];
      return nextErrors;
    });
  }

  function handleAddressPlaceSelect(addressDetails: ListingAddressDetails) {
    updateDraft({
      address: addressDetails.address || draft.address,
      pincode: addressDetails.pincode || draft.pincode,
      latitude: addressDetails.latitude || draft.latitude,
      longitude: addressDetails.longitude || draft.longitude,
    });
  }

  function validateStep1() {
    const nextErrors: Record<string, string> = {};
    if (!draft.countryId || !draft.country.trim()) nextErrors.country = "Country is required.";
    if (!draft.stateId || !draft.state.trim()) nextErrors.state = "State is required.";
    if (!draft.cityId || !draft.city.trim()) nextErrors.city = "City is required.";
    if (!draft.address.trim()) nextErrors.address = "Listing address is required.";
    if (!draft.pincode.trim()) nextErrors.pincode = "Zip code is required.";
    if (!draft.category.trim()) nextErrors.category = "Category is required.";
    if (!draft.subCategory.trim()) nextErrors.subCategory = "Sub category is required.";
    visibleDynamicFields.forEach((field) => {
      if (field.isRequired && isMissingRequiredClassifiedValue(field, draft.customFields[field.fieldKey])) {
        nextErrors[customFieldErrorKey(field.fieldKey)] = `${field.label} is required.`;
      }
    });
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStep2() {
    const nextErrors: Record<string, string> = {};
    if (!draft.title.trim()) nextErrors.title = "Ad title is required.";
    if (draft.description.trim().length < 50) nextErrors.description = "Description must be at least 50 characters.";
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    if (!validateStep1()) {
      setError("");
      return;
    }

    setError("");
    navigate(getClassifiedStepPath(2, editListingId));
  }

  async function handleSubmit() {
    const isStep1Valid = validateStep1();
    const isStep2Valid = validateStep2();
    if (!isStep1Valid || !isStep2Valid) {
      setError("");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const imageUrls = [
        ...existingImageUrls,
        ...galleryFiles.map((_, index) => `${galleryMarkerPrefix}${index}__`),
      ];

      const payload: UpsertListingPayload = {
          title: draft.title.trim(),
          description: draft.description.trim(),
          categoryName: "Classifieds",
          subCategory: draft.category.trim(),
          detailCategory: "",
          propertyDetails: {
            listingKind: "Classified",
            propertyType: draft.category.trim(),
            otherInformation: JSON.stringify({
              classifiedCategory: draft.category.trim(),
              classifiedSubCategory: draft.subCategory.trim(),
              categoryAttributes: draft.customFields,
              customFields: draft.customFields,
            }),
          },
          priceDetails: {
            price: numberOrZero(
              draft.price || getClassifiedFieldValue(
                draft.customFields,
                "price",
                "listing_price",
                "total_price",
                "monthly_rent",
                "sale_price",
                "vehicle_price",
              ),
            ),
            priceNegotiable: true,
          },
          locationDetails: {
            countryId: draft.countryId,
            stateId: draft.stateId,
            cityId: draft.cityId,
            country: draft.country.trim(),
            state: draft.state.trim(),
            city: draft.city.trim(),
            locality: draft.address.trim(),
            pincode: draft.pincode.trim(),
            latitude: numberOrNull(draft.latitude),
            longitude: numberOrNull(draft.longitude),
          },
          amenities: {},
          media: {
            imageUrls,
          },
          sellerInformation: {
            name: draft.sellerName.trim() || draft.title.trim(),
            mobileNumber: draft.sellerMobile.trim() || "Not provided",
            email: draft.sellerEmail.trim(),
            sellerType: "Owner",
            isMobileOtpVerified: false,
          },
          settings: {
            adType: "Free",
            adDurationDays: 30,
            autoRenew: false,
            verifiedByAdmin: false,
          },
        };

      const uploadFiles = {
          galleryFiles: galleryFiles.map((file, index) => ({
            file,
            marker: `${galleryMarkerPrefix}${index}__`,
          })),
        };

      const listing = isEditMode && editListingId
        ? await updateListing(editListingId, payload, uploadFiles)
        : await createListing(payload, uploadFiles);

      const nextResult = { id: listing.id, title: listing.title };
      sessionStorage.setItem(classifiedResultKey, JSON.stringify(nextResult));
      sessionStorage.removeItem(classifiedDraftKey);
      setResult(nextResult);
      navigate(getClassifiedStepPath(3, editListingId));
    } catch (submitError) {
      if (isListingUpgradeRequired(submitError)) {
        navigate("/pricing-details", {
          state: {
            message: getListingApiErrorMessage(submitError),
            returnTo: getClassifiedStepPath(2, editListingId),
          },
        });
        return;
      }

      setError(getListingApiErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderStepNavigation() {
    return (
      <div className="add-list-ste">
        <div className="add-list-ste-inn">
          <ul>
            {[
              ["Step 1", "Basic Info", getClassifiedStepPath(1, editListingId)],
              ["Step 2", "Ad Details", getClassifiedStepPath(2, editListingId)],
              ["Step 3", "Done", getClassifiedStepPath(3, editListingId)],
            ].map(([title, label, href], index) => (
              <li key={title}>
                <Link to={href} className={step === index + 1 ? "act" : ""}>
                  <span>{title}</span>
                  <b>{label}</b>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <>
      <UserHomeHeader />
      <section className="login-reg classified-posting-page">
        <div className="container">
          <div className="row">{renderStepNavigation()}</div>
          <div className="row">
            <div className="login-main add-list">
              <div className="log-bor">&nbsp;</div>
              <span className="steps">Step {step}</span>
              <div className="log">
                <div className={`login listing-polished-form classified-form-card ${step === 2 ? "add-lis-oth" : ""} ${step === 3 ? "add-lis-done classified-success-card" : ""}`}>
                  {error ? <div className="alert alert-danger">{error}</div> : null}
                  {isLoadingListing ? <div className="alert alert-info">Loading classified ad...</div> : null}
                  {step === 1 ? (
                    <>
                      <h4>{isEditMode ? "Edit Classified Ad" : "Post Classified Ad"}</h4>
                      <div className="row">
                        <div className="col-md-12">
                          <div className="form-group">
                            <label className="listing-field-label">Country</label>
                            <select
                              className={`chosen-select form-control${fieldErrors.country ? " is-invalid" : ""}`}
                              value={draft.countryId || ""}
                              onChange={(event) => {
                                const countryId = Number(event.target.value) || null;
                                updateDraft({
                                  countryId,
                                  country: optionName(countries, countryId),
                                  stateId: null,
                                  state: "",
                                  cityId: null,
                                  city: "",
                                });
                              }}
                            >
                              <option value="">Select Country</option>
                              {countries.map((country) => (
                                <option key={country.id} value={country.id}>{country.name}</option>
                              ))}
                            </select>
                            <FieldError message={fieldErrors.country} />
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-12">
                          <div className="form-group">
                            <label className="listing-field-label">State</label>
                            <select
                              className={`chosen-select form-control${fieldErrors.state ? " is-invalid" : ""}`}
                              value={draft.stateId || ""}
                              onChange={(event) => {
                                const stateId = Number(event.target.value) || null;
                                updateDraft({
                                  stateId,
                                  state: optionName(states, stateId),
                                  cityId: null,
                                  city: "",
                                });
                              }}
                            >
                              <option value="">Select State</option>
                              {states.map((state) => (
                                <option key={state.id} value={state.id}>{state.name}</option>
                              ))}
                            </select>
                            <FieldError message={fieldErrors.state} />
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-12">
                          <div className="form-group">
                            <label className="listing-field-label">City</label>
                            <select
                              className={`chosen-select form-control${fieldErrors.city ? " is-invalid" : ""}`}
                              value={draft.cityId || ""}
                              onChange={(event) => {
                                const cityId = Number(event.target.value) || null;
                                updateDraft({
                                  cityId,
                                  city: optionName(cities, cityId),
                                });
                              }}
                            >
                              <option value="">Select City</option>
                              {cities.map((city) => (
                                <option key={city.id} value={city.id}>{city.name}</option>
                              ))}
                            </select>
                            <FieldError message={fieldErrors.city} />
                          </div>
                        </div>
                      </div>
                      <AddressAutocompleteInput
                        placeholder="Listing address*"
                        value={draft.address}
                        error={fieldErrors.address}
                        country={draft.country}
                        state={draft.state}
                        city={draft.city}
                        onChange={(value) => updateDraft({ address: value })}
                        onPlaceSelect={handleAddressPlaceSelect}
                      />
                      <InlineInput placeholder="Zip code" value={draft.pincode} error={fieldErrors.pincode} onChange={(value) => updateDraft({ pincode: value })} />
                      <div className="row">
                        <InlineInputColumn placeholder="Google Map Latitude" type="number" value={draft.latitude} error={fieldErrors.latitude} onChange={(value) => updateDraft({ latitude: value })} />
                        <InlineInputColumn placeholder="Google Map Longitude" type="number" value={draft.longitude} error={fieldErrors.longitude} onChange={(value) => updateDraft({ longitude: value })} />
                      </div>
                      <div className="row">
                        <div className="col-md-12">
                          <div className="form-group">
                            <label className="listing-field-label">Category</label>
                            <select
                              className={`form-control${fieldErrors.category ? " is-invalid" : ""}`}
                              value={draft.category}
                              onChange={(event) => updateDraft({ category: event.target.value, subCategory: "", customFields: {} })}
                            >
                              <option value="">Select Category</option>
                              {categoryOptions.map((category) => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                            <FieldError message={fieldErrors.category} />
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-12">
                          <div className="form-group">
                            <label className="listing-field-label">Sub Category</label>
                            <select className={`form-control${fieldErrors.subCategory ? " is-invalid" : ""}`} value={draft.subCategory} onChange={(event) => updateDraft({ subCategory: event.target.value, customFields: {} })}>
                              <option value="">Select Sub Category</option>
                              {subCategories.map((subCategory) => (
                                <option key={subCategory} value={subCategory}>{subCategory}</option>
                              ))}
                            </select>
                            <FieldError message={fieldErrors.subCategory} />
                          </div>
                        </div>
                      </div>
                      <ClassifiedDynamicFields
                        fields={visibleDynamicFields}
                        values={draft.customFields}
                        errors={fieldErrors}
                        onChange={updateCustomField}
                      />
                      <button className="btn btn-primary" type="button" onClick={handleNext}>Next</button>
                      <Progress value={35} />
                    </>
                  ) : null}

                  {step === 2 ? (
                    <>
                      <h4>Ad Details</h4>
                      <div className="row">
                        <div className="col-md-12">
                          <div className="form-group">
                            <label className="form-label">Ad Title <span className="text-danger">*</span></label>
                            <input className={`form-control${fieldErrors.title ? " is-invalid" : ""}`} value={draft.title} placeholder="Ad Title (e.g., 2BHK Flat for Rent in Hyderabad)" onChange={(event) => updateDraft({ title: event.target.value })} />
                            <FieldError message={fieldErrors.title} />
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-12">
                          <div className="form-group">
                            <label className="form-label">Listing Description <span className="text-danger">*</span></label>
                            <textarea className={`form-control${fieldErrors.description ? " is-invalid" : ""}`} value={draft.description} rows={6} placeholder="Describe your property, product, service, price, location, features, etc." onChange={(event) => updateDraft({ description: event.target.value })}></textarea>
                            <FieldError message={fieldErrors.description} />
                          </div>
                        </div>
                      </div>
                      <h4>Photo Gallery</h4>
                      <ClassifiedGalleryUploader files={galleryFiles} onFilesChange={setGalleryFiles} />
                      <div className="row classified-step-actions">
                        <div className="col-md-6">
                          <Link to={getClassifiedStepPath(1, editListingId)} className="btn btn-primary">Previous</Link>
                        </div>
                        <div className="col-md-6">
                          <button className="btn btn-primary" type="button" disabled={isSubmitting} onClick={handleSubmit}>
                            {isSubmitting ? "Saving..." : isEditMode ? "Save" : "Finish"}
                          </button>
                        </div>
                      </div>
                      <Progress value={90} />
                    </>
                  ) : null}

                  {step === 3 ? (
                    <>
                      <h4>Success</h4>
                      <p>{isEditMode ? "Your ad has been updated and sent back for admin approval." : "Your ad has been submitted and is waiting for admin approval."}</p>
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
                          <Link to={result ? `/listing/${result.id}` : "/dashboard/all-listing"} target="_blank" className="btn btn-primary">Listing preview</Link>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <DashboardFooter onOpenSupport={() => undefined} onOpenMobileMenu={() => undefined} />
    </>
  );
}

function isClassifiedListing(listing: ListingSummary) {
  const categoryName = listing.categoryName?.trim().toLowerCase();

  return categoryName === "classifieds";
}

function mapListingToClassifiedDraft(listing: ListingSummary): ClassifiedDraft {
  const propertyDetails = listing.propertyDetails || {};
  const priceDetails = listing.priceDetails || {};
  const locationDetails = listing.locationDetails || {};
  const sellerInformation = listing.sellerInformation || {};
  const otherInformation = parseJsonObject(propertyDetails.otherInformation);
  const customFieldsFromOther = isRecord(otherInformation.customFields)
    ? stringifyRecordValues(otherInformation.customFields)
    : {};
  const customFields = {
    ...extractClassifiedCustomFields(propertyDetails),
    ...customFieldsFromOther,
  };

  return {
    countryId: numberOrNull(stringValue(locationDetails.countryId)),
    stateId: numberOrNull(stringValue(locationDetails.stateId)),
    cityId: numberOrNull(stringValue(locationDetails.cityId)),
    country: stringValue(locationDetails.country),
    state: stringValue(locationDetails.state),
    city: stringValue(locationDetails.city || listing.city),
    address: stringValue(locationDetails.locality || listing.locality),
    pincode: stringValue(locationDetails.pincode),
    latitude: stringValue(locationDetails.latitude),
    longitude: stringValue(locationDetails.longitude),
    category: stringValue(otherInformation.classifiedCategory) || listing.subCategory || stringValue(propertyDetails.propertyType),
    subCategory: stringValue(otherInformation.classifiedSubCategory) || listing.detailCategory,
    title: listing.title || "",
    description: listing.description || "",
    price: stringValue(priceDetails.price || listing.price),
    sellerName: stringValue(sellerInformation.name) || listing.sellerName || "",
    sellerMobile: stringValue(sellerInformation.mobileNumber),
    sellerEmail: stringValue(sellerInformation.email),
    customFields,
  };
}

function extractClassifiedCustomFields(propertyDetails: Record<string, string | number | boolean | null>) {
  const skippedKeys = new Set(["listingKind", "propertyType", "otherInformation"]);
  const customFields: Record<string, string> = {};

  Object.entries(propertyDetails).forEach(([key, value]) => {
    if (skippedKeys.has(key) || value === null || value === undefined) {
      return;
    }

    customFields[key] = String(value);
  });

  return customFields;
}

function getExistingListingImageUrls(listing: ListingSummary) {
  return uniqueStrings([
    ...(listing.imageUrls || []),
    listing.primaryImageUrl || "",
  ]);
}

function parseJsonObject(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function stringifyRecordValues(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
}

function stringValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function Progress({ value }: { value: number }) {
  return (
    <div className="progress biz-prog">
      <div className="progress-bar bg-success progress-bar-striped progress-bar-animated" style={{ width: `${value}%` }}>{value}%</div>
    </div>
  );
}

function InlineInput({
  placeholder,
  value,
  onChange,
  error,
  type = "text",
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
}) {
  return (
    <div className="row">
      <InlineInputColumn placeholder={placeholder} value={value} onChange={onChange} error={error} type={type} width="col-md-12" />
    </div>
  );
}

function fieldLabelFromPlaceholder(placeholder: string) {
  return placeholder.trim().replace(/^Select\s+/i, "");
}

function InlineInputColumn({
  placeholder,
  value,
  onChange,
  error,
  type = "text",
  width = "col-md-6",
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  width?: string;
}) {
  return (
    <div className={width}>
      <div className="form-group">
        <label className="listing-field-label">{fieldLabelFromPlaceholder(placeholder)}</label>
        <input
          className={`form-control${error ? " is-invalid" : ""}`}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        <FieldError message={error} />
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <div className="listing-field-error">{message}</div> : null;
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
}: {
  placeholder: string;
  value: string;
  error?: string;
  country: string;
  state: string;
  city: string;
  onChange: (value: string) => void;
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

  async function handleSelectSuggestion(suggestion: AddressSuggestion) {
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
  }

  const helperText = !country || !state || !city
    ? "Select country, state, and city before searching address."
    : isLoading
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

  return {
    id: String(item.place_id),
    title,
    subtitle: item.display_name,
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

function customFieldErrorKey(fieldKey: string) {
  return `customFields.${fieldKey}`;
}

function isMissingRequiredClassifiedValue(field: ListingCategoryFieldDefinition, value?: string) {
  if (field.fieldType === "checkbox") {
    return value !== "true";
  }

  return !String(value || "").trim();
}

function shouldShowClassifiedField(
  field: ListingCategoryFieldDefinition,
  categoryName: string,
  subCategory: string,
  values: Record<string, string>,
) {
  const key = normalizeClassifiedFieldKey(field.fieldKey);
  const vehicleCondition = getClassifiedFieldValue(values, "vehicleCondition", "vehicle_condition", "condition");
  const isNewVehicle = vehicleCondition === "New";
  const insurance = getClassifiedFieldValue(values, "insurance", "insuranceStatus", "insurance_status");
  const isRental = subCategory.toLowerCase().includes("rental");
  const isVehicleAccessory = subCategory.toLowerCase().includes("spare") || subCategory.toLowerCase().includes("accessor");
  const electronicsCondition = getClassifiedFieldValue(values, "condition");
  const electronicsWarranty = getClassifiedFieldValue(values, "warranty");
  const isElectronicsAccessory = subCategory.toLowerCase().includes("accessor");
  const categoryKey = categoryName.trim().toLowerCase();
  const subCategoryKey = subCategory.trim().toLowerCase();
  const isPropertyClassified = categoryKey === "real estate" || categoryKey === "properties";
  const isPlotRealEstate = /plot|land/.test(subCategoryKey);
  const isCommercialRealEstate = /commercial|shop|office|warehouse|industrial|retail/.test(subCategoryKey);
  const isRentRealEstate = /rent|pg|guest/.test(subCategoryKey);
  const isSaleRealEstate = /sale|new project|new construction/.test(subCategoryKey);
  const residentialPropertyKeys = ["bhk", "bedrooms", "bedroom", "bathrooms", "bathroom", "balconies", "furnishingtype", "furnishing_type"];
  const rentPropertyKeys = ["securitydepositdetail", "security_deposit_detail", "securitydeposit", "security_deposit", "deposit", "monthlyrentlabel", "monthly_rent_label", "monthlyrent", "monthly_rent", "leaseterms", "lease_terms"];
  const salePropertyKeys = ["loaneligibledetail", "loan_eligible_detail", "loaneligible", "loan_eligible", "salepricelabel", "sale_price_label", "saleprice", "sale_price", "ownershiptype", "ownership_type", "ownership", "mortgageinfo", "mortgage_info"];
  const leaseDurationKeys = ["leaseduration", "lease_duration"];
  const plotPropertyKeys = ["plotsize", "plot_size", "plotareadetail", "plot_area_detail", "plotarea", "plot_area", "lotsize", "lot_size", "lotsizesqft", "lot_size_sqft", "zoning", "zoningtype", "zoning_type"];
  const commercialPropertyKeys = ["commercialpropertytype", "commercial_property_type", "commercialtype", "commercial_type", "officetype", "office_type", "officecapacity", "office_capacity", "seatingcapacity", "seating_capacity", "businessuse", "business_use", "suitablefor", "suitable_for"];

  if (categoryName === "Vehicles" && isNewVehicle && ["kilometersdriven", "kilometers_driven", "kmdriven", "km_driven", "ownercount", "owner_count", "numberofowners", "number_of_owners", "rcavailable", "rc_available", "pucavailable", "puc_available", "servicehistory", "service_history", "loanstatus", "loan_status"].includes(key)) {
    return false;
  }

  if (categoryName === "Vehicles" && !isRental && ["rentaltype", "rental_type", "priceperhour", "price_per_hour", "priceperday", "price_per_day", "priceperhourday", "price_per_hour_day", "securitydepositvehicle", "security_deposit_vehicle"].includes(key)) {
    return false;
  }

  if (categoryName === "Vehicles" && isRental && ["price", "listing_price", "totalprice", "total_price", "saleprice", "sale_price", "vehicleprice", "vehicle_price", "pricenegotiable", "price_negotiable", "pricetype", "price_type"].includes(key)) {
    return false;
  }

  if (categoryName === "Vehicles" && insurance !== "Active" && ["insurancevalidtill", "insurance_valid_till"].includes(key)) {
    return false;
  }

  if (categoryName === "Vehicles" && isVehicleAccessory && ["brand", "model", "variant", "yearofmanufacture", "year_of_manufacture", "registrationyear", "registration_year", "vehiclecondition", "vehicle_condition", "fueltype", "fuel_type", "transmission", "kilometersdriven", "kilometers_driven", "kmdriven", "km_driven", "ownercount", "owner_count", "numberofowners", "number_of_owners", "insurance", "insurancestatus", "insurance_status", "insurancevalidtill", "insurance_valid_till", "registrationstate", "registration_state", "rto", "color", "rcavailable", "rc_available", "pucavailable", "puc_available", "servicehistory", "service_history", "loanstatus", "loan_status"].includes(key)) {
    return false;
  }

  if (categoryName === "Electronics & Appliances" && electronicsCondition === "New" && ["usageduration", "usage_duration", "batteryhealth", "battery_health"].includes(key)) {
    return false;
  }

  if (categoryName === "Electronics & Appliances" && electronicsWarranty !== "Yes" && ["warrantyremainingmonths", "warranty_remaining_months"].includes(key)) {
    return false;
  }

  if (categoryName === "Electronics & Appliances" && isElectronicsAccessory && ["ram", "storage", "processor", "screensize", "screen_size", "batteryhealth", "battery_health", "network", "graphicscard", "graphics_card", "operatingsystem", "operating_system", "displaytype", "display_type", "resolution", "smarttv", "smart_tv", "appliancetype", "appliance_type", "capacity", "energyrating", "energy_rating", "invertertechnology", "inverter_technology", "powerconsumption", "power_consumption"].includes(key)) {
    return false;
  }

  if (isPropertyClassified && isPlotRealEstate && residentialPropertyKeys.includes(key)) {
    return false;
  }

  if (isPropertyClassified && !isPlotRealEstate && !isRentRealEstate && rentPropertyKeys.includes(key)) {
    return false;
  }

  if (isPropertyClassified && !isPlotRealEstate && !isSaleRealEstate && salePropertyKeys.includes(key)) {
    return false;
  }

  if (isPropertyClassified && isSaleRealEstate && leaseDurationKeys.includes(key)) {
    return false;
  }

  if (isPropertyClassified && isPlotRealEstate && [...rentPropertyKeys, ...salePropertyKeys, ...leaseDurationKeys].includes(key)) {
    return false;
  }

  if (isPropertyClassified && !isPlotRealEstate && plotPropertyKeys.includes(key)) {
    return false;
  }

  if (isPropertyClassified && isCommercialRealEstate && residentialPropertyKeys.includes(key)) {
    return false;
  }

  if (isPropertyClassified && !isCommercialRealEstate && commercialPropertyKeys.includes(key)) {
    return false;
  }

  return true;
}

function getClassifiedFieldValue(values: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    if (values[key]) {
      return values[key];
    }
  }

  const normalizedKeys = keys.map(normalizeClassifiedFieldKey);
  const entry = Object.entries(values).find(([key]) => normalizedKeys.includes(normalizeClassifiedFieldKey(key)));
  return entry?.[1] || "";
}

function normalizeClassifiedFieldKey(key: string) {
  return key.replace(/[^a-z0-9_]/gi, "").toLowerCase();
}

function ClassifiedDynamicFields({
  fields,
  values,
  errors,
  onChange,
}: {
  fields: ListingCategoryFieldDefinition[];
  values: Record<string, string>;
  errors: Record<string, string>;
  onChange: (fieldKey: string, value: string) => void;
}) {
  const activeFields = fields
    .filter((field) => field.isActive)
    .sort((a, b) => a.sectionOrder - b.sectionOrder || a.displayOrder - b.displayOrder || a.id - b.id);
  const sections = activeFields.reduce<Array<{ name: string; fields: ListingCategoryFieldDefinition[] }>>((groups, field) => {
    const sectionName = field.sectionName || "Additional Details";
    const section = groups.find((item) => item.name === sectionName);

    if (section) {
      section.fields.push(field);
    } else {
      groups.push({ name: sectionName, fields: [field] });
    }

    return groups;
  }, []);

  if (!activeFields.length) {
    return null;
  }

  return (
    <>
      {sections.map((section) => (
        <div className="classified-dynamic-section" key={section.name}>
          <h4>{section.name}</h4>
          <div className="row">
            {section.fields.map((field) => (
              <ClassifiedDynamicField
                field={field}
                value={values[field.fieldKey] || ""}
                error={errors[customFieldErrorKey(field.fieldKey)]}
                onChange={(value) => onChange(field.fieldKey, value)}
                key={field.id}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function ClassifiedDynamicField({
  field,
  value,
  error,
  onChange,
}: {
  field: ListingCategoryFieldDefinition;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const label = `${field.label}${field.isRequired ? "*" : ""}`;

  if (field.fieldType === "textarea") {
    return (
      <div className="col-md-12">
        <div className="form-group">
          <label className="listing-field-label">{fieldLabelFromPlaceholder(label)}</label>
          <textarea
            className={`form-control${error ? " is-invalid" : ""}`}
            rows={3}
            placeholder={field.placeholder || label}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <FieldError message={error} />
        </div>
      </div>
    );
  }

  if (field.fieldType === "dropdown") {
    return (
      <div className="col-md-6">
        <div className="form-group">
          <label className="listing-field-label">{fieldLabelFromPlaceholder(label)}</label>
          <select
            className={`form-control${error ? " is-invalid" : ""}`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">{label}</option>
            {(field.options || []).map((option) => (
              <option value={option} key={option}>{option}</option>
            ))}
          </select>
          <FieldError message={error} />
        </div>
      </div>
    );
  }

  if (field.fieldType === "checkbox") {
    return (
      <div className="col-md-6">
        <div className="form-group classified-check-field">
          <label>
            <input
              type="checkbox"
              checked={value === "true"}
              onChange={(event) => onChange(String(event.target.checked))}
            />
            <span>{label}</span>
          </label>
          <FieldError message={error} />
        </div>
      </div>
    );
  }

  return (
    <InlineInputColumn
      placeholder={field.placeholder || label}
      type={field.fieldType === "number" || field.fieldType === "date" ? field.fieldType : "text"}
      value={value}
      error={error}
      onChange={onChange}
    />
  );
}

function ClassifiedGalleryUploader({
  files,
  onFilesChange,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function addFiles(fileList: FileList | null) {
    const selectedFiles = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (!selectedFiles.length) {
      return;
    }

    onFilesChange([...files, ...selectedFiles]);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
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
        onChange={(event) => addFiles(event.target.files)}
      />
      <div
        className="imageuploadify well listing-gallery-uploader"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
      >
        <div className="imageuploadify-overlay">
          <i className="fa fa-picture-o"></i>
        </div>
        <div className="imageuploadify-images-list text-center">
          <img src="/template-17/images/icon/upload.png" alt="" />
          <span className="imageuploadify-message">
            Drag&amp;Drop your image here or{" "}
            <button type="button" className="btn-default" onClick={() => inputRef.current?.click()}>
              select file to upload
            </button>
          </span>
          <span className="img-notes">Supports multiple JPG, JPEG, PNG and other image files</span>
          {files.length ? (
            <div className="listing-gallery-preview-grid">
              {files.map((file, index) => (
                <ClassifiedFilePreview file={file} onRemove={() => removeFile(index)} key={`${file.name}-${file.size}-${index}`} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ClassifiedFilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="listing-gallery-preview">
      <button type="button" className="btn btn-danger" onClick={onRemove}>
        <i className="material-icons">close</i>
      </button>
      {previewUrl ? <img src={previewUrl} alt="" /> : null}
      <div className="listing-gallery-preview-meta">
        <span>{file.name}</span>
        <small>{formatFileSize(file.size)}</small>
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

#!/usr/bin/env node

import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = path.resolve(import.meta.dirname, "..");

loadEnvFile(path.join(rootDir, ".env"));
loadEnvFile(path.join(rootDir, ".env.development"));

const args = new Set(process.argv.slice(2));

if (args.has("--help") || args.has("-h")) {
  printHelp();
  process.exit(0);
}

const apiBaseUrl = normalizeApiBaseUrl(
  process.env.SMOKE_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    "http://localhost:5145/api",
);
const includeOptional = readBool("SMOKE_INCLUDE_OPTIONAL", true);
const keepCreated = readBool("SMOKE_KEEP_CREATED", false);
const cleanupEach = readBool("SMOKE_CLEANUP_EACH", true);
const onePerCategory = readBool("SMOKE_ONE_PER_CATEGORY", true);
const maxCases = readInt("SMOKE_MAX_CASES", 0);
const categoryFilter = normalize(process.env.SMOKE_CATEGORY);
const categoryIdFilter = readInt("SMOKE_CATEGORY_ID", 0);
const subCategoryFilter = normalize(process.env.SMOKE_SUB_CATEGORY);
const titlePrefix = (process.env.SMOKE_TITLE_PREFIX || "SMOKE AUTO").trim() || "SMOKE AUTO";
const sellerEmail = (process.env.SMOKE_SELLER_EMAIL || "smoke.test@chaodesi.local").trim();
const sellerName = (process.env.SMOKE_SELLER_NAME || "Smoke Test User").trim();
const categoryCounts = parseCategoryCounts(process.env.SMOKE_CATEGORY_COUNTS);
const dataProfile = normalize(process.env.SMOKE_DATA_PROFILE);
const profileOffset = readInt("SMOKE_PROFILE_OFFSET", 0);
const categoryRunCounters = new Map();

const imagePool = [
  "/template-17/images/chao-buysell/sample1.jpg",
  "/template-17/images/ads-2/1.jpg",
  "/template-17/images/ads-2/2.jpg",
  "/template-17/images/areas/dallas.jpg",
  "/template-17/images/areas/chicago.jpg",
  "/template-17/images/automobile-bg.jpg",
  "/template-17/images/all-product-bg.jpg",
  "/template-17/images/home4.jpg",
  "/template-17/images/home5.jpg",
  "/template-17/images/coupon-deals.jpg",
];

const noviRealImagePool = [
  "https://commons.wikimedia.org/wiki/Special:FilePath/Twelve%20Oaks%20Mall%20interior.jpg",
  "https://commons.wikimedia.org/wiki/Special:FilePath/Novi%2C%20Michigan%20%2821676246506%29.jpg",
  "https://commons.wikimedia.org/wiki/Special:FilePath/Suburban%20Collection%20Showplace%2C%20Novi%2C%20Michigan.jpg",
  "https://commons.wikimedia.org/wiki/Special:FilePath/Nordstrom%20Entrance%20Twelve%20Oaks%20Mall%20Novi%20MI.jpg",
  "https://commons.wikimedia.org/wiki/Special:FilePath/Novi%20Michigan%20Civic%20Center.JPG",
  "https://commons.wikimedia.org/wiki/Special:FilePath/Gardner-White%20Furniture%2C%20Novi%2C%20Michigan.jpg",
  "https://commons.wikimedia.org/wiki/Special:FilePath/Walled%20Lake%20as%20seen%20from%20Beachwalk%20Apartments%2C%20Novi%2C%20Michigan%20-%2020201214.jpg",
];

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: readInt("SMOKE_TIMEOUT_MS", 30000),
  validateStatus: () => true,
});

const createdListingIds = [];
const results = [];

main().catch(async (error) => {
  console.error(`\nSmoke runner failed: ${errorMessage(error)}`);
  await cleanupCreatedListings();
  process.exit(1);
});

async function main() {
  console.log(`Posting smoke API: ${apiBaseUrl}`);

  const token = await resolveAuthToken();
  api.defaults.headers.common.Authorization = `Bearer ${token}`;

  const categories = await getJson("/ListingCategories/tree", "category tree");
  const allCases = buildCases(categories);
  const cases = selectCases(allCases)
    .filter((testCase) => !categoryIdFilter || Number(testCase.category.id) === categoryIdFilter)
    .filter((testCase) => !categoryFilter || normalize(testCase.category.name) === categoryFilter)
    .filter((testCase) => !subCategoryFilter || normalize(testCase.subCategory?.name) === subCategoryFilter);
  const selectedCases = maxCases > 0 ? cases.slice(0, maxCases) : cases;

  if (selectedCases.length === 0) {
    throw new Error("No category cases matched the supplied filters.");
  }

  console.log(`Cases selected: ${selectedCases.length}${keepCreated ? " (cleanup disabled)" : ""}`);

  for (const [index, testCase] of selectedCases.entries()) {
    await runCase(testCase, index + 1, selectedCases.length);
  }

  await cleanupCreatedListings();
  printSummary();

  if (results.some((result) => result.status !== "PASS")) {
    process.exit(1);
  }
}

async function runCase(testCase, index, total) {
  const label = caseLabel(testCase);
  process.stdout.write(`[${index}/${total}] ${label} ... `);

  try {
    const fields = await getCategoryFields(testCase);
    const payload = buildListingPayload(testCase, fields);
    const createResponse = await api.post("/Listings", payload);

    if (createResponse.status < 200 || createResponse.status >= 300) {
      throw new Error(formatApiError(createResponse));
    }

    const listingId = getListingId(createResponse.data);
    if (!listingId) {
      throw new Error("Create response did not include a listing id.");
    }

    createdListingIds.push(listingId);

    const readResponse = await api.get(`/Listings/${listingId}`);
    if (readResponse.status < 200 || readResponse.status >= 300) {
      throw new Error(`Readback failed: ${formatApiError(readResponse)}`);
    }

    assertReadback(readResponse.data, payload, listingId);

    if (cleanupEach && !keepCreated) {
      await deleteCreatedListing(listingId);
      removeCreatedListingId(listingId);
    }

    results.push({ label, listingId, status: "PASS" });
    console.log(`PASS #${listingId}`);
  } catch (error) {
    results.push({ label, status: "FAIL", error: errorMessage(error) });
    console.log(`FAIL - ${errorMessage(error)}`);
  }
}

async function resolveAuthToken() {
  if (process.env.SMOKE_AUTH_TOKEN) {
    return process.env.SMOKE_AUTH_TOKEN.trim();
  }

  const loginId = process.env.SMOKE_EMAIL || process.env.SMOKE_LOGIN_ID;
  const password = process.env.SMOKE_PASSWORD;

  if (!loginId || !password) {
    throw new Error(
      "Set SMOKE_AUTH_TOKEN, or set SMOKE_EMAIL/SMOKE_LOGIN_ID and SMOKE_PASSWORD.",
    );
  }

  const response = await api.post("/Auth/login", { loginId, password });
  if (response.status < 200 || response.status >= 300 || !response.data?.token) {
    throw new Error(`Login failed: ${formatApiError(response)}`);
  }

  return response.data.token;
}

async function getJson(url, label) {
  const response = await api.get(url);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Could not load ${label}: ${formatApiError(response)}`);
  }

  return response.data;
}

async function getCategoryFields(testCase) {
  const response = await api.get("/ListingCategoryFields", {
    params: {
      categoryId: testCase.category.id,
      subCategoryId: testCase.subCategory?.id,
      detailedCategoryId: testCase.detailCategory?.id,
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Could not load category fields: ${formatApiError(response)}`);
  }

  return Array.isArray(response.data) ? response.data : [];
}

function buildCases(categories) {
  const activeCategories = Array.isArray(categories) ? categories : [];
  const cases = [];

  for (const category of activeCategories) {
    const subCategories = Array.isArray(category.subCategories) ? category.subCategories : [];
    if (subCategories.length === 0) {
      cases.push({ category, subCategory: null, detailCategory: null });
      continue;
    }

    for (const subCategory of subCategories) {
      const details = Array.isArray(subCategory.detailedCategories)
        ? subCategory.detailedCategories
        : [];
      if (details.length === 0) {
        cases.push({ category, subCategory, detailCategory: null });
        continue;
      }

      for (const detailCategory of details) {
        cases.push({ category, subCategory, detailCategory });
      }
    }
  }

  return cases;
}

function limitOnePerCategory(cases) {
  if (!onePerCategory) {
    return cases;
  }

  const selected = [];
  const seen = new Set();

  for (const testCase of cases) {
    const key = normalize(testCase.category.name);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    selected.push(testCase);
  }

  return selected;
}

function selectCases(cases) {
  if (categoryCounts.size === 0) {
    return limitOnePerCategory(cases);
  }

  const selected = [];

  for (const [categoryKey, count] of categoryCounts.entries()) {
    const matching = cases.filter((testCase) => categoryKeyMatches(testCase.category, categoryKey));
    selected.push(...matching.slice(0, count));
  }

  return selected;
}

function categoryKeyMatches(category, categoryKey) {
  const id = Number(categoryKey);
  if (Number.isFinite(id) && id > 0) {
    return Number(category.id) === id;
  }

  return normalize(category.name) === normalize(categoryKey);
}

function nextCategoryRunIndex(categoryId) {
  const key = String(categoryId);
  const next = (categoryRunCounters.get(key) || 0) + 1;
  categoryRunCounters.set(key, next);
  return next;
}

function buildListingPayload(testCase, fields) {
  const categoryName = testCase.category.name;
  const subCategory = testCase.subCategory?.name || "General";
  const detailCategory = testCase.detailCategory?.name || subCategory;
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const runIndex = nextCategoryRunIndex(testCase.category.id);
  const profile = listingProfileFor(testCase, runIndex);
  const title = profile?.title || `${titlePrefix} ${categoryName} ${stamp}`;
  const categoryAttributes = buildCategoryAttributes(fields);
  const price = profile?.price ?? choosePrice(categoryName);
  const propertyDetails = buildPropertyDetails(categoryName, subCategory, detailCategory, categoryAttributes, profile);
  const settings = buildSettings(categoryName);

  const payload = {
    listingCategoryId: testCase.category.id,
    listingSubCategoryId: testCase.subCategory?.id ?? null,
    listingDetailedCategoryId: testCase.detailCategory?.id ?? null,
    title,
    description: profile?.description || buildDescription(categoryName, subCategory, detailCategory),
    categoryName,
    subCategory,
    detailCategory,
    propertyDetails,
    priceDetails: {
      price,
      priceNegotiable: true,
      maintenanceCharges: isRealEstate(categoryName) ? 150 : null,
      securityDeposit: needsSecurityDeposit(categoryName, subCategory) ? 1000 : null,
      loanEligible: false,
      pricePerSqFt: isRealEstate(categoryName) ? 2 : null,
    },
    locationDetails: buildLocation(),
    amenities: {
      parking: true,
      lift: true,
      powerBackup: true,
      security: true,
      gym: false,
      swimmingPool: false,
      garden: true,
      childrensPlayArea: false,
      cctv: true,
    },
    media: buildMedia(categoryName, profile),
    sellerInformation: {
      name: sellerName,
      mobileNumber: "2485550198",
      isMobileOtpVerified: true,
      email: sellerEmail,
      whatsAppNumber: "2485550198",
      websiteUrl: "https://www.chaodesi.com",
      sellerType: sellerTypeFor(categoryName),
      reraNumber: "",
      ownershipType: "Owner",
    },
    settings,
    restaurantFoodDetails: buildRestaurantFoodDetails(categoryName, title, profile),
    restaurantMenuItems: buildRestaurantMenuItems(categoryName, profile),
    restaurantOperatingHours: buildRestaurantOperatingHours(categoryName),
    vehicleDetails: buildVehicleDetails(categoryName, subCategory, detailCategory),
    electronicsDetails: {
      ...buildElectronicsDetails(categoryName, subCategory, detailCategory),
      ...(profile?.electronicsDetails || {}),
    },
    careServiceDetails: buildCareServiceDetails(categoryName, subCategory, detailCategory),
  };

  propertyDetails.otherInformation = JSON.stringify({
    generatedBy: "posting-smoke",
    dataProfile: dataProfile || null,
    source: profile?.source || null,
    categoryAttributes,
    optionalFieldsIncluded: includeOptional,
  });

  return payload;
}

function buildCategoryAttributes(fields) {
  const attributes = {};

  for (const field of fields) {
    if (!field?.isActive) {
      continue;
    }

    if (!includeOptional && !field.isRequired) {
      continue;
    }

    const key = field.fieldKey || camelCase(field.label || `field_${field.id}`);
    attributes[key] = valueForField(field);
  }

  return attributes;
}

function valueForField(field) {
  const key = normalize(field.fieldKey || field.label);
  const label = normalize(field.label);
  const options = Array.isArray(field.options) ? field.options.filter(Boolean) : [];
  const option = chooseOption(options, key, label);

  if (field.fieldType === "dropdown") return option || "Yes";
  if (field.fieldType === "checkbox") return true;
  if (field.fieldType === "file") return imagePool[0];
  if (field.fieldType === "date") return futureDate(14);
  if (field.fieldType === "number") return numberForKey(key, label);
  if (field.fieldType === "textarea") {
    return "Smoke test generated realistic description for this field. It confirms optional and required dynamic category data can be saved and read back.";
  }

  if (key.includes("email")) return "smoke.test@chaodesi.local";
  if (key.includes("phone") || key.includes("mobile")) return "2485550198";
  if (key.includes("url") || key.includes("website")) return "https://www.chaodesi.com";
  if (key.includes("zip") || key.includes("pincode")) return "48375";
  if (key.includes("year")) return "2021";
  if (key.includes("price") || key.includes("cost") || key.includes("rent")) return "1200";
  if (key.includes("brand")) return "Samsung";
  if (key.includes("model")) return "Standard Model";
  if (key.includes("license")) return "LIC-SMOKE-1001";

  return option || "Smoke Test Value";
}

function chooseOption(options, key, label) {
  if (options.length === 0) return null;
  const lowered = new Map(options.map((option) => [normalize(option), option]));

  for (const candidate of ["Yes", "Active", "Available", "Owner", "Individual", "Veg", "Hourly", "Full Time"]) {
    if (lowered.has(normalize(candidate))) return lowered.get(normalize(candidate));
  }

  if (key.includes("condition") || label.includes("condition")) {
    return lowered.get("used") || lowered.get("new") || options[0];
  }

  return options.find((option) => !/^select\b/i.test(option)) || options[0];
}

function numberForKey(key, label) {
  if (key.includes("year") || label.includes("year")) return 2021;
  if (key.includes("bed") || key.includes("bhk")) return 2;
  if (key.includes("bath")) return 2;
  if (key.includes("staff")) return 8;
  if (key.includes("experience")) return 5;
  if (key.includes("radius")) return 10;
  if (key.includes("price") || key.includes("cost") || key.includes("rent")) return 1200;
  if (key.includes("area") || key.includes("sq")) return 950;
  return 10;
}

function buildPropertyDetails(categoryName, subCategory, detailCategory, categoryAttributes, profile = null) {
  const isPlot = containsAny(subCategory, ["plot", "land"]) || containsAny(detailCategory, ["plot", "land"]);
  const isPg = containsAny(subCategory, ["pg", "co-living"]);
  const isCommercial = containsAny(subCategory, ["commercial"]);

  return {
    listingKind: isCommercial ? "Commercial" : "Residential",
    propertyType: isPlot ? "Residential Plot" : isCommercial ? "Office Space" : "Apartment",
    bhk: isPlot || isCommercial ? "" : "2 BHK",
    bathrooms: isPlot ? null : 2,
    balconies: isPlot ? null : 1,
    furnishingType: "Semi Furnished",
    superBuiltUpArea: isPlot ? null : 950,
    carpetArea: isPlot ? null : 820,
    floorNumber: isPlot ? null : 2,
    totalFloors: isPlot ? null : 5,
    propertyAge: "1-5 Years",
    facing: "East",
    availability: "Ready to Move",
    availabilityDate: futureDate(7),
    area: 180,
    washrooms: isCommercial ? 2 : null,
    parking: true,
    suitableFor: "Family",
    plotArea: isPlot ? 2400 : null,
    length: isPlot ? 60 : null,
    breadth: isPlot ? 40 : null,
    boundaryWall: isPlot ? true : null,
    approvalType: isPlot ? "Approved" : "",
    roadWidth: isPlot ? 30 : null,
    roomType: isPg ? "Private Room" : "Private",
    genderPreference: isPg ? "Any" : "No Preference",
    foodIncluded: isPg ? true : null,
    pgAmenities: isPg ? "WiFi, Laundry, Parking" : "",
    services: categoryAttributes.services || "Standard services available",
    offers: profile?.offer || "Introductory smoke test offer",
    otherInformation: "",
    businessDescription: profile?.description || buildDescription(categoryName, subCategory, detailCategory),
    businessHours: "Mon-Sat 10:00 AM - 8:00 PM",
    additionalContactInfo: "Call or email for smoke test verification.",
    webLinks: "https://www.chaodesi.com",
    socialLinks: "https://www.facebook.com/chaodesi",
    products: "Sample products and services",
    brands: "Samsung, LG, Whirlpool",
    paymentMethods: "Cash, Card, Zelle",
    restaurantInfo: categoryAttributes.restaurantInfo || "",
  };
}

function buildLocation() {
  return {
    countryId: null,
    stateId: null,
    cityId: null,
    country: "United States",
    state: "Michigan",
    city: "Novi",
    locality: "46000 Grand River Ave, Novi, Oakland County, Michigan, United States",
    landmark: "Near Twelve Oaks Mall",
    pincode: "48375",
    latitude: 42.4806,
    longitude: -83.4755,
  };
}

function buildMedia(categoryName, profile = null) {
  if (dataProfile === "sulekha-novi") {
    const imageUrls = noviImageUrlsFor(categoryName);
    const firstImage = imageUrls[0] || noviRealImagePool[0];

    return {
      imageUrls,
      videoUrl: includeOptional ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : "",
      virtualTourUrl: isRealEstate(categoryName) && includeOptional ? "https://www.chaodesi.com" : "",
      logoUrl: isCare(categoryName) ? firstImage : includeOptional ? firstImage : "",
      coverBannerUrl: includeOptional ? imageUrls[1] || firstImage : "",
    };
  }

  if (Array.isArray(profile?.images) && profile.images.length > 0) {
    return {
      imageUrls: profile.images,
      videoUrl: includeOptional ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : "",
      virtualTourUrl: isRealEstate(categoryName) && includeOptional ? "https://www.chaodesi.com" : "",
      logoUrl: profile.logoUrl || (includeOptional ? profile.images[0] : ""),
      coverBannerUrl: profile.coverBannerUrl || (includeOptional ? profile.images[1] || profile.images[0] : ""),
    };
  }

  const count = requiredImageCount(categoryName);
  const imageUrls = imagePool.slice(0, Math.max(count, includeOptional ? Math.min(4, imagePool.length) : count));
  const firstImage = imageUrls[0] || imagePool[0];

  return {
    imageUrls,
    videoUrl: includeOptional ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : "",
    virtualTourUrl: isRealEstate(categoryName) && includeOptional ? "https://www.chaodesi.com" : "",
    logoUrl: isCare(categoryName) ? firstImage : includeOptional ? firstImage : "",
    coverBannerUrl: includeOptional ? imagePool[1] : "",
  };
}

function noviImageUrlsFor(categoryName) {
  const requiredCount = Math.max(requiredImageCount(categoryName), 3);
  const normalizedCategory = normalize(categoryName);
  const categoryStartIndex =
    normalizedCategory === "restaurants & food" ? 0 :
    normalizedCategory === "electronics & appliances" ? 3 :
    normalizedCategory === "roommates & rentals" ? 6 :
    normalizedCategory === "events & tickets" ? 2 :
    normalizedCategory === "furniture & home" ? 5 :
    normalizedCategory === "vehicles" ? 1 :
    normalizedCategory === "real estate" ? 6 :
    4;

  return Array.from({ length: requiredCount }, (_, index) =>
    noviRealImagePool[(categoryStartIndex + index) % noviRealImagePool.length]);
}

function buildSettings(categoryName) {
  return {
    adType: "Free",
    adDurationDays: isRestaurant(categoryName) ? 30 : isCare(categoryName) ? 30 : 30,
    autoRenew: false,
    metaTitle: "Smoke Test Listing",
    metaDescription: "Automated smoke test listing that is created, verified, and deleted.",
    verifiedByAdmin: false,
  };
}

function buildRestaurantFoodDetails(categoryName, title, profile = null) {
  if (!isRestaurant(categoryName)) return {};

  return {
    businessName: title,
    tagline: profile?.tagline || "Fresh local flavors",
    cuisineType: profile?.cuisineType || "Indian",
    businessType: "Restaurant",
    yearEstablished: 2021,
    numberOfStaff: 8,
    serviceTypes: ["Dine-In", "Takeaway"],
    serviceRadiusMiles: 10,
    instagramUrl: "https://www.instagram.com/chaodesi",
    facebookUrl: "https://www.facebook.com/chaodesi",
    tikTokUrl: "",
    twitterUrl: "",
    youTubeUrl: "",
    averageCostForTwo: profile?.averageCostForTwo || 35,
    discountsOffers: profile?.offer || "10% off on first order",
    couponCodes: "SMOKE10",
    happyHours: "4 PM - 6 PM",
    deliveryAvailable: false,
    deliveryFee: null,
    minimumOrderValue: null,
    onlineOrderingAvailable: false,
    thirdPartyIntegrations: [],
    amenities: ["Parking", "Family Friendly"],
    foodLicenseNumber: "FOOD-SMOKE-1001",
    healthInspectionRating: "A",
    alcoholLicenseNumber: "ALC-SMOKE-1001",
    taxIdInternal: "TAX-SMOKE-1001",
    tableBookingEnabled: true,
    orderNowEnabled: false,
    enableChat: true,
    enableCall: true,
    bulkOrderNotes: "Available for small gatherings.",
    customOrderOptions: "Mild, medium, and spicy options.",
    eventLocationNotes: "",
    ageRestrictedNotice: "",
  };
}

function buildRestaurantMenuItems(categoryName, profile = null) {
  if (!isRestaurant(categoryName)) return [];

  if (Array.isArray(profile?.menuItems) && profile.menuItems.length > 0) {
    return profile.menuItems.map((item, index) => ({
      itemName: item.itemName,
      menuCategory: item.menuCategory || "Main Menu",
      description: "",
      price: item.price,
      foodType: item.foodType,
      calories: null,
      imageUrl: item.imageUrl || imagePool[index % imagePool.length],
      displayOrder: index + 1,
      isAvailable: true,
    }));
  }

  return [
    {
      itemName: "Paneer Tikka",
      menuCategory: "Appetizers",
      description: "",
      price: 12.99,
      foodType: "Veg",
      calories: null,
      imageUrl: imagePool[0],
      displayOrder: 1,
      isAvailable: true,
    },
  ];
}

function listingProfileFor(testCase, index) {
  if (dataProfile !== "sulekha-novi") {
    return null;
  }

  const categoryId = Number(testCase.category.id);
  const profiles = noviSulekhaProfiles[categoryId] || [];
  return profiles[(index - 1 + profileOffset) % profiles.length] || null;
}

const noviSulekhaProfiles = {
  2: [
    {
      title: "Novi Vegetarian Indian Kitchen",
      description:
        "Authentic Indian vegetarian restaurant profile for Novi, Michigan. The listing highlights gluten-free, vegan, Jain, South Indian, North Indian, Indo-Chinese, chaat, dosa and vegetable biryani choices.",
      tagline: "Authentic Indian vegetarian cuisine in Novi",
      cuisineType: "Andhra, North Indian, South Indian, Vegetarian",
      averageCostForTwo: 35,
      offer: "Serving ZIP codes 48374, 48375, 48376 and 48377 with vegetarian dining options.",
      price: 12,
      source: "https://us.sulekha.com/novi-mi/restaurants",
      images: [
        "/template-17/images/services/1.jpg",
        "/template-17/images/services/2.jpeg",
        "/template-17/images/services/3.jpg",
        "/template-17/images/services/resto-1.jpg",
      ],
      menuItems: [
        { itemName: "Vegetable Biryani", menuCategory: "Biryani", price: 12, foodType: "Veg", imageUrl: "/template-17/images/services/1.jpg" },
        { itemName: "Dosa Platter", menuCategory: "South Indian", price: 10, foodType: "Veg", imageUrl: "/template-17/images/services/2.jpeg" },
      ],
    },
    {
      title: "Novi Regional Indian Cuisine",
      description:
        "Indian cuisine restaurant profile serving Novi, Michigan with Andhra, Asian, Hyderabadi, Kerala, North Indian, South Indian and vegetarian restaurant options.",
      tagline: "Regional Indian flavors for Novi diners",
      cuisineType: "Andhra, Asian, Hyderabadi, Kerala, North Indian, South Indian, Vegetarian",
      averageCostForTwo: 30,
      offer: "Serving ZIP codes 48374, 48375, 48376 and 48377 with dine-in and takeaway support.",
      price: 9,
      source: "https://us.sulekha.com/novi-mi/restaurants",
      images: [
        "/template-17/images/services/4.jpg",
        "/template-17/images/services/5.jpeg",
        "/template-17/images/services/6.jpeg",
        "/template-17/images/services/7.jpg",
      ],
      menuItems: [
        { itemName: "Hyderabadi Biryani", menuCategory: "Biryani", price: 13, foodType: "Non-Veg", imageUrl: "/template-17/images/services/4.jpg" },
        { itemName: "Kerala Veg Curry", menuCategory: "Curries", price: 11, foodType: "Veg", imageUrl: "/template-17/images/services/5.jpeg" },
      ],
    },
    {
      title: "Novi Hyderabadi Restaurant And Bakery",
      description:
        "Indian restaurant and bakery profile for Novi, Michigan, focused on Hyderabadi restaurant options, bakery items, biryani, curries, tandoor selections and family dining.",
      tagline: "Hyderabadi restaurant and bakery near Novi",
      cuisineType: "Hyderabadi, Indian, Bakery, North Indian, South Indian",
      averageCostForTwo: 32,
      offer: "Indian restaurant and bakery service for Novi area customers.",
      price: 14,
      source: "https://us.sulekha.com/novi-mi/restaurants",
      images: [
        "/template-17/images/services/8.jpg",
        "/template-17/images/services/9.jpeg",
        "/template-17/images/listing-ban/26555pexels-chevanon-photography-1108101.jpg",
        "/template-17/images/listing-ban/30354slider-1.jpg",
      ],
      menuItems: [
        { itemName: "Hyderabadi Dum Biryani", menuCategory: "Biryani", price: 14, foodType: "Non-Veg", imageUrl: "/template-17/images/services/8.jpg" },
        { itemName: "Bakery Snack Box", menuCategory: "Bakery", price: 8, foodType: "Veg", imageUrl: "/template-17/images/services/9.jpeg" },
      ],
    },
  ],
  5: [
    {
      title: "Novi Certified Smartphone Deal",
      description:
        "Electronics listing for Novi, Michigan. This smartphone deal highlights a clean display, 5G support, good battery health, charger support and local pickup availability.",
      price: 420,
      offer: "Local Novi pickup available. Same-day inspection before purchase.",
      source: "https://us.sulekha.com/novi-mi/online-shopping",
      images: [
        "/template-17/images/products/1.jpg",
        "/template-17/images/products/2.jpeg",
        "/template-17/images/products/3.jpeg",
      ],
      electronicsDetails: {
        brand: "Samsung",
        modelNameNumber: "Galaxy S23 5G",
        condition: "Used",
        purchaseYear: 2024,
        billAvailable: true,
        warranty: true,
        warrantyRemainingMonths: 8,
        color: "Phantom Black",
        usageDuration: "8 months",
        ram: "8 GB",
        storage: "256 GB",
        screenSize: "6.1 inch",
        batteryHealth: "92%",
        network: "5G",
        features: ["Bluetooth", "WiFi", "Touchscreen", "Fast Charging", "Smart Features"],
      },
    },
    {
      title: "Novi Reliable Feature Phone",
      description:
        "Feature phone listing for Novi buyers looking for a simple secondary phone with long battery life, clear calling and easy local purchase.",
      price: 65,
      offer: "Budget phone with charger and basic warranty check.",
      source: "https://us.sulekha.com/novi-mi/online-shopping",
      images: [
        "/template-17/images/products/4.jpeg",
        "/template-17/images/products/5.jpeg",
        "/template-17/images/products/6.jpeg",
      ],
      electronicsDetails: {
        brand: "Nokia",
        modelNameNumber: "Nokia 2780 Flip",
        condition: "Used",
        purchaseYear: 2023,
        billAvailable: true,
        warranty: false,
        warrantyRemainingMonths: 0,
        color: "Blue",
        usageDuration: "1 year",
        ram: "512 MB",
        storage: "4 GB",
        screenSize: "2.7 inch",
        batteryHealth: "Good",
        network: "4G",
        features: ["Bluetooth", "WiFi", "Smart Features"],
      },
    },
    {
      title: "Novi Tablet With Keyboard Case",
      description:
        "Tablet listing for Novi customers needing a portable device for school, work and entertainment. Includes keyboard case, WiFi support, clean screen and local inspection.",
      price: 280,
      offer: "Tablet bundle includes keyboard case and charger.",
      source: "https://us.sulekha.com/novi-mi/online-shopping",
      images: [
        "/template-17/images/products/7.jpeg",
        "/template-17/images/products/8.jpeg",
        "/template-17/images/products/9.jpeg",
      ],
      electronicsDetails: {
        brand: "Lenovo",
        modelNameNumber: "Tab P12",
        condition: "Used",
        purchaseYear: 2024,
        billAvailable: true,
        warranty: true,
        warrantyRemainingMonths: 6,
        color: "Storm Grey",
        usageDuration: "6 months",
        ram: "8 GB",
        storage: "128 GB",
        screenSize: "12.7 inch",
        batteryHealth: "Excellent",
        network: "WiFi",
        features: ["Bluetooth", "WiFi", "Touchscreen", "Smart Features"],
      },
    },
    {
      title: "Novi Apple iPad Air Deal",
      description:
        "iPad listing for Novi area shoppers looking for a lightweight Apple tablet for browsing, classes, video calls and media. Device includes charger and clean body condition.",
      price: 510,
      offer: "Apple iPad Air with charger and local Novi handover.",
      source: "https://us.sulekha.com/novi-mi/online-shopping",
      images: [
        "/template-17/images/products/10.jpg",
        "/template-17/images/products/11.jpg",
        "/template-17/images/products/start-selling.jpg",
      ],
      electronicsDetails: {
        brand: "Apple",
        modelNameNumber: "iPad Air 5th Gen",
        condition: "Used",
        purchaseYear: 2024,
        billAvailable: true,
        warranty: true,
        warrantyRemainingMonths: 10,
        color: "Space Gray",
        usageDuration: "5 months",
        ram: "8 GB",
        storage: "256 GB",
        screenSize: "10.9 inch",
        batteryHealth: "95%",
        network: "WiFi",
        operatingSystem: "iPadOS",
        features: ["Bluetooth", "WiFi", "Touchscreen", "Fast Charging", "Smart Features"],
      },
    },
    {
      title: "Novi Smart Watch Fitness Bundle",
      description:
        "Smart watch listing for Novi customers who want fitness tracking, notifications, heart-rate monitoring and daily wear support with local pickup.",
      price: 155,
      offer: "Includes extra strap and charging cable.",
      source: "https://us.sulekha.com/novi-mi/online-shopping",
      images: [
        "/template-17/images/services/tech-1.jpg",
        "/template-17/images/all-product-bg.jpg",
        "/template-17/images/mobile.png",
      ],
      electronicsDetails: {
        brand: "Apple",
        modelNameNumber: "Apple Watch SE",
        condition: "Used",
        purchaseYear: 2023,
        billAvailable: true,
        warranty: false,
        warrantyRemainingMonths: 0,
        color: "Midnight",
        usageDuration: "1 year",
        screenSize: "44 mm",
        batteryHealth: "89%",
        connectivity: "Bluetooth, WiFi",
        features: ["Bluetooth", "WiFi", "Touchscreen", "Smart Features"],
      },
    },
  ],
  13: [
    {
      title: "Private Room Near Grand River Ave Novi",
      description:
        "Private room option in Novi, Michigan for working professionals looking for a clean place near shopping, restaurants and local commute routes.",
      price: 850,
      offer: "Utilities shared. Flexible move-in date.",
      source: "https://us.sulekha.com/novi-mi",
      images: [
        "/template-17/images/chao-home-room-listings/1.png",
        "/template-17/images/chao-home-room-listings/2.jpeg",
        "/template-17/images/chao-home-room-listings/3.png",
      ],
    },
    {
      title: "Shared Apartment Room In Novi 48375",
      description:
        "Shared apartment room in Novi, Michigan suitable for students or professionals. Kitchen access, parking and laundry are available.",
      price: 700,
      offer: "Month-to-month option available.",
      source: "https://us.sulekha.com/novi-mi",
      images: [
        "/template-17/images/chao-home-room-listings/2.jpeg",
        "/template-17/images/chao-home-room-listings/3.png",
        "/template-17/images/chao-home-room-listings/1.png",
      ],
    },
    {
      title: "Female Roommate Wanted In Novi",
      description:
        "Roommate wanted for a well-maintained Novi apartment close to grocery stores, restaurants and major roads. Vegetarian-friendly household preferred.",
      price: 750,
      offer: "WiFi and basic utilities included.",
      source: "https://us.sulekha.com/novi-mi",
      images: [
        "/template-17/images/chao-home-room-listings/3.png",
        "/template-17/images/chao-home-room-listings/1.png",
        "/template-17/images/chao-home-room-listings/2.jpeg",
      ],
    },
    {
      title: "Short Term Room Rental Novi Michigan",
      description:
        "Short-term room rental in Novi, Michigan for guests needing temporary accommodation near local offices and shopping centers.",
      price: 950,
      offer: "Weekly and monthly stay options.",
      source: "https://us.sulekha.com/novi-mi",
      images: [
        "/template-17/images/listings/1.jpeg",
        "/template-17/images/listings/2.jpg",
        "/template-17/images/listings/5.jpeg",
      ],
    },
  ],
  16: [
    {
      title: "Atul Purohit Garba Live Michigan",
      description:
        "Live Indian concert event listing for Novi, Michigan. The event focuses on Garba, community music, stage performance and ticketed entry.",
      price: 30,
      offer: "Advance event tickets available for community music and Garba night.",
      source: "https://us.sulekha.com/michigan-center-mi",
      images: [
        "/template-17/images/events/1.jpg",
        "/template-17/images/events/2.jpg",
        "/template-17/images/events/3.jpg",
      ],
    },
    {
      title: "DJ Dharak Bollywood Punjabi Night Novi",
      description:
        "Bollywood and Punjabi DJ night for Novi, Michigan. The event includes dance music, party lighting and ticketed entry.",
      price: 18,
      offer: "Early bird DJ night tickets available.",
      source: "https://us.sulekha.com/novi-mi/event-djs",
      images: [
        "/template-17/images/events/4.jpg",
        "/template-17/images/events/5.jpg",
        "/template-17/images/events/6.jpg",
      ],
    },
    {
      title: "Novi Desi Karaoke And Music Night",
      description:
        "Community karaoke and music night in Novi, Michigan for local Indian music fans. The event includes open mic singing, Hindi tracks, light refreshments and family-friendly seating.",
      price: 12,
      offer: "General admission includes karaoke participation.",
      source: "https://us.sulekha.com/novi-mi",
      images: [
        "/template-17/images/events/7.jpg",
        "/template-17/images/events/8.jpg",
        "/template-17/images/events/9.jpg",
      ],
    },
    {
      title: "Live Bollywood Band By Hamza Amir Detroit",
      description:
        "Live Bollywood and Pakistani music band event serving the Detroit and Novi community.",
      price: 35,
      offer: "Reserved seating available for live band performance.",
      source: "https://us.sulekha.com/detroit-metro-area/dhol-players",
      images: [
        "/template-17/images/events/10.jpg",
        "/template-17/images/events/3.jpg",
        "/template-17/images/events/5.jpg",
      ],
    },
    {
      title: "North Indian Classical Music Evening Novi",
      description:
        "Classical and semi-classical Indian music evening in Novi, Michigan, covering Hindi bhajans and North Indian classical music.",
      price: 25,
      offer: "Advance registration recommended for classical music seating.",
      source: "https://us.sulekha.com/novi-mi/singing-lessons/north-indian-classical-music-lessons-918131",
      images: [
        "/template-17/images/events/6.jpg",
        "/template-17/images/events/8.jpg",
        "/template-17/images/events/10.jpg",
      ],
    },
    {
      title: "Falguni Pathak Garba Event Tickets Novi",
      description:
        "Garba and Dandiya ticket listing for Novi, Michigan, for Indian music tours and Navratri celebrations.",
      price: 32,
      offer: "Family and group ticket options available for Garba night.",
      source: "https://us.sulekha.com/michigan-center-mi",
      images: [
        "/template-17/images/events/2.jpg",
        "/template-17/images/events/5.jpg",
        "/template-17/images/events/8.jpg",
      ],
    },
    {
      title: "Javed Ali Live Concert Tickets Novi",
      description:
        "Live Bollywood concert ticket listing for Novi area music lovers, focused on Indian concert tours and local event discovery.",
      price: 40,
      offer: "Reserved and general admission tickets available.",
      source: "https://us.sulekha.com/michigan-center-mi",
      images: [
        "/template-17/images/events/3.jpg",
        "/template-17/images/events/6.jpg",
        "/template-17/images/events/9.jpg",
      ],
    },
    {
      title: "Detroit Indian Wedding DJ Showcase",
      description:
        "Indian wedding DJ showcase serving the Detroit and Novi community for weddings, anniversaries, birthdays, Navratri and corporate events.",
      price: 22,
      offer: "Showcase pass includes DJ demos and event consultation access.",
      source: "https://us.sulekha.com/detroit-metro-area/dj-service",
      images: [
        "/template-17/images/events/5.jpg",
        "/template-17/images/events/7.jpg",
        "/template-17/images/events/10.jpg",
      ],
    },
    {
      title: "Novi Community Cultural Festival Tickets",
      description:
        "Community cultural festival ticket listing for Novi, Michigan with Indian music, food stalls, stage activities and family entertainment.",
      price: 16,
      offer: "Early community ticket pricing available.",
      source: "https://us.sulekha.com/novi-mi",
      images: [
        "/template-17/images/events/8.jpg",
        "/template-17/images/events/1.jpg",
        "/template-17/images/events/4.jpg",
      ],
    },
  ],
};

function buildRestaurantOperatingHours(categoryName) {
  if (!isRestaurant(categoryName)) return [];

  return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => ({
    dayOfWeek: day,
    isOpen: true,
    openTime: "10:00:00",
    closeTime: "21:00:00",
    is24Hours: false,
    specialHoursNote: "",
  }));
}

function buildVehicleDetails(categoryName, subCategory, detailCategory) {
  if (!isVehicle(categoryName)) return {};

  const isAccessory = containsAny(subCategory, ["accessor", "spare"]) || containsAny(detailCategory, ["accessor"]);
  const isRental = containsAny(subCategory, ["rental", "rent"]);
  const isBike = containsAny(subCategory, ["bike", "motorcycle", "scooter"]) || containsAny(detailCategory, ["bike", "scooter"]);
  const isCommercial = containsAny(subCategory, ["truck", "commercial"]);

  return {
    brand: isAccessory ? "" : "Toyota",
    model: isAccessory ? "" : "Camry",
    variant: "LE",
    yearOfManufacture: isAccessory ? null : 2021,
    registrationYear: isAccessory ? null : 2021,
    vehicleCondition: isAccessory ? "" : "Used",
    fuelType: isAccessory ? "" : "Petrol",
    transmission: isAccessory ? "" : "Automatic",
    kmDriven: isAccessory ? null : 22000,
    numberOfOwners: isAccessory ? null : 1,
    insuranceStatus: isAccessory ? "" : "Active",
    insuranceValidTill: futureDate(180),
    registrationState: "Michigan",
    rto: "MI",
    color: isAccessory ? "" : "White",
    bodyType: "Sedan",
    seatingCapacity: isBike ? 2 : 5,
    bootSpace: "Large",
    mileage: 28,
    engineCapacityCc: isBike ? 150 : 2000,
    bikeType: isBike ? "Scooter" : "",
    commercialVehicleType: isCommercial ? "Truck" : "",
    loadCapacity: isCommercial ? 2 : null,
    numberOfWheels: isBike ? 2 : 4,
    permitType: isCommercial ? "Commercial" : "",
    rentalType: isRental ? "Daily" : "",
    pricePerHour: isRental ? 25 : null,
    pricePerDay: isRental ? 90 : null,
    securityDeposit: isRental ? 500 : null,
    partType: isAccessory ? "Alloy Wheels" : "",
    compatibleModels: isAccessory ? "Toyota Camry 2018-2024" : "",
    partCondition: isAccessory ? "New" : "",
    rcAvailable: true,
    pucAvailable: true,
    serviceHistoryStatus: "Available",
    loanStatus: "No Loan",
    features: ["Air Conditioning", "ABS", "Bluetooth"],
  };
}

function buildElectronicsDetails(categoryName, subCategory, detailCategory) {
  if (!isElectronics(categoryName)) return {};

  const isPhone = containsAny(subCategory, ["mobile", "phone"]) || containsAny(detailCategory, ["tablet", "smartphone", "phone"]);
  const isComputer = containsAny(subCategory, ["computer"]) || containsAny(detailCategory, ["laptop", "desktop"]);
  const isTv = containsAny(detailCategory, ["tv"]);
  const isAppliance = containsAny(subCategory, ["appliance"]);
  const isAccessory = containsAny(subCategory, ["accessor"]);

  return {
    brand: "Samsung",
    modelNameNumber: "SMK-2024",
    condition: "Used",
    purchaseYear: 2023,
    billAvailable: true,
    warranty: true,
    warrantyRemainingMonths: 12,
    color: "Black",
    usageDuration: "1 year",
    ram: isPhone || isComputer ? "8 GB" : "",
    storage: isPhone || isComputer ? "256 GB" : "",
    processor: isComputer ? "Intel i5" : "",
    screenSize: isPhone || isTv ? "6.5 inch" : isComputer ? "14 inch" : "",
    batteryHealth: isPhone ? "90%" : "",
    network: isPhone ? "5G" : "",
    graphicsCard: isComputer ? "Integrated" : "",
    operatingSystem: isComputer ? "Windows 11" : "",
    displayType: isTv ? "LED" : "",
    resolution: isTv ? "4K" : "",
    smartTv: isTv ? true : null,
    applianceType: isAppliance && !isTv ? "Refrigerator" : "",
    capacity: isAppliance && !isTv ? "300 L" : "",
    energyRating: isAppliance && !isTv ? "5 Star" : "",
    inverterTechnology: isAppliance && !isTv ? true : null,
    powerConsumption: isAppliance ? "150W" : "",
    accessoryType: isAccessory ? "Charger" : "",
    compatibility: isAccessory ? "USB-C devices" : "",
    connectivity: isAccessory ? "USB-C" : "",
    features: ["Bluetooth", "WiFi", "Smart Features"],
  };
}

function buildCareServiceDetails(categoryName, subCategory, detailCategory) {
  if (!isCare(categoryName)) return {};

  const isPetCare = containsAny(subCategory, ["pet"]) || containsAny(detailCategory, ["pet"]);
  const isNursing = containsAny(subCategory, ["nursing"]);

  return {
    providerType: "Individual",
    experienceYears: 5,
    languagesSpoken: ["English", "Hindi"],
    servicesOffered: isPetCare ? ["Pet care"] : ["Meal Preparation", "Medication Reminder"],
    availabilityType: "Full Time",
    availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    availableTimeSlots: "9 AM - 5 PM",
    startDate: futureDate(3),
    rateType: "Hourly",
    willingToTravel: true,
    serviceRadiusMiles: 15,
    cprCertified: isPetCare ? null : true,
    firstAidCertified: isPetCare ? null : true,
    cnaCertified: isNursing ? true : false,
    rnLpn: isNursing ? true : false,
    licenseNumber: isNursing ? "RN-SMOKE-1001" : "",
    backgroundCheck: true,
    referencesAvailable: true,
    specialSkills: "Companionship, meal prep, medication reminders",
    previousEmployer: "Private family care",
    education: "Certified caregiver training",
    ageGroups: isPetCare ? ["Pets"] : ["Adults", "Seniors"],
    genderPreference: "No Preference",
    specialNeedsExperience: false,
    certificationDocuments: isNursing ? [imagePool[0]] : [],
    videoIntroductionUrl: "https://www.chaodesi.com",
    chatEnabled: true,
    callEnabled: true,
    scheduleInterview: true,
    identityVerification: true,
    backgroundVerification: true,
    serviceDisclaimer: "Smoke test caregiver profile for posting verification.",
    insurance: "",
  };
}

function assertReadback(listing, payload, listingId) {
  if (!listing || Number(listing.id) !== Number(listingId)) {
    throw new Error("Readback listing id did not match created id.");
  }

  if (normalize(listing.title) !== normalize(payload.title)) {
    throw new Error("Readback title did not match created payload.");
  }

  if (normalize(listing.categoryName) !== normalize(payload.categoryName)) {
    throw new Error("Readback category did not match created payload.");
  }

  if (payload.media.imageUrls.length > 0 && Array.isArray(listing.imageUrls) && listing.imageUrls.length === 0) {
    throw new Error("Readback did not include saved image URLs.");
  }
}

async function cleanupCreatedListings() {
  if (keepCreated || createdListingIds.length === 0 || !api.defaults.headers.common.Authorization) {
    return;
  }

  console.log(`Cleaning up ${createdListingIds.length} created listing(s)...`);
  for (const listingId of [...createdListingIds].reverse()) {
    try {
      await deleteCreatedListing(listingId);
    } catch (error) {
      results.push({
        label: `cleanup #${listingId}`,
        status: "FAIL",
        error: errorMessage(error),
      });
      console.log(`Cleanup failed for #${listingId}: ${errorMessage(error)}`);
    }
  }
}

async function deleteCreatedListing(listingId) {
  const response = await api.delete(`/Listings/${listingId}`);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(formatApiError(response));
  }
}

function removeCreatedListingId(listingId) {
  const index = createdListingIds.indexOf(listingId);
  if (index >= 0) {
    createdListingIds.splice(index, 1);
  }
}

function printSummary() {
  const passed = results.filter((result) => result.status === "PASS").length;
  const failed = results.filter((result) => result.status !== "PASS").length;

  console.log("\nPosting smoke summary");
  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);

  for (const result of results.filter((item) => item.status !== "PASS")) {
    console.log(`- ${result.label}: ${result.error}`);
  }
}

function printHelp() {
  console.log(`
Posting smoke automation

Creates test listings for category/subcategory/detail-category combinations, reads them back, and deletes them.

Required auth:
  SMOKE_AUTH_TOKEN=...                 Use an existing bearer token
  or SMOKE_EMAIL=... SMOKE_PASSWORD=... Login and fetch a token

Common options:
  SMOKE_API_BASE_URL=http://localhost:5145/api
  SMOKE_MAX_CASES=10                   Limit cases while debugging
  SMOKE_CATEGORY="Restaurants & Food"  Run one category
  SMOKE_CATEGORY_ID=2                  Run one category by ID
  SMOKE_CATEGORY_COUNTS="2=2;13=4"     Run exact counts by category ID/name
  SMOKE_DATA_PROFILE="sulekha-novi"    Use the Novi production seed profile
  SMOKE_SUB_CATEGORY="Restaurants"     Run one subcategory
  SMOKE_ONE_PER_CATEGORY=false         Test every detail category
  SMOKE_TITLE_PREFIX="EMAIL TEST"      Use a non-smoke title to allow real posting emails
  SMOKE_SELLER_EMAIL="you@example.com" Send owner email to this address
  SMOKE_INCLUDE_OPTIONAL=false         Fill only required dynamic fields
  SMOKE_CLEANUP_EACH=false             Delete all created listings at the end
  SMOKE_KEEP_CREATED=true              Do not delete created listings

PowerShell example:
  $env:SMOKE_API_BASE_URL="http://localhost:5145/api"
  $env:SMOKE_EMAIL="user@example.com"
  $env:SMOKE_PASSWORD="password"
  $env:SMOKE_MAX_CASES="5"
  npm run smoke:postings
`);
}

function requiredImageCount(categoryName) {
  if (isVehicle(categoryName)) return 3;
  if (isElectronics(categoryName)) return 3;
  if (isCare(categoryName)) return 1;
  if (isFurniture(categoryName)) return 3;
  if (isFashion(categoryName)) return 3;
  return 0;
}

function choosePrice(categoryName) {
  if (isRestaurant(categoryName)) return 25;
  if (isCare(categoryName)) return 30;
  if (isVehicle(categoryName)) return 14500;
  if (isElectronics(categoryName)) return 450;
  if (isRealEstate(categoryName)) return 1800;
  return 100;
}

function sellerTypeFor(categoryName) {
  if (isRestaurant(categoryName)) return "Business";
  if (isCare(categoryName)) return "Individual";
  return "Owner";
}

function needsSecurityDeposit(categoryName, subCategory) {
  return isRealEstate(categoryName) || isRoommates(categoryName) || containsAny(subCategory, ["rent"]);
}

function buildDescription(categoryName, subCategory, detailCategory) {
  return `Automated smoke test listing for ${categoryName}, ${subCategory}, ${detailCategory}. This realistic test data verifies required fields, optional fields, image URLs, location data, category details, save, readback, and cleanup before publishing.`;
}

function futureDate(days) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function caseLabel(testCase) {
  return [testCase.category.name, testCase.subCategory?.name, testCase.detailCategory?.name]
    .filter(Boolean)
    .join(" > ");
}

function getListingId(data) {
  return data?.id || data?.listingId || data?.listing?.id || null;
}

function formatApiError(response) {
  const data = response?.data;
  if (!data) return `HTTP ${response?.status}`;
  if (typeof data === "string") return `HTTP ${response.status}: ${data}`;
  if (data.message) return `HTTP ${response.status}: ${data.message}`;
  if (data.title) return `HTTP ${response.status}: ${data.title}`;
  if (data.errors) return `HTTP ${response.status}: ${JSON.stringify(data.errors)}`;
  return `HTTP ${response.status}: ${JSON.stringify(data)}`;
}

function errorMessage(error) {
  if (error?.response) return formatApiError(error.response);
  return error?.message || String(error);
}

function normalizeApiBaseUrl(value) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}

function readBool(name, fallback) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "y"].includes(value.trim().toLowerCase());
}

function readInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

function parseCategoryCounts(value) {
  const counts = new Map();
  if (!value) {
    return counts;
  }

  for (const part of String(value).split(/[;,]/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      throw new Error(`Invalid SMOKE_CATEGORY_COUNTS entry: ${trimmed}`);
    }

    const key = trimmed.slice(0, separator).trim();
    const count = Number.parseInt(trimmed.slice(separator + 1).trim(), 10);
    if (!key || !Number.isFinite(count) || count <= 0) {
      throw new Error(`Invalid SMOKE_CATEGORY_COUNTS entry: ${trimmed}`);
    }

    counts.set(key, count);
  }

  return counts;
}

function camelCase(value) {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, (chr) => chr.toLowerCase());
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function containsAny(value, needles) {
  const haystack = normalize(value);
  return needles.some((needle) => haystack.includes(needle));
}

function isRealEstate(categoryName) {
  return normalize(categoryName) === "real estate";
}

function isRestaurant(categoryName) {
  return normalize(categoryName) === "restaurants & food";
}

function isVehicle(categoryName) {
  return normalize(categoryName) === "vehicles";
}

function isElectronics(categoryName) {
  return normalize(categoryName) === "electronics & appliances";
}

function isCare(categoryName) {
  return normalize(categoryName) === "care services";
}

function isRoommates(categoryName) {
  return normalize(categoryName) === "roommates & rentals";
}

function isFurniture(categoryName) {
  const value = normalize(categoryName);
  return value === "furniture & home" || value === "furniture & home decor";
}

function isFashion(categoryName) {
  return normalize(categoryName) === "fashion & lifestyle";
}

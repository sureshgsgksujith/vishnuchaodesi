import type { ListingCategoryOption } from "../api/listingCategoriesApi";

export const fallbackListingCategoryTree: ListingCategoryOption[] = [
  {
    id: 1,
    name: "Real Estate",
    slug: "real-estate",
    subCategories: [
      { id: 101, name: "For Sale", slug: "for-sale", detailedCategories: [
        { id: 1001, name: "Apartments / Flats", slug: "for-sale-apartments-flats" },
        { id: 1002, name: "Independent Houses", slug: "independent-houses" },
        { id: 1003, name: "Villas", slug: "for-sale-villas" },
        { id: 1004, name: "Builder Floors", slug: "for-sale-builder-floors" },
        { id: 1005, name: "Townhouses", slug: "townhouses" },
        { id: 1006, name: "Condos", slug: "for-sale-condos" },
        { id: 1007, name: "Duplex / Triplex", slug: "duplex-triplex" },
        { id: 1008, name: "Farm Houses", slug: "farm-houses" },
        { id: 1009, name: "Mobile Homes", slug: "mobile-homes" },
        { id: 1010, name: "Land / Plots", slug: "for-sale-land-plots" },
      ] },
      { id: 102, name: "For Rent", slug: "for-rent", detailedCategories: [
        { id: 1011, name: "Apartments", slug: "for-rent-apartments" },
        { id: 1012, name: "Houses", slug: "for-rent-houses" },
        { id: 1013, name: "Villas", slug: "for-rent-villas" },
        { id: 1014, name: "Condos", slug: "for-rent-condos" },
        { id: 1015, name: "Studio Apartments", slug: "studio-apartments" },
        { id: 1016, name: "Basement Rentals", slug: "basement-rentals" },
        { id: 1017, name: "Shared Rooms", slug: "for-rent-shared-rooms" },
        { id: 1018, name: "Single Rooms", slug: "for-rent-single-rooms" },
        { id: 1019, name: "Entire Homes", slug: "entire-homes" },
      ] },
      { id: 103, name: "PG / Co-living", slug: "pg-co-living", detailedCategories: [
        { id: 1020, name: "PG Accommodation", slug: "pg-accommodation" },
        { id: 1021, name: "Shared Accommodation", slug: "shared-accommodation" },
        { id: 1022, name: "Co-living Spaces", slug: "co-living-spaces" },
        { id: 1023, name: "Student Housing", slug: "student-housing" },
        { id: 1024, name: "Working Professionals Housing", slug: "working-professionals-housing" },
      ] },
      { id: 104, name: "Commercial", slug: "commercial", detailedCategories: [
        { id: 1025, name: "Office Spaces", slug: "commercial-office-spaces" },
        { id: 1026, name: "Coworking Spaces", slug: "coworking-spaces" },
        { id: 1027, name: "Shops / Retail Stores", slug: "shops-retail-stores" },
        { id: 1028, name: "Warehouses / Godowns", slug: "warehouses-godowns" },
        { id: 1029, name: "Industrial Spaces", slug: "industrial-spaces" },
        { id: 1030, name: "Commercial Land", slug: "commercial-land" },
        { id: 1031, name: "Restaurants / Hospitality Spaces", slug: "restaurants-hospitality-spaces" },
      ] },
      { id: 105, name: "Vacation Rentals", slug: "vacation-rentals", detailedCategories: [
        { id: 1032, name: "Vacation Homes", slug: "vacation-homes" },
        { id: 1033, name: "Airbnb Rentals", slug: "airbnb-rentals" },
        { id: 1034, name: "Beach Houses", slug: "beach-houses" },
        { id: 1035, name: "Cabins / Cottages", slug: "cabins-cottages" },
        { id: 1036, name: "Resorts & Retreats", slug: "resorts-retreats" },
      ] },
      { id: 106, name: "New Projects / New Construction", slug: "new-projects-new-construction", detailedCategories: [
        { id: 1037, name: "New Apartments", slug: "new-apartments" },
        { id: 1038, name: "Under Construction Projects", slug: "under-construction-projects" },
        { id: 1039, name: "Ready-to-Move Homes", slug: "ready-to-move-homes" },
        { id: 1040, name: "Builder Projects", slug: "builder-projects" },
        { id: 1041, name: "Gated Communities", slug: "gated-communities" },
      ] },
      { id: 107, name: "Real Estate Services", slug: "real-estate-services", detailedCategories: [
        { id: 1042, name: "Real Estate Agents", slug: "real-estate-agents" },
        { id: 1043, name: "Property Management", slug: "property-management" },
        { id: 1044, name: "Home Inspection", slug: "home-inspection" },
        { id: 1045, name: "Interior Designers", slug: "interior-designers" },
        { id: 1046, name: "Movers & Packers", slug: "movers-packers" },
        { id: 1047, name: "Mortgage & Loan Services", slug: "mortgage-loan-services" },
      ] },
    ],
  },
  {
    id: 2,
    name: "Vehicles",
    slug: "vehicles",
    subCategories: [
      { id: 201, name: "Cars", slug: "cars", detailedCategories: [
        { id: 2001, name: "Used Cars", slug: "used-cars" },
        { id: 2002, name: "New Cars", slug: "new-cars" },
        { id: 2003, name: "Electric Vehicles", slug: "electric-vehicles" },
      ] },
      { id: 202, name: "Bikes", slug: "bikes", detailedCategories: [
        { id: 2004, name: "Scooters / Motorcycles", slug: "scooters-motorcycles" },
      ] },
      { id: 203, name: "Commercial Vehicles", slug: "commercial-vehicles", detailedCategories: [
        { id: 2005, name: "Trucks / Buses", slug: "trucks-buses" },
      ] },
      { id: 204, name: "Spare Parts & Accessories", slug: "spare-parts-accessories", detailedCategories: [
        { id: 2006, name: "Car Accessories", slug: "car-accessories" },
        { id: 2007, name: "Tyres / Batteries", slug: "tyres-batteries" },
      ] },
      { id: 205, name: "Rentals", slug: "rentals", detailedCategories: [
        { id: 2008, name: "Self-drive", slug: "self-drive" },
        { id: 2009, name: "With Driver", slug: "with-driver" },
      ] },
    ],
  },
  {
    id: 11,
    name: "Restaurants & Food",
    slug: "restaurants-food",
    subCategories: [
      { id: 1101, name: "Restaurants (Dine-In)", slug: "restaurant", detailedCategories: [
        { id: 11001, name: "Fine Dining Restaurants", slug: "fine-dining-restaurants" },
        { id: 11002, name: "Casual Dining Restaurants", slug: "casual-dining-restaurants" },
        { id: 11003, name: "Family Restaurants", slug: "family-restaurants" },
        { id: 11004, name: "Buffet Restaurants", slug: "buffet-restaurants" },
        { id: 11005, name: "Multi-Cuisine Restaurants", slug: "multi-cuisine-restaurants" },
        { id: 11006, name: "Ethnic Restaurants", slug: "ethnic-restaurants" },
        { id: 11007, name: "Seafood Restaurants", slug: "seafood-restaurants" },
        { id: 11008, name: "Steak Houses", slug: "steak-houses" },
      ] },
      { id: 1102, name: "Fast Food & Takeaway", slug: "fast-food-takeaway", detailedCategories: [
        { id: 11009, name: "Burger Outlets", slug: "burger-outlets" },
        { id: 11010, name: "Pizza Restaurants", slug: "pizza-restaurants" },
        { id: 11011, name: "Sandwich Shops", slug: "sandwich-shops" },
        { id: 11012, name: "Fried Chicken Outlets", slug: "fried-chicken-outlets" },
        { id: 11013, name: "Taco / Mexican Shops", slug: "taco-mexican-shops" },
        { id: 11014, name: "Hot Dog Shops", slug: "hot-dog-shops" },
        { id: 11015, name: "Grab & Go Meals", slug: "grab-go-meals" },
      ] },
      { id: 1103, name: "Cafes & Bakeries", slug: "cafe", detailedCategories: [
        { id: 11016, name: "Coffee Shops", slug: "coffee-shops" },
        { id: 11017, name: "Tea Cafes", slug: "tea-cafes" },
        { id: 11018, name: "Bakeries", slug: "bakeries" },
        { id: 11019, name: "Cake Shops", slug: "cake-shops" },
        { id: 11020, name: "Dessert Parlors", slug: "dessert-parlors" },
        { id: 11021, name: "Ice Cream Shops", slug: "ice-cream-shops" },
        { id: 11022, name: "Juice & Smoothie Bars", slug: "juice-smoothie-bars" },
      ] },
      { id: 1104, name: "Cloud Kitchen / Delivery Only", slug: "cloud-kitchen", detailedCategories: [
        { id: 11023, name: "Home Kitchens", slug: "home-kitchens" },
        { id: 11024, name: "Delivery-only Restaurants", slug: "delivery-only-restaurants" },
        { id: 11025, name: "Tiffin Services", slug: "tiffin-services" },
        { id: 11026, name: "Meal Prep Services", slug: "meal-prep-services" },
        { id: 11027, name: "Healthy / Diet Meal Providers", slug: "healthy-diet-meal-providers" },
        { id: 11028, name: "Keto / Vegan Meal Providers", slug: "keto-vegan-meal-providers" },
      ] },
      { id: 1105, name: "Catering Services", slug: "catering", detailedCategories: [
        { id: 11029, name: "Wedding Catering", slug: "wedding-catering" },
        { id: 11030, name: "Corporate Catering", slug: "corporate-catering" },
        { id: 11031, name: "Party Catering", slug: "party-catering" },
        { id: 11032, name: "Event Catering", slug: "event-catering" },
        { id: 11033, name: "Packed Meal Services", slug: "packed-meal-services" },
        { id: 11034, name: "Live Cooking Stations", slug: "live-cooking-stations" },
      ] },
      { id: 1106, name: "Bars & Beverages", slug: "bars-beverages", detailedCategories: [
        { id: 11035, name: "Bars", slug: "bars" },
        { id: 11036, name: "Pubs", slug: "pubs" },
        { id: 11037, name: "Lounges", slug: "lounges" },
        { id: 11038, name: "Wine Bars", slug: "wine-bars" },
        { id: 11039, name: "Cocktail Bars", slug: "cocktail-bars" },
        { id: 11040, name: "Sports Bars", slug: "sports-bars" },
        { id: 11041, name: "Hookah Lounges", slug: "hookah-lounges" },
      ] },
      { id: 1107, name: "Food Trucks & Pop-ups", slug: "food-trucks-pop-ups", detailedCategories: [
        { id: 11042, name: "Food Trucks", slug: "food-trucks" },
        { id: 11043, name: "Street Food Vendors", slug: "street-food-vendors" },
        { id: 11044, name: "Pop-up Kitchens", slug: "pop-up-kitchens" },
        { id: 11045, name: "Festival Food Stalls", slug: "festival-food-stalls" },
        { id: 11046, name: "Mobile Coffee Trucks", slug: "mobile-coffee-trucks" },
      ] },
      { id: 1108, name: "Grocery & Specialty Food Stores", slug: "grocery-specialty-food-stores", detailedCategories: [
        { id: 11047, name: "Indian Grocery Stores", slug: "indian-grocery-stores" },
        { id: 11048, name: "Asian Markets", slug: "asian-markets" },
        { id: 11049, name: "Organic Food Stores", slug: "organic-food-stores" },
        { id: 11050, name: "Meat Shops", slug: "meat-shops" },
        { id: 11051, name: "Seafood Markets", slug: "seafood-markets" },
        { id: 11052, name: "Bakery Supply Stores", slug: "bakery-supply-stores" },
      ] },
    ],
  },
  {
    id: 3,
    name: "Electronics & Appliances",
    slug: "electronics-appliances",
    subCategories: [
      { id: 301, name: "Mobiles", slug: "mobiles", detailedCategories: [
        { id: 3001, name: "Smartphones", slug: "smartphones" },
      ] },
      { id: 302, name: "Computers", slug: "computers", detailedCategories: [
        { id: 3002, name: "Laptops / Desktops", slug: "laptops-desktops" },
        { id: 3003, name: "Tablets", slug: "tablets" },
      ] },
      { id: 303, name: "Home Appliances", slug: "home-appliances", detailedCategories: [
        { id: 3004, name: "TVs", slug: "tvs" },
        { id: 3005, name: "Refrigerators", slug: "refrigerators" },
        { id: 3006, name: "Washing Machines", slug: "washing-machines" },
        { id: 3007, name: "AC / Coolers", slug: "ac-coolers" },
      ] },
      { id: 304, name: "Accessories", slug: "electronics-accessories", detailedCategories: [
        { id: 3008, name: "Headphones / Smartwatches", slug: "headphones-smartwatches" },
      ] },
    ],
  },
  {
    id: 12,
    name: "Care Services",
    slug: "care-services",
    subCategories: [
      { id: 1201, name: "Child Care / Babysitting", slug: "child-care-babysitting", detailedCategories: [
        { id: 12001, name: "Live-in Nanny", slug: "live-in-nanny" },
        { id: 12002, name: "Part-time Babysitter", slug: "part-time-babysitter" },
      ] },
      { id: 1202, name: "Elder Care", slug: "elder-care", detailedCategories: [
        { id: 12003, name: "Part-time Caregiver", slug: "part-time-caregiver" },
        { id: 12004, name: "Live-in Caregiver", slug: "live-in-caregiver" },
        { id: 12005, name: "Hospice Care", slug: "hospice-care" },
      ] },
      { id: 1203, name: "Home Health Care", slug: "home-health-care", detailedCategories: [
        { id: 12006, name: "Home Health Aide", slug: "home-health-aide" },
      ] },
      { id: 1204, name: "Nursing Services", slug: "nursing-services", detailedCategories: [
        { id: 12007, name: "RN / LPN Care", slug: "rn-lpn-care" },
      ] },
      { id: 1205, name: "Pet Care", slug: "pet-care", detailedCategories: [
        { id: 12008, name: "Pet Sitting / Walking", slug: "pet-sitting-walking" },
      ] },
      { id: 1206, name: "Special Needs Care", slug: "special-needs-care", detailedCategories: [
        { id: 12009, name: "Special Needs Support", slug: "special-needs-support" },
      ] },
    ],
  },
  {
    id: 4,
    name: "Furniture & Home",
    slug: "furniture-home-decor",
    subCategories: [
      { id: 401, name: "Living Room", slug: "living-room", detailedCategories: [
        { id: 4001, name: "Sofa", slug: "sofa" },
        { id: 4002, name: "Chairs", slug: "chairs" },
      ] },
      { id: 402, name: "Bedroom", slug: "bedroom", detailedCategories: [
        { id: 4003, name: "Bed", slug: "bed" },
        { id: 4008, name: "Mattress", slug: "mattress" },
        { id: 4004, name: "Wardrobes", slug: "wardrobes" },
      ] },
      { id: 403, name: "Office", slug: "office-furniture", detailedCategories: [
        { id: 4005, name: "Desk", slug: "desk" },
        { id: 4009, name: "Office Chair", slug: "office-chair" },
      ] },
      { id: 404, name: "Decor", slug: "home-decor", detailedCategories: [
        { id: 4006, name: "Wall Art", slug: "wall-art" },
        { id: 4007, name: "Lighting", slug: "lighting" },
        { id: 4010, name: "Rugs", slug: "rugs" },
        { id: 4011, name: "Curtains", slug: "curtains" },
      ] },
      { id: 405, name: "Dining", slug: "dining", detailedCategories: [
        { id: 4012, name: "Dining Table", slug: "dining-table" },
        { id: 4013, name: "Dining Chairs", slug: "dining-chairs" },
      ] },
      { id: 406, name: "Outdoor", slug: "outdoor", detailedCategories: [
        { id: 4014, name: "Patio Set", slug: "patio-set" },
        { id: 4015, name: "Garden Furniture", slug: "garden-furniture" },
      ] },
      { id: 407, name: "Kitchen", slug: "kitchen", detailedCategories: [
        { id: 4016, name: "Kitchen Island", slug: "kitchen-island" },
        { id: 4017, name: "Kitchen Storage", slug: "kitchen-storage" },
      ] },
    ],
  },
  {
    id: 5,
    name: "Fashion & Lifestyle",
    slug: "fashion-lifestyle",
    subCategories: [
      { id: 501, name: "Men", slug: "men", detailedCategories: [
        { id: 5001, name: "Clothing", slug: "mens-clothing" },
        { id: 5002, name: "Footwear", slug: "mens-footwear" },
      ] },
      { id: 502, name: "Women", slug: "women", detailedCategories: [
        { id: 5003, name: "Clothing", slug: "womens-clothing" },
        { id: 5004, name: "Footwear", slug: "womens-footwear" },
      ] },
      { id: 503, name: "Kids", slug: "kids", detailedCategories: [
        { id: 5005, name: "Clothing", slug: "kids-clothing" },
        { id: 5006, name: "Footwear", slug: "kids-footwear" },
      ] },
      { id: 504, name: "Accessories", slug: "fashion-accessories", detailedCategories: [
        { id: 5007, name: "Watches", slug: "watches" },
        { id: 5008, name: "Jewelry", slug: "jewelry" },
        { id: 5009, name: "Handbags", slug: "handbags" },
        { id: 5010, name: "Sunglasses", slug: "sunglasses" },
      ] },
    ],
  },
  {
    id: 6,
    name: "Pets & Animals",
    slug: "pets-animals",
    subCategories: [
      { id: 601, name: "Dogs", slug: "dogs", detailedCategories: [
        { id: 6001, name: "Puppies for Sale", slug: "puppies-for-sale" },
        { id: 6002, name: "Pet Adoption", slug: "dog-pet-adoption" },
      ] },
      { id: 602, name: "Cats", slug: "cats", detailedCategories: [
        { id: 6003, name: "Pet Adoption", slug: "cat-pet-adoption" },
      ] },
      { id: 603, name: "Birds", slug: "birds", detailedCategories: [
        { id: 6004, name: "Pet Accessories", slug: "bird-pet-accessories" },
      ] },
      { id: 604, name: "Farm Animals", slug: "farm-animals", detailedCategories: [
        { id: 6005, name: "Animal Feed", slug: "animal-feed" },
      ] },
    ],
  },
  {
    id: 7,
    name: "Books, Sports & Hobbies",
    slug: "books-sports-hobbies",
    subCategories: [
      { id: 701, name: "Books", slug: "books", detailedCategories: [
        { id: 7001, name: "Academic Books", slug: "academic-books" },
      ] },
      { id: 702, name: "Sports Equipment", slug: "sports-equipment", detailedCategories: [
        { id: 7002, name: "Gym Equipment", slug: "gym-equipment" },
        { id: 7003, name: "Cricket / Football Gear", slug: "cricket-football-gear" },
      ] },
      { id: 703, name: "Musical Instruments", slug: "musical-instruments", detailedCategories: [
        { id: 7004, name: "Guitars / Keyboards", slug: "guitars-keyboards" },
      ] },
      { id: 704, name: "Hobby Items", slug: "hobby-items", detailedCategories: [
        { id: 7005, name: "Collectibles", slug: "collectibles" },
      ] },
    ],
  },
  {
    id: 8,
    name: "Jobs / Services",
    slug: "jobs-services",
    subCategories: [
      { id: 801, name: "Job Listings", slug: "job-listings", detailedCategories: [
        { id: 8001, name: "IT Jobs", slug: "it-jobs" },
        { id: 8002, name: "Part-time Jobs", slug: "part-time-jobs" },
      ] },
      { id: 802, name: "Freelance Services", slug: "freelance-services", detailedCategories: [
        { id: 8003, name: "Home Services", slug: "home-services" },
        { id: 8004, name: "Tuition / Training", slug: "tuition-training" },
      ] },
    ],
  },
  {
    id: 9,
    name: "Business & Industrial",
    slug: "business-industrial",
    subCategories: [
      { id: 901, name: "Machinery", slug: "machinery", detailedCategories: [
        { id: 9001, name: "Manufacturing Equipment", slug: "manufacturing-equipment" },
      ] },
      { id: 902, name: "Industrial Supplies", slug: "industrial-supplies", detailedCategories: [
        { id: 9002, name: "Construction Tools", slug: "construction-tools" },
      ] },
      { id: 903, name: "Bulk Products", slug: "bulk-products", detailedCategories: [
        { id: 9003, name: "Raw Materials", slug: "raw-materials" },
        { id: 9004, name: "Packaging Materials", slug: "packaging-materials" },
      ] },
    ],
  },
  {
    id: 10,
    name: "Tickets & Events",
    slug: "tickets-events",
    subCategories: [
      { id: 1001, name: "Event Tickets", slug: "event-tickets", detailedCategories: [
        { id: 10001, name: "Movie Tickets", slug: "movie-tickets" },
        { id: 10002, name: "Concerts", slug: "concerts" },
      ] },
      { id: 1002, name: "Travel Tickets", slug: "travel-tickets", detailedCategories: [
        { id: 10003, name: "Flight Tickets", slug: "flight-tickets" },
        { id: 10004, name: "Bus / Train Tickets", slug: "bus-train-tickets" },
      ] },
    ],
  },
];

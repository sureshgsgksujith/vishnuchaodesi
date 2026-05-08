import type { ListingCategoryOption } from "../api/listingCategoriesApi";

export const fallbackListingCategoryTree: ListingCategoryOption[] = [
  {
    id: 1,
    name: "Real Estate",
    slug: "real-estate",
    subCategories: [
      { id: 101, name: "Residential Sale", slug: "residential-sale", detailedCategories: [
        { id: 1001, name: "Apartments / Flats", slug: "apartments-flats" },
        { id: 1002, name: "Villas / Houses", slug: "villas-houses" },
      ] },
      { id: 102, name: "Residential Rent", slug: "residential-rent", detailedCategories: [
        { id: 1003, name: "Apartments / Flats", slug: "rent-apartments-flats" },
        { id: 1004, name: "Villas / Houses", slug: "rent-villas-houses" },
        { id: 1005, name: "Builder Floors", slug: "builder-floors" },
      ] },
      { id: 103, name: "Commercial Sale", slug: "commercial-sale", detailedCategories: [
        { id: 1006, name: "Office Spaces", slug: "sale-office-spaces" },
        { id: 1007, name: "Shops / Showrooms", slug: "sale-shops-showrooms" },
      ] },
      { id: 104, name: "Commercial Rent", slug: "commercial-rent", detailedCategories: [
        { id: 1008, name: "Office Spaces", slug: "rent-office-spaces" },
        { id: 1009, name: "Shops / Showrooms", slug: "rent-shops-showrooms" },
      ] },
      { id: 105, name: "Land / Plots", slug: "land-plots", detailedCategories: [
        { id: 1010, name: "Agricultural Land", slug: "agricultural-land" },
        { id: 1011, name: "Farmhouses", slug: "farmhouses" },
      ] },
      { id: 106, name: "PG / Co-living", slug: "pg-co-living", detailedCategories: [
        { id: 1012, name: "Single Room", slug: "single-room" },
        { id: 1013, name: "Shared Room", slug: "shared-room" },
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
      { id: 1101, name: "Restaurant", slug: "restaurant", detailedCategories: [
        { id: 11001, name: "Dine-in Restaurant", slug: "dine-in-restaurant" },
      ] },
      { id: 1102, name: "Cafe", slug: "cafe", detailedCategories: [
        { id: 11002, name: "Coffee Shop", slug: "coffee-shop" },
      ] },
      { id: 1103, name: "Bakery", slug: "bakery", detailedCategories: [
        { id: 11003, name: "Bakery Shop", slug: "bakery-shop" },
      ] },
      { id: 1104, name: "Cloud Kitchen", slug: "cloud-kitchen", detailedCategories: [
        { id: 11004, name: "Delivery Kitchen", slug: "delivery-kitchen" },
      ] },
      { id: 1105, name: "Catering", slug: "catering", detailedCategories: [
        { id: 11005, name: "Event Catering", slug: "event-catering" },
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
    id: 4,
    name: "Furniture & Home Decor",
    slug: "furniture-home-decor",
    subCategories: [
      { id: 401, name: "Living Room", slug: "living-room", detailedCategories: [
        { id: 4001, name: "Sofas", slug: "sofas" },
        { id: 4002, name: "Dining Tables", slug: "dining-tables" },
      ] },
      { id: 402, name: "Bedroom", slug: "bedroom", detailedCategories: [
        { id: 4003, name: "Beds / Mattresses", slug: "beds-mattresses" },
        { id: 4004, name: "Wardrobes", slug: "wardrobes" },
      ] },
      { id: 403, name: "Office Furniture", slug: "office-furniture", detailedCategories: [
        { id: 4005, name: "Chairs / Tables", slug: "chairs-tables" },
      ] },
      { id: 404, name: "Home Decor", slug: "home-decor", detailedCategories: [
        { id: 4006, name: "Curtains / Carpets", slug: "curtains-carpets" },
        { id: 4007, name: "Wall Decor", slug: "wall-decor" },
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

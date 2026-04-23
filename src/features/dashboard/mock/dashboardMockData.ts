export type PointHistoryItem = {
  id: number;
  purchaseDate: string;
  points: number;
  totalCost: string;
};

export type DashboardNotification = {
  id: number;
  message: string;
  time?: string;
  profileHref?: string;
};

export type FollowingUser = {
  id: number;
  name: string;
  country: string;
  image: string;
  listings: number;
  events: number;
  blogs: number;
  isFollowing: boolean;
};

export type ReviewItem = {
  id: number;
  listingName: string;
  user: string;
  email: string;
  phone: string;
  city: string;
  rating: number;
  message: string;
};

export type DashboardProductItem = {
  id: number;
  image: string;
  name: string;
  createdAt: string;
  views: number;
  status: string;
  editPath: string;
  previewPath: string;
};

export type ServiceBookingItem = {
  id: number;
  expertSlug: string;
  image: string;
  createdAt: string;
  enquirerName: string;
  phone: string;
  email: string;
  location: string;
  serviceDate: string;
  serviceTime: string;
  message: string;
  status: string;
};

export type AppliedJobItem = {
  id: number;
  title: string;
  appliedAt: string;
  previewPath: string;
};

export type DashboardEventItem = {
  id: number;
  name: string;
  createdAt: string;
  eventDate: string;
  views: number;
  editPath: string;
  deletePath: string;
  previewPath: string;
};

export type DashboardJobItem = {
  id: number;
  name: string;
  createdAt: string;
  applicants: string;
  applicantProfilesPath: string;
  views: number;
  editPath: string;
  previewHref: string;
};

export type DashboardBlogPostItem = {
  id: number;
  name: string;
  createdAt: string;
  views: number;
  editPath: string;
  previewPath: string;
};

export type DashboardCouponItem = {
  id: number;
  image: string;
  title: string;
  expiresAt: string;
  accessCount: string;
  startDate: string;
  expiryDate: string;
  couponCode: string;
  editPath: string;
};

export type CouponAccessItem = {
  id: number;
  dateLabel: string;
  email: string;
  phone: string;
  couponName: string;
  profilePath: string;
};

export const pointHistoryItems: PointHistoryItem[] = [
  { id: 1, purchaseDate: "05, Jun 2025", points: 40, totalCost: "$" },
  { id: 2, purchaseDate: "01, Jun 2025", points: 5, totalCost: "$" },
  { id: 3, purchaseDate: "08, May 2025", points: 12, totalCost: "$" },
  { id: 4, purchaseDate: "18, Sep 2024", points: 9505, totalCost: "$" },
  { id: 5, purchaseDate: "18, Sep 2024", points: 80000000, totalCost: "$" },
  { id: 6, purchaseDate: "17, Sep 2024", points: 10, totalCost: "$" },
  { id: 7, purchaseDate: "12, Sep 2024", points: 100, totalCost: "$" },
];

export const dashboardNotifications: DashboardNotification[] = [
  {
    id: 1,
    message: "start following you",
    profileHref: "/profile",
  },
  {
    id: 2,
    message:
      'Thank you for creating for an account in "Bizbook Directory Template" portal.',
    time: "10:54 PMon 17, Aug 2022",
  },
  {
    id: 3,
    message:
      'We heartily welcome to our global business "Bizbook Directory Template" portal.',
    time: "10:54 PMon 17, Aug 2022",
  },
];

export const followingUsers: FollowingUser[] = [
  {
    id: 1,
    name: "Richflayer",
    country: "India",
    image: "/template-17/images/user/1.jpg",
    listings: 0,
    events: 9,
    blogs: 8,
    isFollowing: true,
  },
  {
    id: 2,
    name: "Richflayer",
    country: "India",
    image: "/template-17/images/user/10.png",
    listings: 0,
    events: 9,
    blogs: 8,
    isFollowing: true,
  },
  {
    id: 3,
    name: "Richflayer",
    country: "India",
    image: "/template-17/images/user/12.jpeg",
    listings: 0,
    events: 9,
    blogs: 8,
    isFollowing: true,
  },
  {
    id: 4,
    name: "Richflayer",
    country: "India",
    image: "/template-17/images/user/2.jpg",
    listings: 0,
    events: 9,
    blogs: 8,
    isFollowing: true,
  },
  {
    id: 5,
    name: "Richflayer",
    country: "India",
    image: "/template-17/images/user/21.jpeg",
    listings: 0,
    events: 9,
    blogs: 8,
    isFollowing: true,
  },
  {
    id: 6,
    name: "Richflayer",
    country: "India",
    image: "/template-17/images/user/25.jpeg",
    listings: 0,
    events: 9,
    blogs: 8,
    isFollowing: true,
  },
  {
    id: 7,
    name: "Richflayer",
    country: "India",
    image: "/template-17/images/user/15.jpg",
    listings: 0,
    events: 9,
    blogs: 8,
    isFollowing: true,
  },
  {
    id: 8,
    name: "Richflayer",
    country: "India",
    image: "/template-17/images/user/7.jpg",
    listings: 0,
    events: 9,
    blogs: 8,
    isFollowing: true,
  },
];

export const sentReviews: ReviewItem[] = [
  {
    id: 1,
    listingName: "Greys Sloan Memorial Hospital",
    user: "Rn53",
    email: "info@chaodesi.com",
    phone: "08027337500",
    city: "",
    rating: 5,
    message: "ghghhg",
  },
];

export const dashboardProducts: DashboardProductItem[] = [
  {
    id: 1,
    image: "/template-17/images/products/1.jpg",
    name: "Cotton and Accessories",
    createdAt: "03, Aug 2022",
    views: 18,
    status: "Active",
    editPath: "/edit-product",
    previewPath: "/product-details",
  },
  {
    id: 2,
    image: "/template-17/images/products/10.jpg",
    name: "dfgh",
    createdAt: "01, Aug 2022",
    views: 12,
    status: "Active",
    editPath: "/edit-product",
    previewPath: "/product-details",
  },
  {
    id: 3,
    image: "/template-17/images/products/2.jpeg",
    name: "sdcs",
    createdAt: "23, Nov 2021",
    views: 352,
    status: "Active",
    editPath: "/edit-product",
    previewPath: "/product-details",
  },
  {
    id: 4,
    image: "/template-17/images/products/5.jpeg",
    name: "SAMSUNG 6 kg 5 Star Inverter with Hygiene Steam",
    createdAt: "15, Nov 2021",
    views: 311,
    status: "Active",
    editPath: "/edit-product",
    previewPath: "/product-details",
  },
];

export const serviceBookings: ServiceBookingItem[] = [
  {
    id: 1,
    expertSlug: "michael-roy",
    image: "/template-17/images/user/970813.jpg",
    createdAt: "20, Aug 2022",
    enquirerName: "Rn53",
    phone: "78451276",
    email: "info@chaodesi.com",
    location: "LB NAGAR",
    serviceDate: "20, Aug 2022",
    serviceTime: "9:00 AM",
    message: "HI THIS TEST BOOKING",
    status: "New",
  },
  {
    id: 2,
    expertSlug: "tyler-joseph",
    image: "/template-17/images/user/970813.jpg",
    createdAt: "10, Aug 2022",
    enquirerName: "Rn53",
    phone: "78451276",
    email: "info@chaodesi.com",
    location: "Us",
    serviceDate: "11, Aug 2022",
    serviceTime: "7:00 AM",
    message: "",
    status: "New",
  },
  {
    id: 3,
    expertSlug: "robert-anthony",
    image: "/template-17/images/user/970813.jpg",
    createdAt: "20, Mar 2022",
    enquirerName: "Rn53",
    phone: "876587658765",
    email: "info@chaodesi.com",
    location: "gh",
    serviceDate: "23, Mar 2022",
    serviceTime: "7:00 AM",
    message: "hgh",
    status: "Cancel",
  },
  {
    id: 4,
    expertSlug: "brian-jose",
    image: "/template-17/images/user/970813.jpg",
    createdAt: "04, Mar 2022",
    enquirerName: "Rn53",
    phone: "876587658765",
    email: "info@chaodesi.com",
    location: "ru",
    serviceDate: "11, Mar 2022",
    serviceTime: "9:00 AM",
    message: "",
    status: "New",
  },
  {
    id: 5,
    expertSlug: "samuel-dylan",
    image: "/template-17/images/user/970813.jpg",
    createdAt: "21, Jan 2022",
    enquirerName: "Rn53",
    phone: "876587658765",
    email: "info@chaodesi.com",
    location: "11",
    serviceDate: "22, Jan 2022",
    serviceTime: "10:00 AM",
    message: "11",
    status: "Cancel",
  },
];

export const appliedJobs: AppliedJobItem[] = [
  {
    id: 1,
    title: "Senior Software Engineer II Front End - Illunois",
    appliedAt: "22, May 2022, 8:58 AM",
    previewPath: "/template-17/jobs/job-details.html",
  },
  {
    id: 2,
    title: "Junior Doctor Job in Los Angels",
    appliedAt: "21, May 2022, 9:46 PM",
    previewPath: "/template-17/jobs/job-details.html",
  },
  {
    id: 3,
    title: "Senior SEO Analysis",
    appliedAt: "01, Mar 2022, 5:38 PM",
    previewPath: "/template-17/jobs/job-details.html",
  },
  {
    id: 4,
    title: "Junior Graphics Designer",
    appliedAt: "22, Feb 2022, 5:07 PM",
    previewPath: "/template-17/jobs/job-details.html",
  },
  {
    id: 5,
    title: "Digital marketer",
    appliedAt: "13, Feb 2022, 9:53 PM",
    previewPath: "/template-17/jobs/job-details.html",
  },
];

export const dashboardEvents: DashboardEventItem[] = [
  {
    id: 1,
    name: "test-event",
    createdAt: "06, Aug 2022",
    eventDate: "27, Aug 2022",
    views: 10,
    editPath: "/edit-event",
    deletePath: "/template-17/delete-event.html?code=55",
    previewPath: "/event-details",
  },
  {
    id: 2,
    name: "indian even",
    createdAt: "03, Aug 2022",
    eventDate: "11, Aug 2022",
    views: 11,
    editPath: "/edit-event",
    deletePath: "/template-17/delete-event.html?code=54",
    previewPath: "/event-details",
  },
  {
    id: 3,
    name: "sports event",
    createdAt: "03, Aug 2022",
    eventDate: "04, Aug 2022",
    views: 13,
    editPath: "/edit-event",
    deletePath: "/template-17/delete-event.html?code=53",
    previewPath: "/event-details",
  },
  {
    id: 4,
    name: "sdsd",
    createdAt: "21, Jul 2022",
    eventDate: "29, Jul 2022",
    views: 27,
    editPath: "/edit-event",
    deletePath: "/template-17/delete-event.html?code=52",
    previewPath: "/event-details",
  },
  {
    id: 5,
    name: "reeherh",
    createdAt: "20, May 2022",
    eventDate: "20, May 2022",
    views: 61,
    editPath: "/edit-event",
    deletePath: "/template-17/delete-event.html?code=50",
    previewPath: "/event-details",
  },
  {
    id: 6,
    name: "sad",
    createdAt: "19, Dec 2021",
    eventDate: "20, Dec 2021",
    views: 164,
    editPath: "/edit-event",
    deletePath: "/template-17/delete-event.html?code=49",
    previewPath: "/event-details",
  },
];

export const dashboardJobs: DashboardJobItem[] = [
  {
    id: 1,
    name: "Java Mobile App Developer",
    createdAt: "02, Aug 2022",
    applicants: "00",
    applicantProfilesPath: "/dashboard/jobs-applicant-profile",
    views: 30,
    editPath: "/edit-job",
    previewHref: "/template-17/jobs/job-details.html",
  },
];

export const dashboardBlogPosts: DashboardBlogPostItem[] = [
  {
    id: 1,
    name: "Test 53",
    createdAt: "13, Aug 2022",
    views: 7,
    editPath: "/edit-blog-post",
    previewPath: "/blog-details",
  },
  {
    id: 2,
    name: "test blog",
    createdAt: "06, Aug 2022",
    views: 11,
    editPath: "/edit-blog-post",
    previewPath: "/blog-details",
  },
  {
    id: 3,
    name: "news and magazine",
    createdAt: "03, Aug 2022",
    views: 12,
    editPath: "/edit-blog-post",
    previewPath: "/blog-details",
  },
  {
    id: 4,
    name: "news and magazine",
    createdAt: "03, Aug 2022",
    views: 12,
    editPath: "/edit-blog-post",
    previewPath: "/blog-details",
  },
  {
    id: 5,
    name: "hi post ë and ç2022",
    createdAt: "04, Feb 2022",
    views: 132,
    editPath: "/edit-blog-post",
    previewPath: "/blog-details",
  },
];

export const dashboardCoupons: DashboardCouponItem[] = [
  {
    id: 1,
    image: "/template-17/images/user/1.jpg",
    title: "holiday",
    expiresAt: "05, Aug 2022",
    accessCount: "02",
    startDate: "10, Aug 2022",
    expiryDate: "05, Aug 2022",
    couponCode: "339999",
    editPath: "/edit-coupon",
  },
  {
    id: 2,
    image: "/template-17/images/user/12.jpeg",
    title: "Bring your kids along for FREE - midweek evenings only",
    expiresAt: "06, Jul 2022",
    accessCount: "30",
    startDate: "05, Jul 2022",
    expiryDate: "06, Jul 2022",
    couponCode: "KIDSFREE",
    editPath: "/edit-coupon",
  },
];

export const couponAccessMembers: CouponAccessItem[] = [
  {
    id: 1,
    dateLabel: "01, Jan 1970",
    email: "",
    phone: "",
    couponName: "holiday",
    profilePath: "/profile",
  },
  {
    id: 2,
    dateLabel: "01, Jan 1970",
    email: "",
    phone: "",
    couponName: "Bring your kids along for FREE - midweek evenings only",
    profilePath: "/profile",
  },
];

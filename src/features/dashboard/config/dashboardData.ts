export type DashboardNavItem = {
  label: string;
  href?: string;
  icon: string;
  isLogout?: boolean;
  target?: "_blank" | "_self";
};

export type DashboardNavSection = {
  title?: string;
  items: DashboardNavItem[];
};

export type FooterLinkItem = {
  label: string;
  href: string;
};

export type NotificationItem = {
  title: string;
  description: string;
  href: string;
};

export const dashboardPrimaryNavItem: DashboardNavItem = {
  label: "My Dashboard",
  href: "/dashboard",
  icon: "/template-17/images/icon/dbl1.png",
};

export const dashboardNavSections: DashboardNavSection[] = [
  {
    items: [dashboardPrimaryNavItem],
  },
  {
    title: "All Modules",
    items: [
      {
        label: "All Listings",
        href: "/dashboard/all-listing",
        icon: "/template-17/images/icon/shop.png",
      },
      {
        label: "Ads Posts",
        href: "/dashboard/ad-posts",
        icon: "/template-17/images/icon/ads.png",
      },
      {
        label: "Jobs",
        href: "/dashboard/jobs",
        icon: "/template-17/images/icon/employee.png",
      },
      {
        label: "All Products",
        href: "/dashboard/products",
        icon: "/template-17/images/icon/cart.png",
      },
      {
        label: "Events",
        href: "/dashboard/events",
        icon: "/template-17/images/icon/calendar.png",
      },
      {
        label: "Blog posts",
        href: "/dashboard/blog-posts",
        icon: "/template-17/images/icon/blog1.png",
      },
      {
        label: "Coupons",
        href: "/dashboard/coupons",
        icon: "/template-17/images/icon/coupons.png",
      },
    ],
  },
  {
    title: "LEADS & ENQUIRY",
    items: [
      {
        label: "Lead enquiry",
        href: "/dashboard/enquiry",
        icon: "/template-17/images/icon/tick.png",
      },
      {
        label: "Service Expert Leads",
        href: "/dashboard/service-expert",
        icon: "/template-17/images/icon/expert.png",
      },
    ],
  },
  {
    title: "Payment & Promotions",
    items: [
      {
        label: "Payment & plan",
        href: "/dashboard/payment",
        icon: "/template-17/images/icon/dbl9.png",
      },
      {
        label: "Promotions",
        href: "/dashboard/promote",
        icon: "/template-17/images/icon/promotion.png",
      },
      {
        label: "SEO",
        href: "/dashboard/seo",
        icon: "/template-17/images/icon/seo.png",
      },
      {
        label: "Points History",
        href: "/dashboard/point-history",
        icon: "/template-17/images/icon/point.png",
      },
      {
        label: "Ad Summary",
        href: "/dashboard/post-ads",
        icon: "/template-17/images/icon/dbl11.png",
      },
      {
        label: "Payment invoice",
        href: "/dashboard/invoice",
        icon: "/template-17/images/icon/dbl16.png",
      },
    ],
  },
  {
    title: "Profile pages",
    items: [
      {
        label: "My Profile",
        href: "/dashboard/my-profile",
        icon: "/template-17/images/icon/profile.png",
      },
      {
        label: "Service Expert Profile",
        href: "/create-service-expert-profile",
        icon: "/template-17/images/icon/profile.png",
      },
      {
        label: "Job Profile",
        href: "/create-job-seeker-profile",
        icon: "/template-17/images/icon/profile.png",
      },
    ],
  },
  {
    title: "My activities",
    items: [
      {
        label: "All Applied Jobs",
        href: "/dashboard/user-applied-jobs",
        icon: "/template-17/images/icon/job-apply.png",
      },
      {
        label: "My Service Bookings",
        href: "/dashboard/my-service-bookings",
        icon: "/template-17/images/icon/expert-book.png",
      },
      {
        label: "Reviews",
        href: "/dashboard/review",
        icon: "/template-17/images/icon/dbl13.png",
      },
      {
        label: "Liked Listings",
        href: "/dashboard/like-listings",
        icon: "/template-17/images/icon/dbl15.png",
      },
      {
        label: "Followings",
        href: "/dashboard/followings",
        icon: "/template-17/images/icon/dbl18.png",
      },
      {
        label: "Notifications",
        href: "/dashboard/notifications",
        icon: "/template-17/images/icon/dbl19.png",
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        label: "Setting",
        href: "/dashboard/setting",
        icon: "/template-17/images/icon/dbl210.png",
      },
      {
        label: "How tos",
        href: "/how-to",
        icon: "/template-17/images/icon/dbl17.png",
        target: "_blank",
      },
      {
        label: "Log Out",
        icon: "/template-17/images/icon/dbl12.png",
        isLogout: true,
      },
    ],
  },
];

export const dashboardAdminNotifications: NotificationItem[] = [
  { title: "test", description: "test", href: "#" },
  { title: "demo2", description: "demo2222", href: "#" },
  { title: "demo", description: "demo notification", href: "#" },
  {
    title: "Homey massage offer 50%",
    description: "Special offer for this month only",
    href: "#",
  },
  {
    title: "How lead tracking works?",
    description: "Lead and url tracking work process",
    href: "#",
  },
  {
    title: "How to add new listing?",
    description: "Just few clicks to add your new listing",
    href: "#",
  },
];

export const dashboardFollowerImages = [
  "/template-17/images/user/970813.jpg",
  "/template-17/images/user/1.jpg",
  "/template-17/images/user/10.png",
];

export const dashboardTopCategories: FooterLinkItem[] = [
  { label: "Technology", href: "/all-listing" },
  { label: "Spa and Facial", href: "/all-listing" },
  { label: "Real Estate", href: "/all-listing" },
  { label: "Sports", href: "/all-listing" },
  { label: "Education", href: "/all-listing" },
  { label: "Electricals", href: "/all-listing" },
  { label: "Automobiles", href: "/all-listing" },
  { label: "Transportation", href: "/all-listing" },
];

export const dashboardTrendingCategories: FooterLinkItem[] = [
  { label: "Hospitals", href: "/all-listing" },
  { label: "Automobiles", href: "/all-listing" },
  { label: "Real Estate", href: "/all-listing" },
  { label: "Sports", href: "/all-listing" },
  { label: "Education", href: "/all-listing" },
  { label: "Electricals", href: "/all-listing" },
];

export const dashboardHelpLinks: FooterLinkItem[] = [
  { label: "About us", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Feedback", href: "/feedback" },
  { label: "Contact us", href: "/contact-us" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Use", href: "/terms-of-use" },
];

export const dashboardPopularTags: FooterLinkItem[] = [
  { label: "Schools in NewYork", href: "/dashboard" },
  { label: "Real estate in Illunois", href: "/dashboard" },
  { label: "Real estate in Chennai1", href: "/dashboard" },
  { label: "Enents in Tailand", href: "/dashboard" },
  { label: "Flat for rent in Melborn", href: "/dashboard" },
  { label: "Schools in NewYork", href: "/dashboard" },
];

export const dashboardFooterCountries = [
  { label: "Australia", href: "http://www.chaodesi.au" },
  { label: "UK", href: "http://www.chaodesi.uk" },
  { label: "USA", href: "http://www.chaodesi.usa" },
  { label: "India", href: "http://www.chaodesi.in" },
  { label: "Germany", href: "http://www.chaodesi.ge" },
  { label: "China", href: "http://www.chaodesi.ch" },
  { label: "france", href: "http://www.chaodesi.fr" },
];

export const dashboardSupportCategories = [
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

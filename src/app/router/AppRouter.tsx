import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { customerTemplateRoutes } from "./customerTemplateRoutes";
import { clearCustomerSession, isCustomerAuthenticated } from "../../features/auth/utils/customerSession";

const HomePage = lazy(() => import("../../features/home/ui/HomePage"));
const LoginPage = lazy(() => import("../../features/auth/ui/LoginPage"));
const UserInfoPage = lazy(() => import("../../features/auth/ui/UserInfoPage"));
const StaticTemplatePage = lazy(() => import("../../features/template/ui/StaticTemplatePage"));
const DashboardPage = lazy(() => import("../../features/dashboard/ui/DashboardPage"));
const PaymentPage = lazy(() => import("../../features/dashboard/ui/PaymentPage"));
const PlanChangePage = lazy(() => import("../../features/dashboard/ui/PlanChangePage"));
const PointHistoryPage = lazy(() => import("../../features/dashboard/ui/PointHistoryPage"));
const NotificationsPage = lazy(() => import("../../features/dashboard/ui/NotificationsPage"));
const FollowingsPage = lazy(() => import("../../features/dashboard/ui/FollowingsPage"));
const ReviewPage = lazy(() => import("../../features/dashboard/ui/ReviewPage"));
const EnquiryPage = lazy(() => import("../../features/dashboard/ui/EnquiryPage"));
const MyServiceBookingsPage = lazy(() => import("../../features/dashboard/ui/MyServiceBookingsPage"));
const SettingsPage = lazy(() => import("../../features/dashboard/ui/SettingsPage"));
const InvoicePage = lazy(() => import("../../features/dashboard/ui/InvoicePage"));
const UserAppliedJobsPage = lazy(() => import("../../features/dashboard/ui/UserAppliedJobsPage"));
const EventsPage = lazy(() => import("../../features/dashboard/ui/EventsPage"));
const BlogPostsPage = lazy(() => import("../../features/dashboard/ui/BlogPostsPage"));
const CouponsPage = lazy(() => import("../../features/dashboard/ui/CouponsPage"));
const MyProfileEditPage = lazy(() => import("../../features/dashboard/ui/MyProfileEditPage"));
const AllListingsPage = lazy(() => import("../../features/dashboard/ui/AllListingsPage"));
const ListingFormPage = lazy(() => import("../../features/dashboard/ui/ListingFormPage"));
const ListingPreviewPage = lazy(() => import("../../features/dashboard/ui/ListingPreviewPage"));
const ListingStartPage = lazy(() => import("../../features/dashboard/ui/ListingStartPage"));
const PricingDetailsPage = lazy(() => import("../../features/pricing/ui/PricingDetailsPage"));
const AllListingPage = lazy(() => import("../../features/listing/ui/AllListingPage"));
const ListingDetailPage = lazy(() => import("../../features/listing/ui/ListingDetailPage"));
const EventDetailPage = lazy(() => import("../../features/listing/ui/EventDetailPage"));
const LocalServicesPage = lazy(() => import("../../features/localServices/ui/LocalServicesPage"));
const AllServicesPage = lazy(() => import("../../features/allServices/ui/AllServicesPage"));
const AllServicesDetailedPage = lazy(() => import("../../features/allServices/ui/AllServicesDetailedPage"));
const ChaoTvPage = lazy(() => import("../../features/chaoTv/ChaoTvPage"));
const ClassifiedsHomePage = lazy(() =>
  import("../../features/classifieds/ui/ClassifiedPages").then((module) => ({ default: module.ClassifiedsHomePage }))
);
const ClassifiedAdsAllPage = lazy(() =>
  import("../../features/classifieds/ui/ClassifiedPages").then((module) => ({ default: module.ClassifiedAdsAllPage }))
);
const ClassifiedAdDetailsPage = lazy(() =>
  import("../../features/classifieds/ui/ClassifiedPages").then((module) => ({ default: module.ClassifiedAdDetailsPage }))
);

function RouteSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh" }} />}>
      {children}
    </Suspense>
  );
}

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);

  return null;
}

function ProtectedCustomerRoute({ children }: { children: ReactNode }) {
  const location = useLocation();

  if (isCustomerAuthenticated()) {
    return <RouteSuspense>{children}</RouteSuspense>;
  }

  clearCustomerSession();
  const returnUrl = `${location.pathname}${location.search}${location.hash}`;
  const searchParams = new URLSearchParams({ returnUrl });

  return <Navigate to={`/login?${searchParams.toString()}`} replace />;
}

function RegisterRedirect() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  searchParams.set("login", "register");

  return <Navigate to={`/login?${searchParams.toString()}`} replace />;
}

function PostYourAdsRoute() {
  return isCustomerAuthenticated()
    ? <Navigate to="/dashboard/listings/start" replace />
    : <Navigate to="/login?returnUrl=/dashboard/listings/start" replace />;
}

export function AppRouter() {
  const excludedStaticRoutes = [
    "/",
    "/home",
    "/login",
    "/register",
    "/forgot-password",
    "/user-info",
    "/dashboard",
    "/dashboard/payment",
    "/dashboard/plan-change",
    "/dashboard/point-history",
    "/dashboard/notifications",
    "/dashboard/followings",
    "/dashboard/review",
    "/dashboard/enquiry",
    "/dashboard/ad-posts",
    "/dashboard/products",
    "/dashboard/my-service-bookings",
    "/dashboard/setting",
    "/dashboard/user-applied-jobs",
    "/dashboard/events",
    "/dashboard/invoice",
    "/dashboard/jobs",
    "/dashboard/blog-posts",
    "/dashboard/coupons",
    "/dashboard/my-profile",
    "/dashboard/my-profile-edit",
    "/dashboard/all-listing",
    "/dashboard/listings/new",
    "/dashboard/listings/start",
    "/dashboard/listings/:listingId/edit",
    "/dashboard/listings/:listingId/preview",
    "/dashboard/classifieds/step-1",
    "/dashboard/classifieds/step-2",
    "/dashboard/classifieds/step-3",
    "/dashboard/classifieds/step-4",
    "/dashboard/classifieds/step-5",
    "/dashboard/classifieds/:listingId/edit",
    "/dashboard/classifieds/:listingId/edit/step-1",
    "/dashboard/classifieds/:listingId/edit/step-2",
    "/dashboard/classifieds/:listingId/edit/step-3",
    "/dashboard/classifieds/:listingId/edit/step-4",
    "/dashboard/classifieds/:listingId/edit/step-5",
    "/add-classified-start",
    "/add-classified-step-1",
    "/add-classified-step-2",
    "/add-classified-step-3",
    "/classifieds/index",
    "/classifieds/ads-all",
    "/classifieds/ads-details",
    "/all-category",
    "/all-services",
    "/all-services.html",
    "/all-services-detailed",
    "/all-services-detailed.html",
    "/local-services",
    "/local-services.html",
    "/all-listing",
    "/real-estate-listings",
    "/chao-tv",
    "/listing-details",
    "/listing/:listingId",
    "/event-details",
    "/event-checkout",
    "/pricing-details",
    "/post-your-ads",
  ];

  return (
    <RouteSuspense>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/home" element={<HomePage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterRedirect />} />
      <Route path="/forgot-password" element={<Navigate to="/login?login=forgot" replace />} />

      <Route path="/user-info" element={<ProtectedCustomerRoute><UserInfoPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard" element={<ProtectedCustomerRoute><DashboardPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/payment" element={<ProtectedCustomerRoute><PaymentPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/plan-change" element={<ProtectedCustomerRoute><PlanChangePage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/point-history" element={<ProtectedCustomerRoute><PointHistoryPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/notifications" element={<ProtectedCustomerRoute><NotificationsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/followings" element={<ProtectedCustomerRoute><FollowingsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/review" element={<ProtectedCustomerRoute><ReviewPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/enquiry" element={<ProtectedCustomerRoute><EnquiryPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/ad-posts" element={<ProtectedCustomerRoute><AllListingsPage defaultModule="classified" lockedModule title="Ads Posts" /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/products" element={<ProtectedCustomerRoute><AllListingsPage defaultModule="products" lockedModule title="Product Details" /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/my-service-bookings" element={<ProtectedCustomerRoute><MyServiceBookingsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/setting" element={<ProtectedCustomerRoute><SettingsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/user-applied-jobs" element={<ProtectedCustomerRoute><UserAppliedJobsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/events" element={<ProtectedCustomerRoute><EventsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/invoice" element={<ProtectedCustomerRoute><InvoicePage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/jobs" element={<ProtectedCustomerRoute><AllListingsPage defaultModule="jobs" lockedModule title="Jobs" /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/blog-posts" element={<ProtectedCustomerRoute><BlogPostsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/coupons" element={<ProtectedCustomerRoute><CouponsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/my-profile" element={<ProtectedCustomerRoute><MyProfileEditPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/my-profile-edit" element={<ProtectedCustomerRoute><MyProfileEditPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/all-listing" element={<ProtectedCustomerRoute><AllListingsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/listings/start" element={<ProtectedCustomerRoute><ListingStartPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/listings/new" element={<ProtectedCustomerRoute><ListingFormPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/listings/:listingId/edit" element={<ProtectedCustomerRoute><ListingFormPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/listings/:listingId/preview" element={<ProtectedCustomerRoute><ListingPreviewPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/step-1" element={<ProtectedCustomerRoute><ListingFormPage mode="classified" /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/step-2" element={<ProtectedCustomerRoute><ListingFormPage mode="classified" /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/step-3" element={<ProtectedCustomerRoute><ListingFormPage mode="classified" /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/step-4" element={<ProtectedCustomerRoute><ListingFormPage mode="classified" /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/step-5" element={<ProtectedCustomerRoute><ListingFormPage mode="classified" /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/:listingId/edit" element={<ProtectedCustomerRoute><ListingFormPage mode="classified" /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/:listingId/edit/step-1" element={<ProtectedCustomerRoute><ListingFormPage mode="classified" /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/:listingId/edit/step-2" element={<ProtectedCustomerRoute><ListingFormPage mode="classified" /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/:listingId/edit/step-3" element={<ProtectedCustomerRoute><ListingFormPage mode="classified" /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/:listingId/edit/step-4" element={<ProtectedCustomerRoute><ListingFormPage mode="classified" /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/:listingId/edit/step-5" element={<ProtectedCustomerRoute><ListingFormPage mode="classified" /></ProtectedCustomerRoute>} />
      <Route path="/add-classified-start" element={<ProtectedCustomerRoute><ListingStartPage /></ProtectedCustomerRoute>} />
      <Route path="/add-classified-step-1" element={<ProtectedCustomerRoute><ListingFormPage mode="classified" /></ProtectedCustomerRoute>} />
      <Route path="/add-classified-step-2" element={<ProtectedCustomerRoute><ListingFormPage mode="classified" /></ProtectedCustomerRoute>} />
      <Route path="/add-classified-step-3" element={<ProtectedCustomerRoute><ListingFormPage mode="classified" /></ProtectedCustomerRoute>} />
      <Route path="/classifieds/index" element={<ClassifiedsHomePage />} />
      <Route path="/classifieds/ads-all" element={<ClassifiedAdsAllPage />} />
      <Route path="/classifieds/ads-details" element={<ClassifiedAdDetailsPage />} />
      <Route path="/all-category" element={<Navigate to="/local-services" replace />} />
      <Route path="/local-services" element={<LocalServicesPage />} />
      <Route path="/local-services.html" element={<Navigate to="/local-services" replace />} />
      <Route path="/all-services" element={<AllServicesPage />} />
      <Route path="/all-services.html" element={<Navigate to="/all-services" replace />} />
      <Route path="/all-services-detailed" element={<AllServicesDetailedPage />} />
      <Route path="/all-services-detailed.html" element={<AllServicesDetailedPage />} />
      <Route path="/all-listing" element={<AllListingPage />} />
      <Route path="/real-estate-listings" element={<AllListingPage lockedCategory="real-estate" includeAllCountries pageTitle="Real Estate" />} />
      <Route path="/chao-tv" element={<ChaoTvPage />} />
      <Route path="/listing-details" element={<ListingDetailPage />} />
      <Route path="/listing/:listingId" element={<ListingDetailPage />} />
      <Route path="/event-details" element={<EventDetailPage />} />
      <Route
        path="/event-checkout"
        element={
          <ProtectedCustomerRoute>
            <StaticTemplatePage src="/template-17/event-checkout.html" title="Event Checkout" />
          </ProtectedCustomerRoute>
        }
      />
      <Route path="/pricing-details" element={<PricingDetailsPage />} />
      <Route path="/post-your-ads" element={<PostYourAdsRoute />} />

      {customerTemplateRoutes
        .filter((route) => !excludedStaticRoutes.includes(route.path))
        .map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<StaticTemplatePage src={route.src} title={route.title} />}
          />
        ))}

      <Route path="*" element={<StaticTemplatePage src="/template-17/404.html" title="404" />} />
    </Routes>
    </RouteSuspense>
  );
}

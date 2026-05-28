import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { type ReactNode } from "react";
import HomePage from "../../features/home/ui/HomePage";
import LoginPage from "../../features/auth/ui/LoginPage";
import UserInfoPage from "../../features/auth/ui/UserInfoPage";
import StaticTemplatePage from "../../features/template/ui/StaticTemplatePage";
import { customerTemplateRoutes } from "./customerTemplateRoutes";
import DashboardPage from "../../features/dashboard/ui/DashboardPage";
import PaymentPage from "../../features/dashboard/ui/PaymentPage";
import PlanChangePage from "../../features/dashboard/ui/PlanChangePage";
import PointHistoryPage from "../../features/dashboard/ui/PointHistoryPage";
import NotificationsPage from "../../features/dashboard/ui/NotificationsPage";
import FollowingsPage from "../../features/dashboard/ui/FollowingsPage";
import ReviewPage from "../../features/dashboard/ui/ReviewPage";
import ProductsPage from "../../features/dashboard/ui/ProductsPage";
import MyServiceBookingsPage from "../../features/dashboard/ui/MyServiceBookingsPage";
import UserAppliedJobsPage from "../../features/dashboard/ui/UserAppliedJobsPage";
import EventsPage from "../../features/dashboard/ui/EventsPage";
import JobsPage from "../../features/dashboard/ui/JobsPage";
import BlogPostsPage from "../../features/dashboard/ui/BlogPostsPage";
import CouponsPage from "../../features/dashboard/ui/CouponsPage";
import MyProfileEditPage from "../../features/dashboard/ui/MyProfileEditPage";
import AllListingsPage from "../../features/dashboard/ui/AllListingsPage";
import ListingFormPage from "../../features/dashboard/ui/ListingFormPage";
import ListingPreviewPage from "../../features/dashboard/ui/ListingPreviewPage";
import ListingStartPage from "../../features/dashboard/ui/ListingStartPage";
import ClassifiedPostingPage from "../../features/dashboard/ui/ClassifiedPostingPage";
import PricingDetailsPage from "../../features/pricing/ui/PricingDetailsPage";
import AllListingPage from "../../features/listing/ui/AllListingPage";
import ListingDetailPage from "../../features/listing/ui/ListingDetailPage";
import { ClassifiedAdDetailsPage, ClassifiedAdsAllPage, ClassifiedsHomePage } from "../../features/classifieds/ui/ClassifiedPages";
import { isCustomerAuthenticated, redirectToCustomerHomeAfterSessionPopup } from "../../features/auth/utils/customerSession";

function ProtectedCustomerRoute({ children }: { children: ReactNode }) {
  if (isCustomerAuthenticated()) {
    return children;
  }

  redirectToCustomerHomeAfterSessionPopup();
  return null;
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
    : <Navigate to="/login?login=register&returnUrl=/dashboard/listings/start" replace />;
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
    "/dashboard/products",
    "/dashboard/my-service-bookings",
    "/dashboard/user-applied-jobs",
    "/dashboard/events",
    "/dashboard/jobs",
    "/dashboard/blog-posts",
    "/dashboard/coupons",
    "/dashboard/my-profile-edit",
    "/dashboard/all-listing",
    "/dashboard/listings/new",
    "/dashboard/listings/start",
    "/dashboard/listings/:listingId/edit",
    "/dashboard/listings/:listingId/preview",
    "/dashboard/classifieds/step-1",
    "/dashboard/classifieds/step-2",
    "/dashboard/classifieds/step-3",
    "/dashboard/classifieds/:listingId/edit",
    "/dashboard/classifieds/:listingId/edit/step-1",
    "/dashboard/classifieds/:listingId/edit/step-2",
    "/dashboard/classifieds/:listingId/edit/step-3",
    "/add-classified-start",
    "/add-classified-step-1",
    "/add-classified-step-2",
    "/add-classified-step-3",
    "/classifieds/index",
    "/classifieds/ads-all",
    "/classifieds/ads-details",
    "/all-listing",
    "/listing-details",
    "/listing/:listingId",
    "/pricing-details",
    "/post-your-ads",
  ];

  return (
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
      <Route path="/dashboard/products" element={<ProtectedCustomerRoute><ProductsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/my-service-bookings" element={<ProtectedCustomerRoute><MyServiceBookingsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/user-applied-jobs" element={<ProtectedCustomerRoute><UserAppliedJobsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/events" element={<ProtectedCustomerRoute><EventsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/jobs" element={<ProtectedCustomerRoute><JobsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/blog-posts" element={<ProtectedCustomerRoute><BlogPostsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/coupons" element={<ProtectedCustomerRoute><CouponsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/my-profile-edit" element={<ProtectedCustomerRoute><MyProfileEditPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/all-listing" element={<ProtectedCustomerRoute><AllListingsPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/listings/start" element={<ProtectedCustomerRoute><ListingStartPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/listings/new" element={<ProtectedCustomerRoute><ListingFormPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/listings/:listingId/edit" element={<ProtectedCustomerRoute><ListingFormPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/listings/:listingId/preview" element={<ProtectedCustomerRoute><ListingPreviewPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/step-1" element={<ProtectedCustomerRoute><ClassifiedPostingPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/step-2" element={<ProtectedCustomerRoute><ClassifiedPostingPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/step-3" element={<ProtectedCustomerRoute><ClassifiedPostingPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/:listingId/edit" element={<ProtectedCustomerRoute><ClassifiedPostingPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/:listingId/edit/step-1" element={<ProtectedCustomerRoute><ClassifiedPostingPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/:listingId/edit/step-2" element={<ProtectedCustomerRoute><ClassifiedPostingPage /></ProtectedCustomerRoute>} />
      <Route path="/dashboard/classifieds/:listingId/edit/step-3" element={<ProtectedCustomerRoute><ClassifiedPostingPage /></ProtectedCustomerRoute>} />
      <Route path="/add-classified-start" element={<ProtectedCustomerRoute><ListingStartPage /></ProtectedCustomerRoute>} />
      <Route path="/add-classified-step-1" element={<ProtectedCustomerRoute><ClassifiedPostingPage /></ProtectedCustomerRoute>} />
      <Route path="/add-classified-step-2" element={<ProtectedCustomerRoute><ClassifiedPostingPage /></ProtectedCustomerRoute>} />
      <Route path="/add-classified-step-3" element={<ProtectedCustomerRoute><ClassifiedPostingPage /></ProtectedCustomerRoute>} />
      <Route path="/classifieds/index" element={<ClassifiedsHomePage />} />
      <Route path="/classifieds/ads-all" element={<ClassifiedAdsAllPage />} />
      <Route path="/classifieds/ads-details" element={<ClassifiedAdDetailsPage />} />
      <Route path="/all-listing" element={<AllListingPage />} />
      <Route path="/listing-details" element={<ListingDetailPage />} />
      <Route path="/listing/:listingId" element={<ListingDetailPage />} />
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
  );
}

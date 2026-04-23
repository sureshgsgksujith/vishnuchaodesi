import { Routes, Route, Navigate } from "react-router-dom";
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
  ];

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/home" element={<HomePage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login?login=register" replace />} />
      <Route path="/forgot-password" element={<Navigate to="/login?login=forgot" replace />} />

      <Route path="/user-info" element={<UserInfoPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/dashboard/payment" element={<PaymentPage />} />
      <Route path="/dashboard/plan-change" element={<PlanChangePage />} />
      <Route path="/dashboard/point-history" element={<PointHistoryPage />} />
      <Route path="/dashboard/notifications" element={<NotificationsPage />} />
      <Route path="/dashboard/followings" element={<FollowingsPage />} />
      <Route path="/dashboard/review" element={<ReviewPage />} />
      <Route path="/dashboard/products" element={<ProductsPage />} />
      <Route path="/dashboard/my-service-bookings" element={<MyServiceBookingsPage />} />
      <Route path="/dashboard/user-applied-jobs" element={<UserAppliedJobsPage />} />
      <Route path="/dashboard/events" element={<EventsPage />} />
      <Route path="/dashboard/jobs" element={<JobsPage />} />
      <Route path="/dashboard/blog-posts" element={<BlogPostsPage />} />
      <Route path="/dashboard/coupons" element={<CouponsPage />} />
      <Route path="/dashboard/my-profile-edit" element={<MyProfileEditPage />} />

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

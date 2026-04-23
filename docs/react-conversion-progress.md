# React Conversion Progress

## Current base

- Runtime: React + Vite is already active in `src/main.tsx`
- Router: `src/app/router/AppRouter.tsx`
- Static fallback source: `public/template-17/*.html`
- Shared global assets: `public/template-17/css`, `public/template-17/js`, `public/template-17/images`

## Inventory summary

- Top-level customer-facing static pages in `public/template-17`: 88 HTML files
- Additional static sub-areas:
  - `public/template-17/admin`
  - `public/template-17/classifieds`
  - `public/template-17/jobs`
  - `public/template-17/places`
  - `public/template-17/service-experts`
- Main jQuery-heavy source files still present:
  - `public/template-17/js/custom.js`
  - `public/template-17/js/custom_validation.js`
  - `public/template-17/js/select-opt.js`
  - `public/template-17/js/slick.js`

## Converted React pages

- `HomePage`
- `LoginPage`
- `DashboardPage`
- `PaymentPage` at `/dashboard/payment`
- `PlanChangePage` at `/dashboard/plan-change`
- `PointHistoryPage` at `/dashboard/point-history`
- `NotificationsPage` at `/dashboard/notifications`
- `FollowingsPage` at `/dashboard/followings`
- `ReviewPage` at `/dashboard/review`
- `ProductsPage` at `/dashboard/products`
- `MyServiceBookingsPage` at `/dashboard/my-service-bookings`
- `UserAppliedJobsPage` at `/dashboard/user-applied-jobs`
- `EventsPage` at `/dashboard/events`
- `JobsPage` at `/dashboard/jobs`
- `BlogPostsPage` at `/dashboard/blog-posts`
- `CouponsPage` at `/dashboard/coupons`

## Shared React pieces extracted so far

- `UserHomeHeader`
- `DashboardLayout`
- `DashboardSidebar`
- `DashboardRightRail`
- `DashboardSupportWidget`
- `DashboardFooter`
- `DashboardSectionHeader`
- `DashboardSearchField`
- `DashboardTabs`
- `dashboardMockData`
- `dashboardData` route/menu/footer config

## Remaining static-route groups

- Directory pages:
  - `/all-category`
  - `/all-listing`
  - `/listing-details`
- Blog pages:
  - `/blog-posts`
  - `/blog-details`
  - `/create-new-blog-post`
  - `/edit-blog-post`
- Event pages:
  - `/events`
  - `/event-details`
  - `/create-new-event`
  - `/edit-event`
- Product pages:
  - `/products`
  - `/product-details`
  - `/add-new-product`
  - `/edit-product`
- Coupon pages:
  - `/coupons`
  - `/add-coupons`
  - `/edit-coupon`
- Account/profile pages:
  - `/community`
  - `/company-profile`
  - `/company-profile-edit`
  - `/profile`
  - `/profile-job-user`
- Listing flow pages:
  - `/add-listing/*`
  - `/edit-listing/*`
- Dashboard subpages still static:
  - all dashboard routes except:
    - `/dashboard`
    - `/dashboard/blog-posts`
    - `/dashboard/coupons`
    - `/dashboard/events`
    - `/dashboard/payment`
    - `/dashboard/plan-change`
    - `/dashboard/point-history`
    - `/dashboard/notifications`
    - `/dashboard/followings`
    - `/dashboard/jobs`
    - `/dashboard/my-service-bookings`
    - `/dashboard/products`
    - `/dashboard/review`
    - `/dashboard/user-applied-jobs`

## Next safe conversion order

1. Dashboard subpages using the new `DashboardLayout`
2. Shared directory pages using home/header/footer shell
3. Detail pages and form-heavy flows
4. Remaining nested sections: classifieds, jobs, service experts, admin

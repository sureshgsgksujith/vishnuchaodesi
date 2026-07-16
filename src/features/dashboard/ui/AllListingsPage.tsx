import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import {
  deleteListing,
  getListingApiErrorMessage,
  getMyListings,
  type ListingSummary,
} from "../api/listingsApi";
import {
  getListingCategoryTree,
  type ListingCategoryOption,
  type ListingSubCategoryOption,
} from "../api/listingCategoriesApi";
import {
  getAllServiceDirectoryTree,
  type AllServiceCategoryOption,
  type AllServiceSubCategoryOption,
} from "../../allServices/api/allServiceDirectoryApi";
import {
  getMyAllServicePostings,
  type PublicAllServicePosting,
} from "../../allServices/api/allServicePostingsApi";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../utils/listingImages";
import "../styles/listings.css";

const PAGE_SIZE = 10;
type ListingModuleFilter = "" | "yellowPages" | "classified" | "localService" | "jobs" | "products";
type DashboardListingRow = ListingSummary & { dashboardModule?: "localService" };
type AllListingsPageProps = {
  defaultModule?: ListingModuleFilter;
  lockedModule?: boolean;
  title?: string;
};

const moduleFilterOptions: Array<{ value: ListingModuleFilter; label: string }> = [
  { value: "", label: "All Modules" },
  { value: "yellowPages", label: "Yellow Pages" },
  { value: "classified", label: "Classifieds" },
  { value: "localService", label: "Local Service" },
];

const lockedModuleLabels: Record<Exclude<ListingModuleFilter, "">, string> = {
  yellowPages: "Yellow Pages",
  classified: "Classifieds",
  localService: "Local Service",
  jobs: "Jobs",
  products: "Products",
};

export default function AllListingsPage({
  defaultModule = "",
  lockedModule = false,
  title = "Listing Details",
}: AllListingsPageProps) {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<DashboardListingRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState<ListingModuleFilter>(defaultModule);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [listingCategories, setListingCategories] = useState<ListingCategoryOption[]>([]);
  const [serviceCategories, setServiceCategories] = useState<AllServiceCategoryOption[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const loadRequestId = useRef(0);

  const visibleModuleOptions = useMemo(
    () =>
      lockedModule
        ? [
            {
              value: selectedModule,
              label: selectedModule ? lockedModuleLabels[selectedModule] : title,
            },
          ]
        : moduleFilterOptions,
    [lockedModule, selectedModule, title],
  );

  const categoryOptions = useMemo(
    () => getCategoryOptions(selectedModule, listingCategories, serviceCategories, selectedCategory),
    [listingCategories, selectedCategory, selectedModule, serviceCategories],
  );
  const subCategoryOptions = useMemo(
    () => getSubCategoryOptions(selectedModule, listingCategories, serviceCategories, selectedCategory, selectedSubCategory),
    [listingCategories, selectedCategory, selectedModule, selectedSubCategory, serviceCategories],
  );
  const subCategoryLabel = selectedModule === "classified" ? "Detailed Category" : "Sub Category";
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    [totalCount],
  );

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getListingCategoryTree().catch(() => [] as ListingCategoryOption[]),
      getAllServiceDirectoryTree().catch(() => [] as AllServiceCategoryOption[]),
    ]).then(([nextListingCategories, nextServiceCategories]) => {
      if (!isMounted) {
        return;
      }

      setListingCategories(nextListingCategories || []);
      setServiceCategories(nextServiceCategories || []);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    const nextModule = lockedModule
      ? defaultModule
      : getModuleFilter(searchParams.get("module")) || defaultModule;
    const nextCategory = searchParams.get("category") || "";
    const nextSubCategory = nextCategory ? searchParams.get("subCategory") || "" : "";
    const nextSearch = searchParams.get("search") || "";

    setSelectedModule(nextModule);
    setSelectedCategory(nextCategory);
    setSelectedSubCategory(nextSubCategory);
    setSearch(nextSearch);
  }, [defaultModule, lockedModule, searchParams]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedModule, selectedCategory, selectedSubCategory]);

  useEffect(() => {
    loadListings();
  }, [page, debouncedSearch, selectedModule, selectedCategory, selectedSubCategory]);

  async function loadListings() {
    const requestId = loadRequestId.current + 1;
    loadRequestId.current = requestId;

    try {
      setIsLoading(true);
      setErrorMessage("");

      const result = selectedModule === "localService"
        ? await getMyAllServicePostings({
            search: debouncedSearch,
            page,
            pageSize: PAGE_SIZE,
            category: selectedCategory,
            subCategory: selectedSubCategory,
          }).then((response) => ({
            ...response,
            items: (response.items || []).map(mapServicePostingToListingRow),
          }))
        : await getMyListings({
            search: debouncedSearch,
            page,
            pageSize: PAGE_SIZE,
            categoryName: getServerCategoryFilter(selectedModule, selectedCategory),
            subCategory: getServerSubCategoryFilter(selectedModule, selectedCategory, selectedSubCategory),
            detailCategory: getServerDetailCategoryFilter(selectedModule, selectedSubCategory),
            listingModule: getServerModuleFilter(selectedModule),
          });

      if (requestId !== loadRequestId.current) {
        return;
      }

      setItems(result.items || []);
      setTotalCount(result.totalCount || 0);
    } catch (error) {
      if (requestId !== loadRequestId.current) {
        return;
      }

      setErrorMessage(getListingApiErrorMessage(error));
    } finally {
      if (requestId === loadRequestId.current) {
        setIsLoading(false);
      }
    }
  }

  function handleSearch(value: string) {
    setSearch(value);
  }

  function handleModuleChange(value: string) {
    setSelectedModule(getModuleFilter(value));
    setSelectedCategory("");
    setSelectedSubCategory("");
  }

  function handleCategoryChange(value: string) {
    setSelectedCategory(value);
    setSelectedSubCategory("");
  }

  function clearFilters() {
    setSearch("");
    setSelectedModule(lockedModule ? defaultModule : "");
    setSelectedCategory("");
    setSelectedSubCategory("");
  }

  async function handleDelete(listingId: number) {
    const confirmed = window.confirm("Are you sure you want to delete this listing?");

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(listingId);
      setErrorMessage("");

      await deleteListing(listingId);

      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== listingId)
      );
      setTotalCount((currentCount) => Math.max(0, currentCount - 1));
    } catch (error) {
      setErrorMessage(getListingApiErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <DashboardLayout mainContentClassName="ud-no-rhs dashboard-listings-main">
      <div className="ud-cen dashboard-listings-page">
        <div className="log-bor">&nbsp;</div>

        <span className="udb-inst">{lockedModule ? title : "All Listings"}</span>

        {isLoading ? <ListingsLoadingOverlay /> : null}

        {errorMessage ? (
          <div className="alert alert-danger">
            {errorMessage}
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={loadListings}
              style={{ marginLeft: 12 }}
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="ud-cen-s2 dashboard-listings-panel">
          <div className="dashboard-listings-toolbar">
            <div className="dashboard-listings-title-block">
              <h2>{title}</h2>
              <span>{totalCount} matching listings</span>
            </div>

            <div className="dashboard-listings-filters">
              <label>
                <span>Module</span>
                <select
                  value={selectedModule}
                  onChange={(event) => handleModuleChange(event.target.value)}
                  disabled={lockedModule}
                >
                  {visibleModuleOptions.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Category</span>
                <select
                  value={selectedCategory}
                  onChange={(event) => handleCategoryChange(event.target.value)}
                >
                  <option value="">
                    {selectedModule ? "All Categories" : "Select module for categories"}
                  </option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              {selectedCategory ? (
                <label>
                  <span>{subCategoryLabel}</span>
                  <select
                    value={selectedSubCategory}
                    onChange={(event) => setSelectedSubCategory(event.target.value)}
                  >
                    <option value="">All {subCategoryLabel}s</option>
                    {subCategoryOptions.map((subCategory) => (
                      <option key={subCategory} value={subCategory}>
                        {subCategory}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="dashboard-listings-search-field">
                <span>Search</span>
                <input
                  type="search"
                  placeholder="Search listings..."
                  value={search}
                  onChange={(event) => handleSearch(event.target.value)}
                />
              </label>

              <button type="button" className="dashboard-listings-clear" onClick={clearFilters}>
                Clear
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table bordered dashboard-listings-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Listing Name</th>
                  <th>Module</th>
                  <th>Expiry Date</th>
                  <th>Rating</th>
                  <th>Views</th>
                  <th>Status</th>
                  <th>Edit</th>
                  <th>Delete</th>
                  <th>Preview</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10}>Loading listings...</td>
                  </tr>
                ) : items.length > 0 ? (
                  items.map((item, index) => (
                    <tr key={item.id}>
                      <td>{(page - 1) * PAGE_SIZE + index + 1}</td>

                      <td>
                        <div className="dashboard-listing-title-cell">
                          <img
                            src={resolveListingImageUrl(item.logoUrl || item.primaryImageUrl || item.imageUrls?.[0])}
                            alt={item.title}
                            onError={setFallbackListingImage}
                          />

                          <div>
                            <strong>{item.title}</strong>
                            <span className={`dashboard-listing-module-badge ${getListingModuleClass(item)}`}>
                              {getListingModuleLabel(item)}
                            </span>
                            <span>{formatDate(getLatestListingDate(item))}</span>
                            {item.rejectionReason ? (
                              <small>{item.rejectionReason}</small>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`dashboard-listing-module-pill ${getListingModuleClass(item)}`}>
                          {getListingModuleLabel(item)}
                        </span>
                        <em className="dashboard-listing-category-path">
                          {getListingCategoryPath(item)}
                        </em>
                      </td>

                      <td>
                        <div className="dashboard-listing-plan-cell">
                          <strong>{getPlanName(item)}</strong>
                          <span>{getPlanExpiryText(item)}</span>
                        </div>
                      </td>

                      <td>
                        <span className="db-list-rat">
                          {item.rating ?? 0}
                        </span>
                      </td>

                      <td>
                        <span className="db-list-rat">
                          {item.views ?? 0}
                        </span>
                      </td>

                      <td>
                        <span className={getStatusClass(item.status)}>
                          {item.status || "Pending"}
                        </span>
                        {item.rejectionCount ? (
                          <em className="dashboard-listing-reject-count">
                            {item.rejectionCount}/3
                          </em>
                        ) : null}
                      </td>

                      <td>
                        {item.canEdit === false ? (
                          <span className="db-list-edit dashboard-listing-disabled">
                            Locked
                          </span>
                        ) : (
                          <Link
                            to={getEditUrl(item)}
                            className="db-list-edit"
                          >
                            Edit
                          </Link>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="db-list-edit db-list-edit-button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id || isLocalServiceListing(item)}
                          title={isLocalServiceListing(item) ? "Local service delete is not available here yet." : undefined}
                        >
                          {isLocalServiceListing(item) ? "Locked" : deletingId === item.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>

                      <td>
                        <Link
                          to={getPreviewUrl(item)}
                          className="db-list-edit"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Preview
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10}>No listings found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dashboard-listings-pagination">
            <span>{totalCount} listings</span>
            <div>
              <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                Previous
              </button>
              <strong>{page} / {totalPages}</strong>
              <button type="button" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ListingsLoadingOverlay() {
  return (
    <div className="dashboard-listings-loader" role="status" aria-live="polite">
      <div className="dashboard-listings-loader-card">
        <span className="dashboard-listings-loader-spinner" aria-hidden="true"></span>
        <strong>Loading listings</strong>
        <p>Getting your latest listing data and filters.</p>
      </div>
    </div>
  );
}

function getUniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
  ).sort((first, second) => first.localeCompare(second));
}

function getModuleFilter(value: string | null): ListingModuleFilter {
  return value === "yellowPages" ||
    value === "classified" ||
    value === "localService" ||
    value === "jobs" ||
    value === "products"
    ? value
    : "";
}

function getServerModuleFilter(selectedModule: ListingModuleFilter) {
  if (selectedModule === "yellowPages") {
    return "YellowPages";
  }

  if (selectedModule === "classified") {
    return "Classifieds";
  }

  if (selectedModule === "products") {
    return "Products";
  }

  return undefined;
}

function getServerCategoryFilter(selectedModule: ListingModuleFilter, selectedCategory: string) {
  if (selectedModule === "classified") {
    return "Classifieds";
  }

  if (selectedModule === "jobs") {
    return "Jobs";
  }

  if (selectedCategory) {
    return selectedCategory;
  }

  return undefined;
}

function getServerSubCategoryFilter(
  selectedModule: ListingModuleFilter,
  selectedCategory: string,
  selectedSubCategory: string,
) {
  if (selectedModule === "classified") {
    return selectedCategory || undefined;
  }

  return selectedSubCategory || undefined;
}

function getServerDetailCategoryFilter(selectedModule: ListingModuleFilter, selectedSubCategory: string) {
  if (selectedModule === "classified") {
    return selectedSubCategory || undefined;
  }

  return undefined;
}

function getCategoryOptions(
  selectedModule: ListingModuleFilter,
  listingCategories: ListingCategoryOption[],
  serviceCategories: AllServiceCategoryOption[],
  selectedCategory: string,
) {
  if (selectedModule === "localService") {
    return getUniqueOptions([
      ...serviceCategories.map((category) => category.name),
      selectedCategory,
    ]);
  }

  if (selectedModule === "classified") {
    const classifiedCategory = getClassifiedRootCategory(listingCategories);

    return getUniqueOptions([
      ...(classifiedCategory?.subCategories || []).map((subCategory) => subCategory.name),
      selectedCategory,
    ]);
  }

  if (selectedModule === "jobs") {
    return getUniqueOptions(["Jobs", selectedCategory]);
  }

  if (selectedModule === "products") {
    return getUniqueOptions([
      ...listingCategories
        .filter(isProductCategoryOption)
        .map((category) => category.name),
      selectedCategory,
    ]);
  }

  if (selectedModule === "yellowPages") {
    return getUniqueOptions([
      ...listingCategories
        .filter((category) => !isClassifiedCategoryOption(category))
        .map((category) => category.name),
      selectedCategory,
    ]);
  }

  return selectedCategory ? [selectedCategory] : [];
}

function getSubCategoryOptions(
  selectedModule: ListingModuleFilter,
  listingCategories: ListingCategoryOption[],
  serviceCategories: AllServiceCategoryOption[],
  selectedCategory: string,
  selectedSubCategory: string,
) {
  if (!selectedCategory) {
    return [];
  }

  if (selectedModule === "localService") {
    const serviceCategory = findByName(serviceCategories, selectedCategory);

    return getUniqueOptions([
      ...(serviceCategory?.subCategories || []).map((subCategory) => subCategory.name),
      selectedSubCategory,
    ]);
  }

  if (selectedModule === "classified") {
    const classifiedCategory = getClassifiedRootCategory(listingCategories);
    const classifiedSubCategory = findByName(classifiedCategory?.subCategories || [], selectedCategory);

    return getUniqueOptions([
      ...(classifiedSubCategory?.detailedCategories || []).map((detail) => detail.name),
      selectedSubCategory,
    ]);
  }

  const listingCategory = findByName(listingCategories, selectedCategory);

  return getUniqueOptions([
    ...(listingCategory?.subCategories || []).map((subCategory) => subCategory.name),
    selectedSubCategory,
  ]);
}

function getClassifiedRootCategory(listingCategories: ListingCategoryOption[]) {
  return listingCategories.find(isClassifiedCategoryOption);
}

function isClassifiedCategoryOption(category: ListingCategoryOption) {
  return category.name.trim().toLowerCase() === "classifieds" ||
    category.slug.trim().toLowerCase() === "classifieds";
}

function isProductCategoryOption(category: ListingCategoryOption) {
  const text = `${category.name} ${category.slug}`.toLowerCase();

  return [
    "product",
    "electronics",
    "appliance",
    "furniture",
    "fashion",
    "books",
    "sports",
    "hobbies",
    "vehicles",
  ].some((needle) => text.includes(needle));
}

function findByName<T extends ListingCategoryOption | ListingSubCategoryOption | AllServiceCategoryOption | AllServiceSubCategoryOption>(
  values: T[],
  name: string,
) {
  const normalizedName = name.trim().toLowerCase();

  return values.find(
    (item) =>
      item.name.trim().toLowerCase() === normalizedName ||
      item.slug.trim().toLowerCase() === normalizedName,
  );
}

function mapServicePostingToListingRow(posting: PublicAllServicePosting): DashboardListingRow {
  const firstService = posting.selectedServices?.[0];
  const createdAt = posting.createdAt || new Date().toISOString();
  const imageUrls = posting.businessImageUrl ? [posting.businessImageUrl] : [];

  return {
    id: posting.id,
    userId: posting.userId,
    title: posting.businessName || posting.serviceName || "Local service",
    slug: "",
    description: posting.description || "",
    categoryName: posting.allServiceCategoryName || "Local Service",
    subCategory: firstService?.subCategoryName || posting.serviceName || "",
    detailCategory: firstService?.detailedCategoryName || "",
    status: posting.status || "Pending",
    views: 0,
    rating: 0,
    rejectionCount: 0,
    rejectionReason: posting.rejectionReason,
    canEdit: true,
    createdAt,
    updatedAt: posting.updatedAt,
    sellerName: posting.contactName,
    userPlanName: posting.packageCode || "Local Service",
    userPlanCode: posting.packageCode,
    userPlanExpiryDate: null,
    city: getServicePostingCity(posting),
    locality: posting.primaryServiceLocation,
    price: null,
    primaryImageUrl: posting.businessImageUrl,
    propertyDetails: { listingKind: "LocalService" },
    imageUrls,
    dashboardModule: "localService",
  };
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getServicePostingCity(posting: PublicAllServicePosting) {
  const primaryLocation = posting.serviceLocations?.find((location) => location.isPrimary) ||
    posting.serviceLocations?.[0];

  return primaryLocation?.city || posting.primaryServiceLocation || null;
}

function getLatestListingDate(item: DashboardListingRow) {
  return item.updatedAt || item.createdAt;
}

function isLocalServiceListing(item: DashboardListingRow) {
  return item.dashboardModule === "localService" ||
    getRecordText(item.propertyDetails, "listingKind").toLowerCase() === "localservice";
}

function isClassifiedListing(item: DashboardListingRow) {
  const categoryName = item.categoryName?.trim().toLowerCase();

  return categoryName === "classifieds";
}

function getListingModuleLabel(item: DashboardListingRow) {
  if (isLocalServiceListing(item)) {
    return "Local Service";
  }

  return isClassifiedListing(item) ? "Classifieds" : "Yellow Pages";
}

function getListingModuleClass(item: DashboardListingRow) {
  if (isLocalServiceListing(item)) {
    return "is-local-service";
  }

  return isClassifiedListing(item) ? "is-classified" : "is-yellow-pages";
}

function getListingCategoryPath(item: DashboardListingRow) {
  const parts = isClassifiedListing(item) || isLocalServiceListing(item)
    ? [item.categoryName, item.subCategory, item.detailCategory]
    : [item.categoryName, item.subCategory, item.detailCategory];

  return parts.map((part) => part?.trim()).filter(Boolean).join(" / ") || "-";
}

function getEditUrl(item: DashboardListingRow) {
  if (isLocalServiceListing(item)) {
    return "/dashboard/services/new";
  }

  return isClassifiedListing(item)
    ? `/dashboard/classifieds/${item.id}/edit/step-1`
    : `/dashboard/listings/${item.id}/edit`;
}

function getPreviewUrl(item: DashboardListingRow) {
  if (isLocalServiceListing(item)) {
    return `/local-service-details/${item.id}`;
  }

  return `/dashboard/listings/${item.id}/preview`;
}

function getPlanName(item: DashboardListingRow) {
  return item.userPlanName?.trim() || "Free";
}

function getPlanExpiryText(item: DashboardListingRow) {
  const formattedDate = formatDate(item.userPlanExpiryDate);
  return formattedDate === "-" ? "No expiry date" : formattedDate;
}

function getStatusClass(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "active") {
    return "db-list-ststus dashboard-listing-approved";
  }

  if (normalized === "rejected") {
    return "db-list-ststus dashboard-listing-rejected";
  }

  return "db-list-ststus dashboard-listing-waiting";
}

function getRecordText(record: Record<string, string | number | boolean | null> | undefined, key: string) {
  const value = record?.[key];
  return value === null || value === undefined ? "" : String(value);
}

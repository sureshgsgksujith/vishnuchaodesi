import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import {
  deleteListing,
  getListingApiErrorMessage,
  getMyListings,
  type ListingSummary,
} from "../api/listingsApi";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../utils/listingImages";
import "../styles/listings.css";

const PAGE_SIZE = 10;
type ListingModuleFilter = "" | "classified" | "jobs" | "products";
type AllListingsPageProps = {
  defaultModule?: ListingModuleFilter;
  lockedModule?: boolean;
  title?: string;
};

const moduleFilterOptions: Array<{ value: ListingModuleFilter; label: string }> = [
  { value: "", label: "All Modules" },
  { value: "classified", label: "Ads Posts" },
  { value: "jobs", label: "Jobs" },
  { value: "products", label: "Products" },
];

export default function AllListingsPage({
  defaultModule = "",
  lockedModule = false,
  title = "Listing Details",
}: AllListingsPageProps) {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState<ListingModuleFilter>(defaultModule);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const categoryOptions = useMemo(
    () =>
      getUniqueOptions(
        items
          .filter((item) => matchesModuleFilter(item, selectedModule))
          .map((item) => item.categoryName),
      ),
    [items, selectedModule],
  );
  const subCategoryOptions = useMemo(
    () => {
      if (!selectedCategory) {
        return [];
      }

      return getUniqueOptions(
        items
          .filter((item) => matchesModuleFilter(item, selectedModule))
          .filter((item) => item.categoryName === selectedCategory)
          .map((item) => item.subCategory),
      );
    },
    [items, selectedCategory, selectedModule],
  );
  const filteredItems = useMemo(
    () => filterListings(items, search, selectedModule, selectedCategory, selectedSubCategory),
    [items, search, selectedModule, selectedCategory, selectedSubCategory],
  );
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE)),
    [filteredItems.length],
  );
  const pagedItems = useMemo(
    () => filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredItems, page],
  );

  useEffect(() => {
    loadListings();
  }, []);

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
  }, [search, selectedModule, selectedCategory, selectedSubCategory]);

  async function loadListings() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const result = await getMyListings("", 1, 1000);
      setItems(result.items || []);
    } catch (error) {
      setErrorMessage(getListingApiErrorMessage(error));
    } finally {
      setIsLoading(false);
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
              <span>{filteredItems.length} matching listings</span>
            </div>

            <div className="dashboard-listings-filters">
              <label>
                <span>Module</span>
                <select
                  value={selectedModule}
                  onChange={(event) => handleModuleChange(event.target.value)}
                  disabled={lockedModule}
                >
                  {moduleFilterOptions.map((option) => (
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
                  <option value="">All Categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              {selectedCategory ? (
                <label>
                  <span>Sub Category</span>
                  <select
                    value={selectedSubCategory}
                    onChange={(event) => setSelectedSubCategory(event.target.value)}
                  >
                    <option value="">All Sub Categories</option>
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
                ) : pagedItems.length > 0 ? (
                  pagedItems.map((item, index) => (
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
                            to={isClassifiedListing(item) ? `/dashboard/classifieds/${item.id}/edit/step-1` : `/dashboard/listings/${item.id}/edit`}
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
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>

                      <td>
                        <Link
                          to={`/dashboard/listings/${item.id}/preview`}
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
            <span>{filteredItems.length} listings</span>
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

function filterListings(
  items: ListingSummary[],
  search: string,
  selectedModule: ListingModuleFilter,
  selectedCategory: string,
  selectedSubCategory: string,
) {
  const normalizedSearch = search.trim().toLowerCase();

  return items.filter((item) => {
    if (!matchesModuleFilter(item, selectedModule)) {
      return false;
    }

    if (selectedCategory && item.categoryName !== selectedCategory) {
      return false;
    }

    if (selectedSubCategory && item.subCategory !== selectedSubCategory) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [
      item.title,
      item.categoryName,
      item.subCategory,
      item.detailCategory,
      item.status,
      getListingModuleLabel(item),
      getPlanName(item),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });
}

function getModuleFilter(value: string | null): ListingModuleFilter {
  return value === "classified" || value === "jobs" || value === "products"
    ? value
    : "";
}

function matchesModuleFilter(item: ListingSummary, selectedModule: ListingModuleFilter) {
  if (!selectedModule) {
    return true;
  }

  if (selectedModule === "classified") {
    return isClassifiedListing(item);
  }

  if (selectedModule === "jobs") {
    return isJobsListing(item);
  }

  return isProductListing(item);
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

function getLatestListingDate(item: ListingSummary) {
  return item.updatedAt || item.createdAt;
}

function isClassifiedListing(item: ListingSummary) {
  const categoryName = item.categoryName?.trim().toLowerCase();

  return categoryName === "classifieds";
}

function isJobsListing(item: ListingSummary) {
  return item.categoryName?.trim().toLowerCase() === "jobs";
}

function isProductListing(item: ListingSummary) {
  return matchesListingText(item, [
    "product",
    "products",
    "electronics",
    "appliance",
    "furniture",
    "fashion",
    "books",
    "sports",
    "hobbies",
    "vehicles",
  ]);
}

function getListingModuleLabel(item: ListingSummary) {
  return isClassifiedListing(item) ? "Classified" : "Yellow Pages";
}

function getListingModuleClass(item: ListingSummary) {
  return isClassifiedListing(item) ? "is-classified" : "is-yellow-pages";
}

function getListingCategoryPath(item: ListingSummary) {
  const parts = isClassifiedListing(item)
    ? [item.subCategory]
    : [item.categoryName, item.subCategory, item.detailCategory];

  return parts.map((part) => part?.trim()).filter(Boolean).join(" / ") || "-";
}

function getPlanName(item: ListingSummary) {
  return item.userPlanName?.trim() || "Free";
}

function getPlanExpiryText(item: ListingSummary) {
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

function matchesListingText(item: ListingSummary, needles: string[]) {
  const haystack = [
    item.categoryName,
    item.subCategory,
    item.detailCategory,
    getRecordText(item.propertyDetails, "listingKind"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return needles.some((needle) => haystack.includes(needle));
}

function getRecordText(record: Record<string, string | number | boolean | null> | undefined, key: string) {
  const value = record?.[key];
  return value === null || value === undefined ? "" : String(value);
}

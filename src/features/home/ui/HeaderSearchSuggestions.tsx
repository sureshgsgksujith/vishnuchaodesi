import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicListings, type ListingSummary } from "../../dashboard/api/listingsApi";
import {
  getPublicAllServicePostings,
  type PublicAllServicePosting,
} from "../../allServices/api/allServicePostingsApi";

type HeaderSearchSuggestionsProps = {
  searchText: string;
  city?: string;
  onSelect: () => void;
};

export default function HeaderSearchSuggestions({
  searchText,
  city,
  onSelect,
}: HeaderSearchSuggestionsProps) {
  const keyword = searchText.trim();
  const [yellowPages, setYellowPages] = useState<ListingSummary[]>([]);
  const [classifieds, setClassifieds] = useState<ListingSummary[]>([]);
  const [services, setServices] = useState<PublicAllServicePosting[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (keyword.length < 2) {
      setYellowPages([]);
      setClassifieds([]);
      setServices([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      Promise.allSettled([
        getPublicListings({
          search: keyword,
          city: city || undefined,
          excludeCategoryName: "Classifieds",
          page: 1,
          pageSize: 8,
        }),
        getPublicListings({
          search: keyword,
          city: city || undefined,
          categoryName: "Classifieds",
          page: 1,
          pageSize: 8,
        }),
        getPublicAllServicePostings({
          search: keyword,
          city: city || undefined,
          page: 1,
          pageSize: 8,
        }),
      ]).then(([yellowResult, classifiedResult, serviceResult]) => {
        if (!isActive) return;
        setYellowPages(yellowResult.status === "fulfilled" ? yellowResult.value.items || [] : []);
        setClassifieds(classifiedResult.status === "fulfilled" ? classifiedResult.value.items || [] : []);
        setServices(serviceResult.status === "fulfilled" ? serviceResult.value.items || [] : []);
        setIsLoading(false);
      });
    }, 280);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [city, keyword]);

  if (keyword.length < 2) return null;

  const hasResults = yellowPages.length + classifieds.length + services.length > 0;
  const allResultsParams = new URLSearchParams({ search: keyword });
  if (city) allResultsParams.set("city", city);

  return (
    <div className="header-search-suggestions" role="listbox" aria-label="Search suggestions">
      {isLoading ? <div className="header-search-message">Finding suggestions…</div> : null}

      {!isLoading && !hasResults ? (
        <div className="header-search-message">No suggestions found for “{keyword}”</div>
      ) : null}

      <SuggestionGroup
        title="Yellow Pages"
        icon="storefront"
        items={yellowPages.map((item) => ({
          id: `yellow-${item.id}`,
          title: item.title,
          subtitle: item.subCategory || item.categoryName || "Business",
          href: `/listing-details?id=${item.id}`,
        }))}
        onSelect={onSelect}
      />
      <SuggestionGroup
        title="Classifieds"
        icon="sell"
        items={classifieds.map((item) => ({
          id: `classified-${item.id}`,
          title: item.title,
          subtitle: item.subCategory || item.detailCategory || "Classified ad",
          href: `/classifieds/ads-details?id=${item.id}`,
        }))}
        onSelect={onSelect}
      />
      <SuggestionGroup
        title="Local Services"
        icon="handyman"
        items={services.map((item) => ({
          id: `service-${item.id}`,
          title: item.businessName,
          subtitle: item.serviceName || item.allServiceCategoryName || "Local service",
          href: `/local-service-details/${item.id}`,
        }))}
        onSelect={onSelect}
      />

      {hasResults ? (
        <Link className="header-search-view-all" to={`/search-results?${allResultsParams}`} onClick={onSelect}>
          View all results for “{keyword}”
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}

type SuggestionItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

function SuggestionGroup({
  title,
  icon,
  items,
  onSelect,
}: {
  title: string;
  icon: string;
  items: SuggestionItem[];
  onSelect: () => void;
}) {
  if (!items.length) return null;

  return (
    <section className="header-search-group">
      <h3>{title}</h3>
      {items.map((item) => (
        <Link key={item.id} to={item.href} onClick={onSelect} role="option">
          <i className="material-icons" aria-hidden="true">{icon}</i>
          <span>
            <strong>{item.title}</strong>
            <small>{item.subtitle}</small>
          </span>
        </Link>
      ))}
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllServiceDirectoryTree,
  type AllServiceCategoryOption,
} from "../../allServices/api/allServiceDirectoryApi";

type HomeLawTab = {
  key: string;
  label: string;
  subCategoryName: string;
  items: Array<{ id: number; name: string; slug: string }>;
};

export default function HomeLawyersSection() {
  const [category, setCategory] = useState<AllServiceCategoryOption | null>(null);
  const [activeTabKey, setActiveTabKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isActive = true;

    getAllServiceDirectoryTree()
      .then((items) => {
        if (!isActive) return;
        const legalCategory = findLegalCategory(items);
        setCategory(legalCategory || null);
        setLoadError(legalCategory ? "" : "Lawyers and immigration services are not configured yet.");
      })
      .catch(() => {
        if (!isActive) return;
        setCategory(null);
        setLoadError("Unable to load lawyers and immigration services from the live directory.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const tabs = useMemo(() => buildHomeLawTabs(category), [category]);
  const activeTab = tabs.find((tab) => tab.key === activeTabKey) || tabs[0];

  useEffect(() => {
    if (tabs.length && !tabs.some((tab) => tab.key === activeTabKey)) {
      setActiveTabKey(tabs[0].key);
    }
  }, [activeTabKey, tabs]);

  return (
    <section className="chao-law">
      <div className="container">
        <div className="law-title text-center">
          <h2>{category?.name || "Lawyers & Immigration Services"}</h2>
          <p>Find trusted lawyers and consultants for your legal needs</p>
        </div>

        {isLoading ? <p className="text-center">Loading live legal services...</p> : null}
        {loadError ? <p className="text-center">{loadError}</p> : null}

        {tabs.length ? (
          <>
            <div className="law-tabs">
              {tabs.map((tab) => (
                <button
                  className={`law-tab ${tab.key === activeTab?.key ? "active" : ""}`}
                  data-tab={tab.key}
                  key={tab.key}
                  onClick={() => setActiveTabKey(tab.key)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab ? (
              <div className="law-content">
                <div className="law-tab-content active" id={activeTab.key}>
                  <ul>
                    {activeTab.items.map((item) => (
                      <li key={item.id}>
                        <Link to={buildServiceHref(category!, activeTab, item)}>{item.name}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            <div className="text-center mt-50">
              <Link to={`/all-services#${category?.slug}`} className="btn-outline">View More &rarr;</Link>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function buildHomeLawTabs(category: AllServiceCategoryOption | null): HomeLawTab[] {
  if (!category) return [];

  return category.subCategories.slice(0, 6).map((subCategory) => ({
    key: subCategory.slug,
    label: buildTabLabel(subCategory.name),
    subCategoryName: subCategory.name,
    items: (subCategory.detailedCategories.length
      ? subCategory.detailedCategories
      : [{ id: subCategory.id, name: subCategory.name, slug: subCategory.slug }]
    ).slice(0, 5),
  }));
}

function findLegalCategory(categories: AllServiceCategoryOption[]) {
  return (
    categories.find((category) => category.slug === "lawyers-immigration-services") ||
    categories.find((category) => /lawyers.*immigration|law.*immigration/i.test(category.name))
  );
}

function buildServiceHref(
  category: AllServiceCategoryOption,
  tab: HomeLawTab,
  item: { name: string; slug: string },
) {
  const params = new URLSearchParams({
    categoryId: String(category.id),
    category: category.name,
    subCategory: tab.subCategoryName,
    detail: item.slug,
    service: item.name,
  });
  return `/all-services-detailed?${params.toString()}`;
}

function buildTabLabel(name: string) {
  return name.replace(/\s+Law$/i, "").replace(/\s+Services$/i, "");
}

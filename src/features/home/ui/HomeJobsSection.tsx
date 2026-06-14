import { useEffect, useMemo, useState } from "react";
import { getListingCategoryTree, type ListingCategoryOption } from "../../dashboard/api/listingCategoriesApi";
import { fallbackListingCategoryTree } from "../../dashboard/config/listingCategoryTree";

type JobRoleLink = {
  id: number;
  name: string;
  href: string;
};

const FEATURED_JOB_ROLE_LIMIT = 6;

export default function HomeJobsSection() {
  const [activeTab, setActiveTab] = useState<"jobseeker" | "recruiter">("jobseeker");
  const [categoryTree, setCategoryTree] = useState<ListingCategoryOption[]>(fallbackListingCategoryTree);

  useEffect(() => {
    let isActive = true;

    getListingCategoryTree()
      .then((items) => {
        if (isActive && items.length) {
          setCategoryTree(items);
        }
      })
      .catch(() => {
        if (isActive) {
          setCategoryTree(fallbackListingCategoryTree);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const jobRoleLinks = useMemo(() => {
    const roles = buildFeaturedJobRoleLinks(categoryTree);
    return roles.length ? roles : buildFeaturedJobRoleLinks(fallbackListingCategoryTree);
  }, [categoryTree]);

  return (
    <section className="chao-jobs">
      <div className="container">
        <div className="text-center jobs-header">
          <h2>Jobs</h2>
          <p className="subtitle">Trusted platform for bridging job seekers and recruiters</p>
        </div>

        <div className="row text-center jobs-stats">
          <div className="col-md-3">
            <div className="stat-box">
              <h3>50K+</h3>
              <p>Small Medium Businesses</p>
            </div>
          </div>

          <div className="col-md-3">
            <div className="stat-box">
              <h3>3K+</h3>
              <p>Staff Consulting Agencies</p>
            </div>
          </div>

          <div className="col-md-3">
            <div className="stat-box">
              <h3>200K+</h3>
              <p>Diverse Resume Database</p>
            </div>
          </div>

          <div className="col-md-3">
            <div className="stat-box">
              <h3>5K+</h3>
              <p>Live Jobs Updated</p>
            </div>
          </div>
        </div>

        <div className="jobs-tabs text-center">
          <button
            className={`tab-btn ${activeTab === "jobseeker" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("jobseeker")}
          >
            Job Seeker
          </button>

          <button
            className={`tab-btn ${activeTab === "recruiter" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("recruiter")}
          >
            Recruiters
          </button>
        </div>

        {activeTab === "jobseeker" && (
          <div id="jobseeker" className="jobs-content active">
            <p className="desc text-center">
              We connect job seekers and employers faster, saving time and effort.
            </p>

            <div className="row">
              <div className="col-md-6">
                <div className="job-box">
                  <h4>Job opportunity is waiting!</h4>
                  <p>Build your profile and receive job updates instantly</p>

                  <div className="links">
                    <a href="#">Create Profile</a>
                    <a href="#">Set Job Alert</a>
                    <a href="#">Upload Resume</a>
                  </div>
                </div>

                <div className="job-box">
                  <h4>Kickstart your career</h4>
                  <p>Explore opportunities across industries</p>

                  <div className="btns">
                    <a href="#" className="btn-outline">Register Now</a>
                    <span>OR</span>
                    <a href="#" className="btn-solid">Upload Resume</a>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="job-box">
                  <h4>Discover Jobs by Role</h4>

                  <div className="job-tags">
                    {jobRoleLinks.map((role) => (
                      <a href={role.href} key={role.id}>{role.name}</a>
                    ))}
                  </div>

                  <a href="/all-listing?category=jobs" className="view-more">View More →</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "recruiter" && (
          <div id="recruiter" className="jobs-content active">
            <p className="desc text-center">
              Hire faster with access to thousands of verified candidates.
            </p>

            <div className="row">
              <div className="col-md-6">
                <div className="job-box">
                  <h4>For HR & Agencies</h4>
                  <p>Access 200K+ resumes with advanced filters</p>
                </div>
              </div>

              <div className="col-md-6">
                <div className="job-box text-center">
                  <a href="#" className="btn-outline">Create Profile</a>
                  <a href="#" className="btn-outline">Search Resumes</a>
                  <a href="#" className="btn-solid">Post Job</a>
                </div>
              </div>
            </div>

            <p className="desc text-center">
              Recruiters and businesses can hire faster with our powerful platform and large talent pool.
            </p>

            <div className="jobs-tags text-center">
              <span>Business Analyst (3k+)</span>
              <span>Administrative Assistant (3k+)</span>
              <span>Data Analyst (2k+)</span>
              <span>Software Engineer (2k+)</span>
              <span>Cashier (1k+)</span>
              <span>Accountant (1k+)</span>
              <span>Receptionist (1k+)</span>
              <span>Software Developer (1k+)</span>
              <span>Office Assistant (1k+)</span>
              <span>Sales Associate (1k+)</span>
              <span className="highlight">Search Resumes →</span>
            </div>

            <div className="row jobs-recruiter-box">
              <div className="col-md-6">
                <div className="recruiter-left">
                  <h4>Small &amp; Medium Businesses (SMB)</h4>

                  <p>
                    Our self-service platform lets you quickly post job listings and reach up to
                    <b> 5x more qualified candidates</b>. Your listings are shared across website, app,
                    social media, and partner networks at no extra cost.
                  </p>

                  <p className="more-info">
                    To find more information <br />
                    <a href="#">Employers Hub</a>
                  </p>
                </div>
              </div>

              <div className="col-md-6">
                <div className="recruiter-right">
                  <div className="feature">
                    <h5>Post your jobs</h5>
                    <p>Easily create your business account and post jobs in minutes</p>
                  </div>

                  <div className="feature">
                    <h5>Find top applicants</h5>
                    <p>Receive 4-5X more high-quality applications instantly</p>
                  </div>

                  <div className="feature">
                    <h5>Interview candidates instantly</h5>
                    <p>Get direct contact and schedule interviews quickly</p>
                  </div>

                  <a href="#" className="btn-post-job">Post your job</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function buildFeaturedJobRoleLinks(categoryTree: ListingCategoryOption[]): JobRoleLink[] {
  const jobsCategory = categoryTree.find((category) => category.slug === "jobs" || category.name === "Jobs");
  if (!jobsCategory) {
    return [];
  }

  const subCategories = jobsCategory.subCategories || [];
  const maxDetailCount = Math.max(
    0,
    ...subCategories.map((subCategory) => subCategory.detailedCategories?.length || 0),
  );
  const roles: JobRoleLink[] = [];
  const seenRoleIds = new Set<number>();

  for (let detailIndex = 0; detailIndex < maxDetailCount && roles.length < FEATURED_JOB_ROLE_LIMIT; detailIndex += 1) {
    for (const subCategory of subCategories) {
      const role = subCategory.detailedCategories?.[detailIndex];
      if (!role || seenRoleIds.has(role.id)) {
        continue;
      }

      seenRoleIds.add(role.id);
      roles.push({
        id: role.id,
        name: role.name,
        href: buildJobRoleHref(subCategory.name, role.name),
      });

      if (roles.length >= FEATURED_JOB_ROLE_LIMIT) {
        break;
      }
    }
  }

  if (roles.length) {
    return roles;
  }

  return subCategories.slice(0, FEATURED_JOB_ROLE_LIMIT).map((subCategory) => ({
    id: subCategory.id,
    name: subCategory.name,
    href: buildJobRoleHref(subCategory.name),
  }));
}

function buildJobRoleHref(subCategory: string, detailCategory?: string) {
  const params = new URLSearchParams({ category: "jobs", subCategory });

  if (detailCategory) {
    params.set("detailCategory", detailCategory);
  }

  return `/all-listing?${params.toString()}`;
}

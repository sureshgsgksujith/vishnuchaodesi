import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { getBlogPosts, type BlogPost } from "../../blog/api/blogApi";
import {
  resolveListingImageUrl,
  setFallbackListingImage,
} from "../utils/listingImages";
import "../styles/listings.css";

export default function BlogPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getBlogPosts({ pageSize: 50 })
      .then((result) => active && setPosts(result.items))
      .catch(() => active && setPosts([]))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardLayout mainContentClassName="ud-no-rhs dashboard-listings-main">
      <div className="ud-cen dashboard-listings-page">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Blog posts</span>

        <div className="ud-cen-s2 dashboard-listings-panel">
          <div className="dashboard-listings-toolbar">
            <div className="dashboard-listings-title-block">
              <h2>Published ChaoDesi Articles</h2>
              <span>{posts.length} published articles</span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table bordered dashboard-listings-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Post Name</th>
                  <th>Module</th>
                  <th>Published Date</th>
                  <th>Views</th>
                  <th>Status</th>
                  <th>Edit</th>
                  <th>Delete</th>
                  <th>Preview</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9}>Loading blog posts...</td></tr>
                ) : posts.length ? posts.map((post, index) => (
                  <tr key={post.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="dashboard-listing-title-cell">
                        <img
                          src={resolveListingImageUrl(post.featuredImageUrl)}
                          alt={post.title}
                          onError={setFallbackListingImage}
                        />
                        <div>
                          <strong>{post.title}</strong>
                          <span className="dashboard-listing-module-badge is-blog">Blog</span>
                          <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="dashboard-listing-module-pill is-blog">Blog</span>
                      <em className="dashboard-listing-category-path">
                        {post.category || "ChaoDesi Articles"}
                      </em>
                    </td>
                    <td>{formatDate(post.publishedAt || post.createdAt)}</td>
                    <td><span className="db-list-rat">{post.viewCount ?? 0}</span></td>
                    <td>
                      <span className="db-list-ststus dashboard-listing-approved">
                        {post.status || "Published"}
                      </span>
                    </td>
                    <td><span className="db-list-edit dashboard-listing-disabled">—</span></td>
                    <td><span className="db-list-edit dashboard-listing-disabled">—</span></td>
                    <td>
                      <Link
                        to={`/blog/${post.slug}`}
                        className="db-list-edit"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Preview
                      </Link>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={9}>No published blog posts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

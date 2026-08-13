import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import DashboardSectionHeader from "../components/DashboardSectionHeader";
import { getBlogPosts, type BlogPost } from "../../blog/api/blogApi";

export default function BlogPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getBlogPosts({ pageSize: 50 }).then((result) => active && setPosts(result.items)).catch(() => active && setPosts([])).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return (
    <DashboardLayout rightRail={<DashboardRightRail />}>
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Blog posts</span>

        <div className="ud-cen-s2">
          <DashboardSectionHeader
            title="Published ChaoDesi Articles"
          />

          <table className="responsive-table bordered">
            <thead>
              <tr>
                <th>No</th>
                <th>Post Name</th>
                <th>Views</th>
                <th>Edit</th>
                <th>Delete</th>
                <th>Preview</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>{post.id}</td>
                  <td>
                    {post.title}
                    <span>{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
                  </td>
                  <td>
                    <span className="db-list-rat">{post.viewCount}</span>
                  </td>
                  <td>
                    —
                  </td>
                  <td>
                    —
                  </td>
                  <td>
                    <Link to={`/blog/${post.slug}`} className="db-list-edit" target="_blank">
                      Preview
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && !posts.length ? <tr><td colSpan={6}>No published blog posts yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import DashboardSectionHeader from "../components/DashboardSectionHeader";
import { dashboardBlogPosts } from "../mock/dashboardMockData";

export default function BlogPostsPage() {
  return (
    <DashboardLayout rightRail={<DashboardRightRail />}>
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Blog posts</span>

        <div className="ud-cen-s2">
          <DashboardSectionHeader
            title="Blog Details"
            actionLabel="Add new post"
            actionTo="/create-new-blog-post"
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
              {dashboardBlogPosts.map((post) => (
                <tr key={post.id}>
                  <td>{post.id}</td>
                  <td>
                    {post.name}
                    <span>{post.createdAt}</span>
                  </td>
                  <td>
                    <span className="db-list-rat">{post.views}</span>
                  </td>
                  <td>
                    <Link to={post.editPath} className="db-list-edit">
                      Edit
                    </Link>
                  </td>
                  <td>
                    <a
                      href="#!"
                      className="db-list-edit"
                      onClick={(event) => event.preventDefault()}
                    >
                      Delete
                    </a>
                  </td>
                  <td>
                    <Link to={post.previewPath} className="db-list-edit" target="_blank">
                      Preview
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

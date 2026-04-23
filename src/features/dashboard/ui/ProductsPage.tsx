import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import DashboardSectionHeader from "../components/DashboardSectionHeader";
import { dashboardProducts } from "../mock/dashboardMockData";

export default function ProductsPage() {
  return (
    <DashboardLayout rightRail={<DashboardRightRail />}>
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">All Products</span>

        <div className="ud-cen-s2">
          <DashboardSectionHeader
            title="Product Details"
            actionLabel="Add new Product"
            actionTo="/add-new-product"
          />

          <table className="responsive-table bordered">
            <thead>
              <tr>
                <th>No</th>
                <th>Product Name</th>
                <th>Views</th>
                <th>Status</th>
                <th>Edit</th>
                <th>Delete</th>
                <th>Preview</th>
              </tr>
            </thead>
            <tbody>
              {dashboardProducts.map((product) => (
                <tr key={product.id}>
                  <td>{product.id}</td>
                  <td>
                    <img src={product.image} alt={product.name} loading="lazy" />
                    {product.name}
                    <span>{product.createdAt}</span>
                  </td>
                  <td>
                    <span className="db-list-rat">{product.views}</span>
                  </td>
                  <td>
                    <span className="db-list-ststus">{product.status}</span>
                  </td>
                  <td>
                    <Link to={product.editPath} className="db-list-edit">
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
                    <Link to={product.previewPath} className="db-list-edit" target="_blank">
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

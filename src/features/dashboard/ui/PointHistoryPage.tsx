import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import { pointHistoryItems } from "../mock/dashboardMockData";

export default function PointHistoryPage() {
  const [items, setItems] = useState(pointHistoryItems);

  const handleDelete = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <DashboardLayout rightRail={<DashboardRightRail />}>
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Points History</span>
        <div className="ud-cen-s2">
          <h2>Points History</h2>
          <Link to="/buy-points" className="db-tit-btn">
            Buy More Points
          </Link>
          <table className="responsive-table bordered">
            <thead>
              <tr>
                <th>No</th>
                <th>Purchase date</th>
                <th>Points</th>
                <th>Total Cost</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.purchaseDate}</td>
                  <td>{item.points}</td>
                  <td>{item.totalCost}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      style={{ background: "transparent", border: 0, padding: 0 }}
                    >
                      <span className="db-list-ststus"> Delete</span>
                    </button>
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

import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import DashboardSectionHeader from "../components/DashboardSectionHeader";
import { dashboardEvents } from "../mock/dashboardMockData";

export default function EventsPage() {
  return (
    <DashboardLayout rightRail={<DashboardRightRail />}>
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">All Events</span>

        <div className="ud-cen-s2">
          <DashboardSectionHeader
            title="Event Details"
            actionLabel="Add new Event"
            actionTo="/create-new-event"
          />

          <table className="responsive-table bordered">
            <thead>
              <tr>
                <th>No</th>
                <th>Event Name</th>
                <th>Event Date</th>
                <th>Views</th>
                <th>Edit</th>
                <th>Delete</th>
                <th>Preview</th>
              </tr>
            </thead>
            <tbody>
              {dashboardEvents.map((eventItem) => (
                <tr key={eventItem.id}>
                  <td>{eventItem.id}</td>
                  <td>
                    {eventItem.name}
                    <span>{eventItem.createdAt}</span>
                  </td>
                  <td>{eventItem.eventDate}</td>
                  <td>
                    <span className="db-list-rat">{eventItem.views}</span>
                  </td>
                  <td>
                    <Link to={eventItem.editPath} className="db-list-edit">
                      Edit
                    </Link>
                  </td>
                  <td>
                    <a href={eventItem.deletePath} className="db-list-edit">
                      Delete
                    </a>
                  </td>
                  <td>
                    <Link to={eventItem.previewPath} className="db-list-edit" target="_blank">
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

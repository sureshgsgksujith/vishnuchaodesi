import { useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import DashboardSearchField from "../components/DashboardSearchField";
import { serviceBookings } from "../mock/dashboardMockData";

export default function MyServiceBookingsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBookings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return serviceBookings;
    }

    return serviceBookings.filter((booking) =>
      [
        booking.expertSlug,
        booking.enquirerName,
        booking.phone,
        booking.email,
        booking.location,
        booking.serviceDate,
        booking.serviceTime,
        booking.message,
        booking.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [searchTerm]);

  return (
    <DashboardLayout rightRail={<DashboardRightRail />}>
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">My Service Bookings</span>

        <div className="ud-cen-s2">
          <DashboardSearchField value={searchTerm} onChange={setSearchTerm} />

          <table className="responsive-table bordered" id="myTable">
            <thead>
              <tr>
                <th>No</th>
                <th>Expert Profile</th>
                <th>Enquirer Name</th>
                <th>Enquiry Details</th>
                <th>Message</th>
                <th>Status</th>
                <th>Manage</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.id}</td>
                  <td>
                    <a
                      target="_blank"
                      href="/template-17/service-experts/service-experts-profile.html"
                      rel="noreferrer"
                    >
                      <img src={booking.image} alt={booking.expertSlug} loading="lazy" />
                    </a>
                    <span>Date : {booking.createdAt}</span>
                  </td>
                  <td>{booking.enquirerName}</td>
                  <td>
                    <span>
                      <b>Phone :</b>
                      {booking.phone}
                    </span>
                    <br />
                    <span>
                      <b>Email Id :</b>
                      {booking.email}
                    </span>
                    <br />
                    <span>
                      <b>Location :</b>
                      {booking.location}
                    </span>
                    <br />
                    <span>
                      <b>Date :</b>
                      {booking.serviceDate}
                    </span>
                    <br />
                    <span>
                      <b>Time :</b>
                      {booking.serviceTime}
                    </span>
                  </td>
                  <td>{booking.message}</td>
                  <td>
                    <span className="db-list-rat">{booking.status}</span>
                  </td>
                  <td>
                    <a
                      href="#!"
                      className="db-list-edit"
                      onClick={(event) => event.preventDefault()}
                    >
                      Manage
                    </a>
                  </td>
                  <td>
                    <a
                      href="#!"
                      className="db-list-edit"
                      onClick={(event) => event.preventDefault()}
                    >
                      <span className="material-icons">delete</span>
                    </a>
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

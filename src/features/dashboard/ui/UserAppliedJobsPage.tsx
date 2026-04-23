import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import { appliedJobs } from "../mock/dashboardMockData";

export default function UserAppliedJobsPage() {
  return (
    <DashboardLayout rightRail={<DashboardRightRail />}>
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">All Applied Jobs</span>

        <div className="ud-cen-s2">
          <h2></h2>

          <table className="responsive-table bordered">
            <thead>
              <tr>
                <th>No</th>
                <th>Job Title</th>
                <th>Applied Date</th>
                <th>Preview</th>
              </tr>
            </thead>
            <tbody>
              {appliedJobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.id}</td>
                  <td>{job.title}</td>
                  <td>{job.appliedAt}</td>
                  <td>
                    <a
                      href={job.previewPath}
                      target="_blank"
                      className="db-list-edit"
                      title="View user profile page"
                      rel="noreferrer"
                    >
                      <span className="material-icons">visibility</span>
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

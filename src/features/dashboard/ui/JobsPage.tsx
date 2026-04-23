import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import DashboardSectionHeader from "../components/DashboardSectionHeader";
import { dashboardJobs } from "../mock/dashboardMockData";

export default function JobsPage() {
  return (
    <DashboardLayout rightRail={<DashboardRightRail />}>
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">All Jobs</span>

        <div className="ud-cen-s2">
          <DashboardSectionHeader
            title="Job Details"
            actionLabel="Add New Job"
            actionTo="/create-job"
          />

          <table className="responsive-table bordered">
            <thead>
              <tr>
                <th>No</th>
                <th>Job Name</th>
                <th>Job Applicants</th>
                <th>Job Applicant Profiles</th>
                <th>Views</th>
                <th>Edit</th>
                <th>Delete</th>
                <th>Preview</th>
              </tr>
            </thead>
            <tbody>
              {dashboardJobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.id}</td>
                  <td>
                    {job.name}
                    <span>{job.createdAt}</span>
                  </td>
                  <td>
                    <span className="db-list-rat">{job.applicants}</span>
                  </td>
                  <td>
                    <Link to={job.applicantProfilesPath} className="db-list-rat">
                      View profiles
                    </Link>
                  </td>
                  <td>
                    <span className="db-list-rat">{job.views}</span>
                  </td>
                  <td>
                    <Link to={job.editPath} className="db-list-edit">
                      <span className="material-icons">edit</span>
                    </Link>
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
                  <td>
                    <a
                      href={job.previewHref}
                      className="db-list-edit"
                      target="_blank"
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

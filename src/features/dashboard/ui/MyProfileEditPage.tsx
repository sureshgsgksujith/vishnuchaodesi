import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import {
  getMyProfile,
  updateMyProfile,
  type UserProfileFormValues,
  type UserProfileUploadFiles,
} from "../api/profileApi";
import { formatJoinDate } from "../utils/profileStorage";

type FileField = keyof UserProfileUploadFiles;
type PreviewField =
  | "profileImageUrl"
  | "coverImageUrl"
  | "photoIdProofUrl";

const emptyFiles: UserProfileUploadFiles = {
  profileImageFile: null,
  coverImageFile: null,
  photoIdProofFile: null,
};

export default function MyProfileEditPage() {
  const [formValues, setFormValues] = useState<UserProfileFormValues | null>(null);
  const [uploadFiles, setUploadFiles] = useState<UserProfileUploadFiles>(emptyFiles);

  const profileQuery = useQuery({
    queryKey: ["dashboard", "my-profile-edit"],
    queryFn: getMyProfile,
  });

  useEffect(() => {
    if (profileQuery.data?.profile) {
      setFormValues(profileQuery.data.profile);
    }
  }, [profileQuery.data]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      if (!formValues) {
        throw new Error("Profile form is not ready.");
      }

      return updateMyProfile(formValues, uploadFiles);
    },
    onSuccess: (result) => {
      setFormValues(result.profile);
      setUploadFiles(emptyFiles);

      if (result.persistedRemotely) {
        toast.success("Profile updated successfully.");
      } else {
        toast.success("Profile saved locally. Connect the backend endpoint to persist it.");
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile."
      );
    },
  });

  const verificationLabel = useMemo(() => {
    if (!formValues) {
      return "No";
    }

    return formValues.isEmailVerified || formValues.isMobileVerified ? "Yes" : "No";
  }, [formValues]);

  const handleValueChange =
    (field: keyof UserProfileFormValues) =>
    (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const { value } = event.target;

      setFormValues((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

  const handleFileChange =
    (fileField: FileField, previewField: PreviewField) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0] || null;

      if (!nextFile) {
        return;
      }

      const previewUrl = URL.createObjectURL(nextFile);

      setUploadFiles((prev) => ({
        ...prev,
        [fileField]: nextFile,
      }));

      setFormValues((prev) =>
        prev
          ? (() => {
              const previousPreview = prev[previewField];

              if (
                typeof previousPreview === "string" &&
                previousPreview.startsWith("blob:")
              ) {
                URL.revokeObjectURL(previousPreview);
              }

              return {
                ...prev,
                [previewField]: previewUrl,
              };
            })()
          : prev
      );
    };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    profileMutation.mutate();
  };

  if (profileQuery.isLoading || !formValues) {
    return (
      <DashboardLayout
        rightRail={<DashboardRightRail />}
        mainContentClassName="ud-no-rhs"
      >
        <div className="ud-cen">
          <div className="log-bor">&nbsp;</div>
          <span className="udb-inst">Edit User Profile</span>
          <div className="ud-cen-s2 ud-pro-edit">
            <h2>Profile Details</h2>
            <p>Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      rightRail={<DashboardRightRail />}
      mainContentClassName="ud-no-rhs"
    >
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Edit User Profile</span>

        <div className="ud-cen-s2 ud-pro-edit">
          <h2>Profile Details</h2>

          {!profileQuery.data?.loadedFromApi ? (
            <p className="text-muted" style={{ marginBottom: 20 }}>
              API profile endpoint is not available yet. This screen is using local
              fallback data and will switch to backend data when the endpoint is ready.
            </p>
          ) : null}

          <form onSubmit={handleSubmit}>
            <table className="responsive-table bordered">
              <tbody>
                <tr>
                  <td>Name</td>
                  <td>{formValues.fullName}</td>
                </tr>
                <tr>
                  <td>Email Id</td>
                  <td>{formValues.email || "-"}</td>
                </tr>
                <tr>
                  <td>Profile Password</td>
                  <td>
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-control"
                        name="password"
                        placeholder="Change password"
                        value={formValues.password}
                        onChange={handleValueChange("password")}
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>Mobile Number</td>
                  <td>
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-control"
                        name="mobileNumber"
                        value={formValues.mobileNumber}
                        onChange={handleValueChange("mobileNumber")}
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>Profile Picture</td>
                  <td>
                    <div className="form-group">
                      <div className="img-uplo-flex">
                        <input
                          type="file"
                          accept="image/*,.jpg,.jpeg,.png"
                          className="form-control file-input"
                          onChange={handleFileChange(
                            "profileImageFile",
                            "profileImageUrl"
                          )}
                        />
                        {formValues.profileImageUrl ? (
                          <img
                            className="img-preview"
                            alt="Profile preview"
                            src={formValues.profileImageUrl}
                          />
                        ) : (
                          <img className="img-preview" alt="" />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>Profile Cover Image</td>
                  <td>
                    <div className="form-group">
                      <div className="img-uplo-flex">
                        <input
                          type="file"
                          accept="image/*,.jpg,.jpeg,.png"
                          className="form-control file-input"
                          onChange={handleFileChange(
                            "coverImageFile",
                            "coverImageUrl"
                          )}
                        />
                        {formValues.coverImageUrl ? (
                          <img
                            className="img-preview"
                            alt="Cover preview"
                            src={formValues.coverImageUrl}
                          />
                        ) : (
                          <img className="img-preview" alt="" />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>Photo ID Proof</td>
                  <td>
                    <div className="form-group">
                      <div className="img-uplo-flex">
                        <input
                          type="file"
                          accept="image/*,.jpg,.jpeg,.png"
                          className="form-control file-input"
                          onChange={handleFileChange(
                            "photoIdProofFile",
                            "photoIdProofUrl"
                          )}
                        />
                        {formValues.photoIdProofUrl ? (
                          <img
                            className="img-preview"
                            alt="Photo ID preview"
                            src={formValues.photoIdProofUrl}
                          />
                        ) : (
                          <img className="img-preview" alt="" />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>City</td>
                  <td>
                    <div className="form-group">
                      <input
                        type="text"
                        className="autocomplete form-control"
                        name="city"
                        value={formValues.city}
                        onChange={handleValueChange("city")}
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>Join date</td>
                  <td>{formatJoinDate(formValues.createdAt).replace("Join on ", "")}</td>
                </tr>
                <tr>
                  <td>Verified</td>
                  <td>{verificationLabel}</td>
                </tr>
                <tr>
                  <td>Premium service provider</td>
                  <td>{formValues.isPremiumServiceProvider ? "Yes" : "No"}</td>
                </tr>
                <tr>
                  <td>Facebook</td>
                  <td>
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-control"
                        name="facebookUrl"
                        value={formValues.facebookUrl}
                        onChange={handleValueChange("facebookUrl")}
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>Twitter</td>
                  <td>
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-control"
                        name="twitterUrl"
                        value={formValues.twitterUrl}
                        onChange={handleValueChange("twitterUrl")}
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>Youtube</td>
                  <td>
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-control"
                        name="youtubeUrl"
                        value={formValues.youtubeUrl}
                        onChange={handleValueChange("youtubeUrl")}
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>Website</td>
                  <td>
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-control"
                        name="websiteUrl"
                        value={formValues.websiteUrl}
                        onChange={handleValueChange("websiteUrl")}
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <button
                      type="submit"
                      name="profile_update_submit"
                      className="db-pro-bot-btn"
                      disabled={profileMutation.isPending}
                    >
                      {profileMutation.isPending ? "Saving..." : "Save Changes"}
                    </button>
                    <Link
                      to="/dashboard/payment"
                      className="db-pro-bot-btn"
                      style={{ marginLeft: 4 }}
                    >
                      Upgrade
                    </Link>
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

import { apiClient } from "../../../shared/api/client";
import {
  readStoredProfileSnapshot,
  type StoredProfileSnapshot,
  writeStoredProfileSnapshot,
} from "../utils/profileStorage";

const profileReadPath =
  import.meta.env.VITE_PROFILE_READ_PATH || "/UserProfile/me";
const profileUpdatePath =
  import.meta.env.VITE_PROFILE_UPDATE_PATH || profileReadPath;

export type UserProfileFormValues = {
  fullName: string;
  email: string;
  password: string;
  mobileNumber: string;
  country: string;
  state: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  zipCode: string;
  facebookUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  websiteUrl: string;
  profileImageUrl: string;
  coverImageUrl: string;
  photoIdProofUrl: string;
  createdAt: string;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  isPremiumServiceProvider: boolean;
  profileExpiryDate: string;
};

export type UserProfileUploadFiles = {
  profileImageFile?: File | null;
  coverImageFile?: File | null;
  photoIdProofFile?: File | null;
};

export type ProfileLoadResult = {
  profile: UserProfileFormValues;
  loadedFromApi: boolean;
};

export type ProfileSaveResult = {
  profile: UserProfileFormValues;
  persistedRemotely: boolean;
};

function createDefaultProfile(): UserProfileFormValues {
  const snapshot = readStoredProfileSnapshot();

  return {
    fullName:
      snapshot?.fullName ||
      localStorage.getItem("fullName") ||
      localStorage.getItem("customer_name") ||
      "Rn53",
    email: snapshot?.email || "",
    password: "",
    mobileNumber: snapshot?.mobileNumber || "",
    country: snapshot?.country || "",
    state: snapshot?.state || "",
    city: snapshot?.city || "",
    addressLine1: snapshot?.addressLine1 || "",
    addressLine2: snapshot?.addressLine2 || "",
    zipCode: snapshot?.zipCode || "",
    facebookUrl: snapshot?.facebookUrl || "",
    twitterUrl: snapshot?.twitterUrl || "",
    youtubeUrl: snapshot?.youtubeUrl || "",
    websiteUrl: snapshot?.websiteUrl || "",
    profileImageUrl:
      snapshot?.profileImageUrl || "/template-17/images/user/1.jpg",
    coverImageUrl:
      snapshot?.coverImageUrl || "/template-17/images/home/banner.jpg",
    photoIdProofUrl:
      snapshot?.photoIdProofUrl || "/template-17/images/icon/11.png",
    createdAt: snapshot?.createdAt || "",
    isEmailVerified: Boolean(snapshot?.isEmailVerified),
    isMobileVerified: Boolean(snapshot?.isMobileVerified),
    isPremiumServiceProvider: Boolean(snapshot?.isPremiumServiceProvider),
    profileExpiryDate: snapshot?.profileExpiryDate || "",
  };
}

function snapshotFromProfile(profile: UserProfileFormValues): StoredProfileSnapshot {
  return {
    fullName: profile.fullName,
    email: profile.email,
    mobileNumber: profile.mobileNumber,
    country: profile.country,
    state: profile.state,
    city: profile.city,
    addressLine1: profile.addressLine1,
    addressLine2: profile.addressLine2,
    zipCode: profile.zipCode,
    facebookUrl: profile.facebookUrl,
    twitterUrl: profile.twitterUrl,
    youtubeUrl: profile.youtubeUrl,
    websiteUrl: profile.websiteUrl,
    profileImageUrl: profile.profileImageUrl,
    coverImageUrl: profile.coverImageUrl,
    photoIdProofUrl: profile.photoIdProofUrl,
    createdAt: profile.createdAt,
    isEmailVerified: profile.isEmailVerified,
    isMobileVerified: profile.isMobileVerified,
    isPremiumServiceProvider: profile.isPremiumServiceProvider,
    profileExpiryDate: profile.profileExpiryDate,
  };
}

function normalizeProfilePayload(raw: unknown): UserProfileFormValues {
  const fallback = createDefaultProfile();
  const payload = ((raw as { data?: unknown } | null)?.data ?? raw) as
    | Record<string, unknown>
    | undefined;

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const user =
    ((payload.user ?? payload.User) as Record<string, unknown> | undefined) ||
    payload;
  const profile =
    ((payload.userProfile ??
      payload.profile ??
      payload.UserProfile) as Record<string, unknown> | undefined) ||
    payload;

  const getString = (...values: unknown[]) =>
    values.find((value) => typeof value === "string" && value.trim() !== "") as
      | string
      | undefined;
  const getBoolean = (...values: unknown[]) =>
    values.find((value) => typeof value === "boolean") as boolean | undefined;

  return {
    fullName:
      getString(user.fullName, payload.fullName, fallback.fullName) ||
      fallback.fullName,
    email: getString(user.email, payload.email, fallback.email) || "",
    password: "",
    mobileNumber:
      getString(user.mobileNumber, payload.mobileNumber, fallback.mobileNumber) ||
      "",
    country: getString(profile.country, payload.country, fallback.country) || "",
    state: getString(profile.state, payload.state, fallback.state) || "",
    city: getString(profile.city, payload.city, fallback.city) || "",
    addressLine1:
      getString(profile.addressLine1, payload.addressLine1, fallback.addressLine1) ||
      "",
    addressLine2:
      getString(profile.addressLine2, payload.addressLine2, fallback.addressLine2) ||
      "",
    zipCode:
      getString(profile.zipCode, payload.zipCode, fallback.zipCode) || "",
    facebookUrl:
      getString(profile.facebookUrl, payload.facebookUrl, fallback.facebookUrl) ||
      "",
    twitterUrl:
      getString(profile.twitterUrl, payload.twitterUrl, fallback.twitterUrl) ||
      "",
    youtubeUrl:
      getString(profile.youtubeUrl, payload.youtubeUrl, fallback.youtubeUrl) ||
      "",
    websiteUrl:
      getString(profile.websiteUrl, payload.websiteUrl, fallback.websiteUrl) ||
      "",
    profileImageUrl:
      getString(
        profile.profileImageUrl,
        payload.profileImageUrl,
        user.profileImageUrl,
        fallback.profileImageUrl
      ) || fallback.profileImageUrl,
    coverImageUrl:
      getString(
        profile.coverImageUrl,
        payload.coverImageUrl,
        payload.coverPhotoUrl,
        fallback.coverImageUrl
      ) || fallback.coverImageUrl,
    photoIdProofUrl:
      getString(
        profile.photoIdProofUrl,
        payload.photoIdProofUrl,
        fallback.photoIdProofUrl
      ) || fallback.photoIdProofUrl,
    createdAt:
      getString(user.createdAt, payload.createdAt, fallback.createdAt) || "",
    isEmailVerified:
      getBoolean(
        user.isEmailVerified,
        payload.isEmailVerified,
        fallback.isEmailVerified
      ) || false,
    isMobileVerified:
      getBoolean(
        user.isMobileVerified,
        payload.isMobileVerified,
        fallback.isMobileVerified
      ) || false,
    isPremiumServiceProvider:
      getBoolean(
        profile.isPremiumServiceProvider,
        payload.isPremiumServiceProvider,
        fallback.isPremiumServiceProvider
      ) || false,
    profileExpiryDate:
      getString(
        profile.profileExpiryDate,
        payload.profileExpiryDate,
        fallback.profileExpiryDate
      ) || "",
  };
}

function isLocalFallbackError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response
  ) {
    const status = Number(error.response.status);
    return status === 404 || status === 405 || status >= 500;
  }

  return true;
}

export async function getMyProfile(): Promise<ProfileLoadResult> {
  try {
    const response = await apiClient.get(profileReadPath);
    const profile = normalizeProfilePayload(response.data);
    writeStoredProfileSnapshot(snapshotFromProfile(profile));

    return {
      profile,
      loadedFromApi: true,
    };
  } catch (error) {
    const localProfile = createDefaultProfile();

    if (!isLocalFallbackError(error)) {
      throw error;
    }

    return {
      profile: localProfile,
      loadedFromApi: false,
    };
  }
}

export async function updateMyProfile(
  values: UserProfileFormValues,
  files: UserProfileUploadFiles
): Promise<ProfileSaveResult> {
  const formData = new FormData();

  formData.append("fullName", values.fullName);
  formData.append("email", values.email);
  formData.append("mobileNumber", values.mobileNumber);
  formData.append("country", values.country);
  formData.append("state", values.state);
  formData.append("city", values.city);
  formData.append("addressLine1", values.addressLine1);
  formData.append("addressLine2", values.addressLine2);
  formData.append("zipCode", values.zipCode);
  formData.append("facebookUrl", values.facebookUrl);
  formData.append("twitterUrl", values.twitterUrl);
  formData.append("youtubeUrl", values.youtubeUrl);
  formData.append("websiteUrl", values.websiteUrl);
  formData.append(
    "isPremiumServiceProvider",
    String(values.isPremiumServiceProvider)
  );

  if (values.password.trim()) {
    formData.append("password", values.password.trim());
  }

  if (files.profileImageFile) {
    formData.append("profileImageFile", files.profileImageFile);
  }

  if (files.coverImageFile) {
    formData.append("coverImageFile", files.coverImageFile);
  }

  if (files.photoIdProofFile) {
    formData.append("photoIdProofFile", files.photoIdProofFile);
  }

  try {
    const response = await apiClient.put(profileUpdatePath, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const profile = normalizeProfilePayload(response.data);
    writeStoredProfileSnapshot(snapshotFromProfile(profile));

    return {
      profile,
      persistedRemotely: true,
    };
  } catch (error) {
    if (!isLocalFallbackError(error)) {
      throw error;
    }

    const fallbackProfile = {
      ...values,
      password: "",
    };

    writeStoredProfileSnapshot(snapshotFromProfile(fallbackProfile));

    return {
      profile: fallbackProfile,
      persistedRemotely: false,
    };
  }
}

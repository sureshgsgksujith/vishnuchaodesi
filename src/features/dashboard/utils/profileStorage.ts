export const PROFILE_SNAPSHOT_STORAGE_KEY = "customer_profile_snapshot";
export const PROFILE_UPDATED_EVENT = "chaodesi:profile-updated";

export type StoredProfileSnapshot = {
  fullName?: string;
  email?: string;
  mobileNumber?: string;
  country?: string;
  state?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  zipCode?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  websiteUrl?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  photoIdProofUrl?: string;
  createdAt?: string;
  isEmailVerified?: boolean;
  isMobileVerified?: boolean;
  isPremiumServiceProvider?: boolean;
  profileExpiryDate?: string;
};

const defaultProfileImage = "/template-17/images/user/1.jpg";

export function readStoredProfileSnapshot(): StoredProfileSnapshot | null {
  const rawValue = localStorage.getItem(PROFILE_SNAPSHOT_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredProfileSnapshot;
  } catch {
    return null;
  }
}

export function writeStoredProfileSnapshot(snapshot: StoredProfileSnapshot) {
  localStorage.setItem(PROFILE_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));

  if (snapshot.fullName) {
    localStorage.setItem("fullName", snapshot.fullName);
  }

  if (snapshot.profileImageUrl) {
    localStorage.setItem("profileImageUrl", snapshot.profileImageUrl);
  }

  emitProfileUpdated();
}

export function clearStoredProfileSnapshot() {
  localStorage.removeItem(PROFILE_SNAPSHOT_STORAGE_KEY);
  localStorage.removeItem("profileImageUrl");
}

export function emitProfileUpdated() {
  window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
}

export function formatJoinDate(createdAt?: string | null) {
  if (!createdAt) {
    return "Join on 17, Apr 2026";
  }

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Join on 17, Apr 2026";
  }

  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

  return `Join on ${formatted}`;
}

export function getStoredDashboardIdentity() {
  const snapshot = readStoredProfileSnapshot();

  return {
    fullName:
      snapshot?.fullName ||
      localStorage.getItem("fullName") ||
      localStorage.getItem("customer_name") ||
      "Ajay",
    profileImageUrl:
      snapshot?.profileImageUrl ||
      localStorage.getItem("profileImageUrl") ||
      defaultProfileImage,
    joinDate: formatJoinDate(snapshot?.createdAt),
  };
}

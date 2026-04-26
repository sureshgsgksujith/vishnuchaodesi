export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  appName: import.meta.env.VITE_APP_NAME || "ChaoDesi Customer",
  mapsApiBaseUrl: import.meta.env.VITE_MAPS_API_BASE_URL || "https://maps.mapthrust.io/maps/api",
  mapsApiKey: import.meta.env.VITE_MAPS_API_KEY || "",
  useDynamicPages: import.meta.env.VITE_USE_DYNAMIC_PAGES === "true",
};

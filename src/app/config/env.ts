export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  appName: import.meta.env.VITE_APP_NAME || "ChaoDesi Customer",
  useDynamicPages: import.meta.env.VITE_USE_DYNAMIC_PAGES === "true",
};
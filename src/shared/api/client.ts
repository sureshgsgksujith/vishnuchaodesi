import axios from "axios";
import { env } from "../../app/config/env";
import {
  getCustomerToken,
  isCustomerTokenExpired,
  redirectToCustomerHomeAfterSessionPopup,
} from "../../features/auth/utils/customerSession";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || env.apiBaseUrl,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getCustomerToken();

  if (token && isCustomerTokenExpired(token)) {
    redirectToCustomerHomeAfterSessionPopup();
    return Promise.reject(new Error("Customer session expired."));
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      redirectToCustomerHomeAfterSessionPopup();
    }

    return Promise.reject(error);
  },
);

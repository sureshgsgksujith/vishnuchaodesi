import axios from "axios";
import { env } from "../../app/config/env";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || env.apiBaseUrl,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") || localStorage.getItem("customer_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

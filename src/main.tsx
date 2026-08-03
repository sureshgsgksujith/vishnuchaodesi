import "./shared/styles/reset.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { Provider } from "react-redux";
import App from "./app/App";
import { store } from "./store/rootStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
const rootElement = document.getElementById("root") ?? createRootElement();

normalizeLegacyBrowserUrl();

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster position="top-right" />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);

function createRootElement() {
  const element = document.createElement("div");
  element.id = "root";
  document.body.appendChild(element);
  return element;
}

function normalizeLegacyBrowserUrl() {
  const { pathname, search, hash } = window.location;
  const searchParams = new URLSearchParams(search);
  const recoveredSpaPath = searchParams.get("__spa");
  const legacyRoute = hash.startsWith("#/") ? hash.slice(1) : "";

  if (recoveredSpaPath) {
    searchParams.delete("__spa");
    const recoveredPath = `/${recoveredSpaPath.replace(/^\/+/, "")}`;
    const recoveredSearch = searchParams.toString();
    window.history.replaceState(
      null,
      "",
      `${recoveredPath}${recoveredSearch ? `?${recoveredSearch}` : ""}${hash}`,
    );
    return;
  }

  if (legacyRoute) {
    window.history.replaceState(null, "", `${legacyRoute}${search}`);
    return;
  }

  if (/\/index\.html$/i.test(pathname)) {
    const cleanPath = pathname.replace(/\/index\.html$/i, "") || "/";
    window.history.replaceState(null, "", `${cleanPath}${search}${hash}`);
  }
}

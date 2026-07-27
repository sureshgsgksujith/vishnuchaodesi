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

// Keep old bookmarked hash URLs working, but immediately replace them with
// the clean history-router equivalent.
if (window.location.hash.startsWith("#/")) {
  const legacyRoute = window.location.hash.slice(1);
  window.history.replaceState(null, "", legacyRoute);
}

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

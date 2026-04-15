import { Routes, Route } from "react-router-dom";
import LoginPage from "../../features/auth/ui/LoginPage";
import HomePage from "../../features/home/ui/HomePage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<HomePage />} />
    </Routes>
  );
}
import { env } from "../config/env";
import StaticTemplatePage from "../../features/template/ui/StaticTemplatePage";

import HomePage from "../../features/home/ui/HomePage";
import LoginPage from "../../features/auth/ui/LoginPage";
import RegisterPage from "../../features/auth/ui/RegisterPage";
import ForgotPasswordPage from "../../features/auth/ui/ForgotPasswordPage";

type PageKey = "home" | "login" | "register" | "forgotPassword";

export function getCustomerPage(page: PageKey) {
  if (env.useDynamicPages) {
    switch (page) {
      case "home":
        return <HomePage />;
      case "login":
        return <LoginPage />;
      case "register":
        return <RegisterPage />;
      case "forgotPassword":
        return <ForgotPasswordPage />;
      default:
        return <HomePage />;
    }
  }

  switch (page) {
    case "home":
      return <StaticTemplatePage src="/template-16/index.html" title="Home" />;
    case "login":
      return <StaticTemplatePage src="/template-16/login.html" title="Login" />;
    case "register":
      return <StaticTemplatePage src="/template-16/login.html?login=register" title="Register" />;
    case "forgotPassword":
      return <StaticTemplatePage src="/template-16/login.html" title="Forgot Password" />;
    default:
      return <StaticTemplatePage src="/template-16/index.html" title="Home" />;
  }
}
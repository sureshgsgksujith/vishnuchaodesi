import { useEffect } from "react";
import type { ReactNode } from "react";
import HomeHeader from "../../home/ui/HomeHeader";
import HomeListBusinessSection from "../../home/ui/HomeListBusinessSection";
import HomeFooterSection from "../../home/ui/HomeFooterSection";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  useEffect(() => {
    const cssFiles = [
      "/template-17/css/jquery-ui.css",
      "/template-17/css/bootstrap.css",
      "/template-17/css/theme-color.css",
      "/template-17/css/style.css",
      "/template-17/css/fonts.css",
      "/template-17/css/custom.css",
    ];

    cssFiles.forEach((href) => {
      const existing = document.querySelector(`link[href="${href}"]`);
      if (!existing) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
      }
    });
  }, []);

  return (
    <>
      <section>
        <div className="str ind2-home">
          <HomeHeader />
        </div>
      </section>

      {children}

      <HomeListBusinessSection />
      <HomeFooterSection />
    </>
  );
}
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { customerTemplateRoutes } from "../../../app/router/customerTemplateRoutes";
import { isCustomerAuthenticated } from "../../auth/utils/customerSession";
import HomeHeader from "../../home/ui/HomeHeader";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import { useLogoNavigationTarget } from "../../../shared/navigation/logoTarget";

type StaticTemplatePageProps = {
  src: string;
  title: string;
};

const templateRouteBySrc = customerTemplateRoutes.reduce((routeMap, route) => {
  const [srcPath] = route.src.split("?");

  routeMap.set(route.src, route.path);
  if (!route.src.includes("?")) {
    routeMap.set(srcPath, route.path);
  }
  return routeMap;
}, new Map<string, string>());

function isLogoAnchor(anchor: HTMLAnchorElement) {
  return (
    anchor.classList.contains("top-log") ||
    Boolean(anchor.querySelector(".ic-logo")) ||
    Boolean(anchor.querySelector('img[src*="logo-"]'))
  );
}

function getTemplateRoute(url: URL) {
  const exactRoute = templateRouteBySrc.get(`${url.pathname}${url.search}`);

  if (exactRoute) {
    return exactRoute;
  }

  const baseRoute = templateRouteBySrc.get(url.pathname);

  if (baseRoute) {
    return `${baseRoute}${url.search}`;
  }

  return "";
}

function resolveFrameRoute(
  anchor: HTMLAnchorElement,
  frameUrl: string,
  logoTarget: string
) {
  const href = anchor.getAttribute("href")?.trim();

  if (!href || href === "#" || anchor.hasAttribute("download")) {
    return "";
  }

  if (/^(mailto|tel|javascript):/i.test(href)) {
    return "";
  }

  if (isLogoAnchor(anchor)) {
    return logoTarget;
  }

  const url = new URL(href, frameUrl);

  if (url.origin !== window.location.origin) {
    return "";
  }

  const templateRoute = getTemplateRoute(url);

  if (templateRoute) {
    return `${templateRoute}${url.hash}`;
  }

  if (!url.pathname.startsWith("/template-17/") && !url.pathname.includes(".")) {
    return `${url.pathname}${url.search}${url.hash}`;
  }

  return "";
}

export default function StaticTemplatePage({
  src,
  title,
}: StaticTemplatePageProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const logoTarget = useLogoNavigationTarget();
  const [isAuthenticated, setIsAuthenticated] = useState(isCustomerAuthenticated);

  useEffect(() => {
    setIsAuthenticated(isCustomerAuthenticated());
  }, [src]);

  useEffect(() => {
    const iframe = iframeRef.current;
    let detachDocumentClick: () => void = () => undefined;

    if (!iframe) {
      return detachDocumentClick;
    }

    const attachDocumentClick = () => {
      detachDocumentClick();

      const frameWindow = iframe.contentWindow;
      const frameDocument = iframe.contentDocument;

      if (!frameWindow || !frameDocument) {
        return;
      }

      const frameUrl = frameWindow.location.href;
      const anchors = Array.from(frameDocument.querySelectorAll("a"));
      const existingStyle = frameDocument.querySelector(
        "style[data-chaodesi-shell-header]"
      );

      if (!existingStyle) {
        const style = frameDocument.createElement("style");
        style.setAttribute("data-chaodesi-shell-header", "true");
        style.textContent = ".hom-top{display:none!important;}.btn-ser-need-ani,.ani-quo-form{display:none!important;}";
        frameDocument.head.appendChild(style);
      }

      anchors.forEach((anchor) => {
        const route = resolveFrameRoute(anchor, frameUrl, logoTarget);

        if (route) {
          anchor.setAttribute("href", route);
        }
      });

      const handleClick = (event: MouseEvent) => {
        if (
          event.button !== 0 ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey
        ) {
          return;
        }

        const target = event.target;

        if (!(target instanceof Element)) {
          return;
        }

        const anchor = target.closest("a");

        if (!(anchor instanceof HTMLAnchorElement)) {
          return;
        }

        const route = resolveFrameRoute(anchor, frameUrl, logoTarget);

        if (!route) {
          return;
        }

        event.preventDefault();
        navigate(route);
      };

      frameDocument.addEventListener("click", handleClick, true);
      detachDocumentClick = () =>
        frameDocument.removeEventListener("click", handleClick, true);
    };

    iframe.addEventListener("load", attachDocumentClick);

    try {
      attachDocumentClick();
    } catch {
      detachDocumentClick = () => undefined;
    }

    return () => {
      iframe.removeEventListener("load", attachDocumentClick);
      detachDocumentClick();
    };
  }, [logoTarget, navigate, src]);

  return (
    <>
      {isAuthenticated ? <UserHomeHeader /> : <HomeHeader />}

      <div
        style={{
          width: "100%",
          height: "100vh",
          margin: 0,
          padding: 0,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
        />
      </div>
    </>
  );
}

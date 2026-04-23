const templateScriptSources = [
  "/template-17/js/jquery.min.js",
  "/template-17/js/popper.min.js",
  "/template-17/js/bootstrap.min.js",
  "/template-17/js/blazy.min.js",
  "/template-17/js/slick.js",
  "/template-17/js/custom.js",
  "/template-17/js/jquery.validate.min.js",
];

let templateScriptsPromise: Promise<void> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-template-script="${src}"]`
    );

    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load script: ${src}`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.templateScript = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };

    document.body.appendChild(script);
  });
}

export function ensureTemplateScriptsLoaded() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if ((window as Window & { $?: unknown }).$) {
    return Promise.resolve();
  }

  if (!templateScriptsPromise) {
    templateScriptsPromise = templateScriptSources.reduce(
      (promise, src) => promise.then(() => loadScript(src)),
      Promise.resolve()
    );
  }

  return templateScriptsPromise;
}

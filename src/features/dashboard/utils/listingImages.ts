import type React from "react";
import { env } from "../../../app/config/env";

const fallbackListingImageUrl = "/template-17/images/listings/1.jpeg";

function getApiOrigin() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || env.apiBaseUrl;

  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return "";
  }
}

export function resolveListingImageUrl(value?: string | null) {
  const imageUrl = value?.trim();

  if (!imageUrl) {
    return fallbackListingImageUrl;
  }

  const generatedCategoryImage = buildGeneratedCategoryImageDataUrl(imageUrl);

  if (generatedCategoryImage) {
    return generatedCategoryImage;
  }

  if (imageUrl.startsWith("/uploads/")) {
    const apiOrigin = getApiOrigin();
    return apiOrigin ? `${apiOrigin}${imageUrl}` : imageUrl;
  }

  if (
    imageUrl.startsWith("/") ||
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:") ||
    imageUrl.startsWith("blob:")
  ) {
    return imageUrl;
  }

  return `/template-17/images/listings/${imageUrl}`;
}

function buildGeneratedCategoryImageDataUrl(value: string) {
  const normalizedValue = value.startsWith("/") ? value : `/${value}`;
  const match = normalizedValue.match(/^\/uploads\/listing-categories\/defaults\/([a-z0-9-]+)\.svg$/i);

  if (!match) {
    return "";
  }

  const slug = match[1].toLowerCase();
  const title = slug
    .split("-")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
  const [primary, secondary, accent] = getGeneratedCategoryPalette(slug);
  const motif = getGeneratedCategoryMotif(slug, accent);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${primary}"/>
          <stop offset="100%" stop-color="${secondary}"/>
        </linearGradient>
      </defs>
      <rect width="640" height="420" rx="34" fill="url(#bg)"/>
      <circle cx="530" cy="70" r="150" fill="#fff" opacity=".18"/>
      <path d="M0 318 C126 250 210 390 344 318 C462 254 540 270 640 218 L640 420 L0 420 Z" fill="#fff" opacity=".16"/>
      <rect x="382" y="72" width="176" height="176" rx="34" fill="#fff" opacity=".92"/>
      ${motif}
      <text x="54" y="246" fill="#fff" font-family="Arial, sans-serif" font-size="44" font-weight="800">${escapeSvgText(title).slice(0, 24)}</text>
      <text x="56" y="288" fill="#fff" opacity=".88" font-family="Arial, sans-serif" font-size="24" font-weight="600">${escapeSvgText(getGeneratedCategorySubtitle(slug))}</text>
      <rect x="56" y="316" width="168" height="8" rx="4" fill="#fff" opacity=".45"/>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getGeneratedCategoryPalette(slug: string) {
  const palettes = [
    ["#0f766e", "#2563eb", "#f59e0b"],
    ["#b91c1c", "#f97316", "#0ea5e9"],
    ["#1d4ed8", "#7c3aed", "#22c55e"],
    ["#047857", "#84cc16", "#f97316"],
    ["#be123c", "#9333ea", "#fde047"],
    ["#0369a1", "#0891b2", "#fb7185"],
    ["#4338ca", "#0f172a", "#38bdf8"],
    ["#a16207", "#dc2626", "#22c55e"],
  ];
  const index = Array.from(slug).reduce((sum, character) => sum + character.charCodeAt(0), 0) % palettes.length;
  return palettes[index];
}

function getGeneratedCategorySubtitle(slug: string) {
  if (containsAny(slug, ["restaurant", "food", "cafe", "kitchen", "catering"])) return "Food and dining";
  if (containsAny(slug, ["vehicle", "car", "bike", "truck", "boat", "auto"])) return "Vehicles and mobility";
  if (containsAny(slug, ["estate", "rent", "sale", "apartment", "house", "villa", "room"])) return "Property listings";
  if (containsAny(slug, ["care", "nurse", "health", "baby", "senior"])) return "Care and support";
  if (containsAny(slug, ["event", "ticket", "concert", "festival"])) return "Events and tickets";
  if (containsAny(slug, ["job", "career", "service"])) return "Work and services";
  if (containsAny(slug, ["phone", "laptop", "tv", "camera", "electronic", "appliance"])) return "Electronics and appliances";
  if (containsAny(slug, ["pet", "dog", "cat", "bird", "fish"])) return "Pets and animals";
  return "Local classifieds";
}

function getGeneratedCategoryMotif(slug: string, accent: string) {
  if (containsAny(slug, ["restaurant", "food", "cafe", "kitchen", "catering"])) {
    return `<circle cx="471" cy="158" r="34" fill="none" stroke="${accent}" stroke-width="12"/><path d="M524 108 L524 208 M508 108 L508 148 M540 108 L540 148" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>`;
  }
  if (containsAny(slug, ["vehicle", "car", "bike", "truck", "boat", "auto"])) {
    return `<path d="M424 170 L445 136 H500 L524 170" fill="none" stroke="${accent}" stroke-width="10" stroke-linejoin="round"/><circle cx="436" cy="205" r="18" fill="none" stroke="${accent}" stroke-width="10"/><circle cx="522" cy="205" r="18" fill="none" stroke="${accent}" stroke-width="10"/>`;
  }
  if (containsAny(slug, ["estate", "rent", "sale", "apartment", "house", "villa", "room"])) {
    return `<path d="M414 168 L471 116 L530 168" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M430 164 V216 H514 V164" fill="${accent}" opacity=".2" stroke="${accent}" stroke-width="10" stroke-linejoin="round"/>`;
  }
  if (containsAny(slug, ["care", "nurse", "health", "baby", "senior"])) {
    return `<path d="M471 211 C412 176 409 128 440 115 C457 108 471 121 471 121 C471 121 486 108 503 115 C534 128 531 176 471 211 Z" fill="${accent}" opacity=".28" stroke="${accent}" stroke-width="10" stroke-linejoin="round"/>`;
  }
  if (containsAny(slug, ["event", "ticket", "concert", "festival"])) {
    return `<path d="M417 132 H527 V208 H417 Z" fill="${accent}" opacity=".22" stroke="${accent}" stroke-width="10" stroke-linejoin="round"/><path d="M444 132 V208 M500 132 V208" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (containsAny(slug, ["job", "career", "service"])) {
    return `<rect x="416" y="146" width="112" height="72" rx="14" fill="${accent}" opacity=".22" stroke="${accent}" stroke-width="10"/><path d="M452 146 V128 H492 V146 M416 176 H528" stroke="${accent}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (containsAny(slug, ["phone", "laptop", "tv", "camera", "electronic", "appliance"])) {
    return `<rect x="420" y="122" width="104" height="78" rx="12" fill="${accent}" opacity=".22" stroke="${accent}" stroke-width="10"/><path d="M450 220 H494 M472 200 V220" stroke="${accent}" stroke-width="9" stroke-linecap="round"/>`;
  }
  if (containsAny(slug, ["pet", "dog", "cat", "bird", "fish"])) {
    return `<circle cx="445" cy="142" r="16" fill="${accent}" opacity=".32"/><circle cx="498" cy="142" r="16" fill="${accent}" opacity=".32"/><circle cx="421" cy="181" r="15" fill="${accent}" opacity=".32"/><circle cx="522" cy="181" r="15" fill="${accent}" opacity=".32"/><path d="M471 164 C502 164 517 216 471 216 C426 216 440 164 471 164 Z" fill="${accent}" opacity=".32"/>`;
  }
  return `<rect x="420" y="120" width="44" height="44" rx="10" fill="${accent}" opacity=".28"/><rect x="480" y="120" width="44" height="44" rx="10" fill="${accent}" opacity=".28"/><rect x="420" y="180" width="44" height="44" rx="10" fill="${accent}" opacity=".28"/><rect x="480" y="180" width="44" height="44" rx="10" fill="${accent}" opacity=".28"/>`;
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function escapeSvgText(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;",
  }[character] || character));
}

export function setFallbackListingImage(event: React.SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.src.endsWith(fallbackListingImageUrl)) {
    return;
  }

  event.currentTarget.src = fallbackListingImageUrl;
}

import type { Language, Product, StoreData, Translatable } from "../types";
import { hebrew } from "./he";

export type TranslationValues = Record<string, string | number>;
export function translator(language: Language) {
  return (source: string, values: TranslationValues = {}) => {
    const key = source.replace(/\s+/g, " ").trim();
    const translated =
      language === "he" && hebrew[key]
        ? source.match(/^\s*/)?.[0] + hebrew[key] + source.match(/\s*$/)?.[0]
        : source;
    return translated.replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.prototype.hasOwnProperty.call(values, name)
        ? String(values[name])
        : match,
    );
  };
}
const textFields = {
  products: ["name", "description", "shortDescription"],
  categories: ["name", "description"],
  banners: ["title", "description", "eyebrow", "button"],
  reviews: ["caption"],
  settings: [
    "name",
    "announcement",
    "contact",
    "about",
    "deliveryAreas",
    "promoTitle",
    "promoText",
  ],
} as const;
function localized<T extends Translatable>(
  record: T,
  fields: readonly string[],
  language: Language,
): T {
  if (language === "ar") return record;
  const next = { ...record };
  const translate = translator(language);
  for (const field of fields) {
    const value = (record as Record<string, unknown>)[field];
    const override = record.translations?.he?.[field];
    if (typeof value === "string")
      (next as Record<string, unknown>)[field] =
        typeof override === "string" && override.trim()
          ? override
          : translate(value);
  }
  return next;
}
export function localizeStore(data: StoreData, language: Language): StoreData {
  if (language === "ar") return data;
  return {
    products: data.products.map((p) =>
      localized(p, textFields.products, language),
    ),
    categories: data.categories.map((p) =>
      localized(p, textFields.categories, language),
    ),
    banners: data.banners.map((p) =>
      localized(p, textFields.banners, language),
    ),
    reviews: data.reviews.map((p) =>
      localized(p, textFields.reviews, language),
    ),
    settings: localized(data.settings, textFields.settings, language),
  };
}
/** The cart always keeps the original option value across language changes. */
export function optionLabel(
  product: Product,
  kind: "colors" | "sizes",
  value: string,
  language: Language,
): string {
  const labels = product.translations?.he?.[kind];
  const translated = Array.isArray(labels)
    ? labels[product[kind].indexOf(value)]
    : undefined;
  return language === "he" && translated?.trim()
    ? translated
    : translator(language)(value);
}

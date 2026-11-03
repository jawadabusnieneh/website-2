import type { DeliveryRates, DeliveryRegion, Settings } from "../types";

export const DELIVERY_REGIONS = [
  { id: "jerusalem", label: "القدس" },
  { id: "west-bank", label: "الضفة الغربية" },
  { id: "inside", label: "الداخل" },
] as const;
export const DEFAULT_DELIVERY_RATES: Readonly<DeliveryRates> = {
  jerusalem: 30,
  "west-bank": 20,
  inside: 70,
};
export function isDeliveryRegion(value: unknown): value is DeliveryRegion {
  return DELIVERY_REGIONS.some((region) => region.id === value);
}
/** Existing settings documents without regional rates use the store's tariffs. */
export function getDeliveryRates(
  settings: Pick<Settings, "deliveryRates">,
): DeliveryRates {
  const rates = { ...DEFAULT_DELIVERY_RATES };
  for (const { id } of DELIVERY_REGIONS) {
    const fee = settings.deliveryRates?.[id];
    if (typeof fee === "number" && Number.isFinite(fee) && fee >= 0)
      rates[id] = fee;
  }
  return rates;
}
export function getDeliveryOptions(settings: Pick<Settings, "deliveryRates">) {
  const rates = getDeliveryRates(settings);
  return DELIVERY_REGIONS.map((region) => ({
    ...region,
    fee: rates[region.id],
  }));
}
export function deliveryQuote(
  settings: Pick<Settings, "deliveryRates">,
  region: unknown,
) {
  if (!isDeliveryRegion(region))
    throw new Error("اختاري منطقة التوصيل قبل إرسال الطلب.");
  return getDeliveryOptions(settings).find((option) => option.id === region)!;
}
export function validateDeliveryRates(rates: DeliveryRates): void {
  if (
    DELIVERY_REGIONS.some(
      ({ id }) =>
        typeof rates[id] !== "number" ||
        !Number.isFinite(rates[id]) ||
        rates[id] < 0,
    )
  ) {
    throw new Error("أدخلي سعر توصيل صحيحًا وغير سالب لكل منطقة.");
  }
}

import { useLanguage } from "../lib/i18n";
import { getDeliveryOptions } from "../lib/delivery";
import { money } from "../lib/utils";
import type { Customer, Settings } from "../types";
export default function DeliverySelect({
  value,
  onChange,
  settings,
  form,
}: {
  value: Customer["deliveryRegion"];
  onChange: (value: Customer["deliveryRegion"]) => void;
  settings: Settings;
  form?: string;
}) {
  const { t, language } = useLanguage();
  return (
    <div className="delivery-selector">
      <label htmlFor="delivery-region">{t("منطقة التوصيل")}</label>
      <select
        id="delivery-region"
        name="deliveryRegion"
        aria-describedby="delivery-hint"
        value={value}
        form={form}
        required={!!form}
        onChange={(event) =>
          onChange(event.target.value as Customer["deliveryRegion"])
        }
      >
        <option value="">{t("اختاري منطقة التوصيل")}</option>
        {getDeliveryOptions(settings, language).map(({ id, label, fee }) => (
          <option key={id} value={id}>
            {label} — {money(fee, settings.currency)}
          </option>
        ))}
      </select>
      <small id="delivery-hint">
        {t("تُحسب رسوم التوصيل حسب المنطقة التي تختارينها.")}
      </small>
    </div>
  );
}

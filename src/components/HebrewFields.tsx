import type { Translatable } from "../types";

export interface HebrewField {
  key: string;
  label: string;
  multiline?: boolean;
}
export default function HebrewFields({
  record,
  fields,
  options,
  onChange,
}: {
  record: Translatable;
  fields: HebrewField[];
  options?: { colors: string[]; sizes: string[] };
  onChange: (translation: Record<string, string | string[]>) => void;
}) {
  const values = record.translations?.he ?? {};
  return (
    <fieldset className="hebrew-fields full-width">
      <legend>
        المحتوى بالعبرية · <span lang="he">עברית</span>
      </legend>
      <p className="field-help">
        أضيفي الترجمة العبرية هنا. الحقول الفارغة تستخدم النص العربي، والصور
        والأسعار والمخزون مشتركة بين اللغتين.
      </p>
      <div className="form-grid">
        {fields.map(({ key, label, multiline }) => {
          const value =
            typeof values[key] === "string" ? (values[key] as string) : "";
          const update = (text: string) => onChange({ ...values, [key]: text });
          return (
            <label key={key}>
              {label} بالعبرية
              {multiline ? (
                <textarea
                  lang="he"
                  dir="rtl"
                  value={value}
                  onChange={(e) => update(e.target.value)}
                />
              ) : (
                <input
                  lang="he"
                  dir="rtl"
                  value={value}
                  onChange={(e) => update(e.target.value)}
                />
              )}
            </label>
          );
        })}
        {options &&
          (["colors", "sizes"] as const).flatMap((kind) =>
            options[kind].map((option, index) => {
              if (!option.trim()) return null;
              const labels = Array.isArray(values[kind])
                ? (values[kind] as string[])
                : [];
              return (
                <label key={`${kind}-${index}`}>
                  {kind === "colors" ? "اللون" : "المقاس"} «{option}» بالعبرية
                  <input
                    lang="he"
                    dir="rtl"
                    value={labels[index] ?? ""}
                    onChange={(e) => {
                      const next = options[kind].map((_, i) => labels[i] ?? "");
                      next[index] = e.target.value;
                      onChange({ ...values, [kind]: next });
                    }}
                  />
                </label>
              );
            }),
          )}
      </div>
    </fieldset>
  );
}

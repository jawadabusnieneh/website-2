import { normalize } from "../lib/utils";
export default function Highlight({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const needle = normalize(query);
  if (!needle) return <>{text}</>;
  let normalized = "";
  let offset = 0;
  const starts: number[] = [],
    ends: number[] = [];
  for (const char of text) {
    const part = /\s/.test(char) ? " " : normalize(char);
    for (const value of part) {
      normalized += value;
      starts.push(offset);
      ends.push(offset + char.length);
    }
    offset += char.length;
  }
  const index = normalized.indexOf(needle);
  if (index < 0) return <>{text}</>;
  const start = starts[index],
    end = ends[index + needle.length - 1];
  return (
    <>
      {text.slice(0, start)}
      <mark>{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

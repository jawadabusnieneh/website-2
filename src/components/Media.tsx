import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { supabase } from "../lib/supabase";
const cache = new Map<string, { url: string; expires: number }>();
/** Private storage: drafts are signable only by owners; public content uses RLS. */
export default function Media({
  src,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const remote = !!src?.startsWith("storage://");
  const [url, setUrl] = useState(remote ? "" : src);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function resolve() {
      if (!remote) {
        setUrl(src);
        return;
      }
      if (!supabase || !src) return;
      const key = src;
      const cached = cache.get(key);
      if (cached && cached.expires > Date.now()) {
        setUrl(cached.url);
        timer = setTimeout(
          () => void resolve(),
          cached.expires - Date.now() + 50,
        );
        return;
      }
      const { data, error } = await supabase.storage
        .from("store-media")
        .createSignedUrl(src.slice(10), 300);
      if (active && !error && data) {
        cache.set(key, { url: data.signedUrl, expires: Date.now() + 240000 });
        setUrl(data.signedUrl);
        timer = setTimeout(() => void resolve(), 245000);
      } else if (active) setUrl("");
    }
    void resolve();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [src, remote]);
  return <img {...props} src={url || undefined} />;
}

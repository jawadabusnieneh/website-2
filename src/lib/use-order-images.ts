import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import {
  orderImageProducts,
  prepareOrderPhotoFiles,
  resolveOrderImages,
  type OrderImage,
  type OrderPhotoFile,
} from "./order-images";
import type { CartItem, Product } from "../types";
interface ImageState {
  key: string;
  images: OrderImage[];
  files: OrderPhotoFile[];
  linksLoading: boolean;
  filesLoading: boolean;
}
export function useOrderImages(
  cart: CartItem[],
  products: Product[],
  enabled: boolean,
) {
  const selected = useMemo(
    () => orderImageProducts(cart, products),
    [cart, products],
  );
  const key = useMemo(
    () =>
      JSON.stringify(selected.map((p) => [p.id, p.name, p.sku, p.images[0]])),
    [selected],
  );
  const [state, setState] = useState<ImageState>({
    key: "",
    images: [],
    files: [],
    linksLoading: false,
    filesLoading: false,
  });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    setState({
      key,
      images: [],
      files: [],
      linksLoading: true,
      filesLoading: true,
    });
    const client = supabase;
    const signImage = client
      ? async (path: string, expiresIn: number) => {
          const { data, error } = await client.storage
            .from("store-media")
            .createSignedUrl(path, expiresIn);
          if (error || !data?.signedUrl)
            throw new Error("Image link unavailable");
          return data.signedUrl;
        }
      : undefined;
    void resolveOrderImages(selected, window.location.origin, signImage).then(
      async (images) => {
        if (!active) return;
        setState({
          key,
          images,
          files: [],
          linksLoading: false,
          filesLoading: true,
        });
        timeout = setTimeout(() => controller.abort(), 20000);
        const files = await prepareOrderPhotoFiles(images, controller.signal);
        clearTimeout(timeout);
        if (active)
          setState({
            key,
            images,
            files,
            linksLoading: false,
            filesLoading: false,
          });
      },
    );
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [enabled, key]);
  const current = enabled && state.key === key;
  return {
    version: key,
    images: current ? state.images : [],
    files: current ? state.files : [],
    linksLoading: enabled && (!current || state.linksLoading),
    filesLoading: enabled && (!current || state.filesLoading),
  };
}

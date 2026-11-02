import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import { demoData } from "./demo";
import { cartKey, readLocal } from "./utils";
import type {
  CartItem,
  Collection,
  Product,
  Settings,
  StoreData,
} from "../types";
const tables: Collection[] = ["products", "categories", "banners", "reviews"];
interface StoreContextValue {
  data: StoreData;
  demo: boolean;
  loading: boolean;
  error: string;
  owner: boolean;
  demoAdmin: boolean;
  setDemoAdmin: (v: boolean) => void;
  reload: () => Promise<void>;
  save: (table: Collection | "settings", record: any) => Promise<void>;
  remove: (table: Collection, id: string) => Promise<void>;
  cart: CartItem[];
  add: (p: Product, quantity?: number, color?: string, size?: string) => void;
  updateCart: (key: string, quantity: number) => void;
  removeCart: (key: string) => void;
  toast: (message: string) => void;
  notice: string;
  favorites: string[];
  favorite: (id: string) => void;
}
const StoreContext = createContext<StoreContextValue>(null!);
const emptyData: StoreData = {
  products: [],
  categories: [],
  banners: [],
  reviews: [],
  settings: {
    ...demoData.settings,
    announcement: "",
    sections: [],
    autoplay: 0,
  },
};
export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>(
    supabase ? emptyData : readLocal("elite-demo-v1", demoData),
  );
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  const [loading, setLoading] = useState(!!supabase),
    [error, setError] = useState(""),
    [owner, setOwner] = useState(false),
    [demoAdmin, setDemoAdmin] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const v = readLocal<unknown>("elite-cart", []);
    return Array.isArray(v)
      ? v.filter(
          (x) =>
            x &&
            typeof x.productId === "string" &&
            Number.isInteger(x.quantity) &&
            x.quantity > 0 &&
            typeof x.color === "string" &&
            typeof x.size === "string",
        )
      : [];
  });
  const [notice, setNotice] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() =>
    readLocal("elite-favorites", []),
  );
  const toast = useCallback((s: string) => setNotice(s), []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 4000);
      return () => clearTimeout(t);
    }
  }, [notice]);
  useEffect(() => {
    try {
      localStorage.setItem("elite-cart", JSON.stringify(cart));
    } catch {
      toast("تعذر حفظ السلة في هذا المتصفح.");
    }
  }, [cart, toast]);
  useEffect(() => {
    try {
      localStorage.setItem("elite-favorites", JSON.stringify(favorites));
    } catch {
      /* noncritical */
    }
  }, [favorites]);
  const reload = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      const results = await Promise.all(
        [...tables, "settings"].map((t) =>
          supabase!.from(t).select("id,payload").order("sort_order"),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      const next = { ...emptyData };
      tables.forEach((t, i) => {
        (next[t] as any[]) = results[i].data!.map((r) => ({
          ...r.payload,
          id: r.id,
        }));
      });
      next.settings = results[4].data?.[0]?.payload ?? emptyData.settings;
      setData(next);
    } catch {
      setError(
        "تعذر تحميل بيانات المتجر. تحققي من إعداد Supabase والاتصال ثم أعيدي المحاولة.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    async function checkOwner() {
      const {
        data: { session },
      } = await supabase!.auth.getSession();
      let allowed = false;
      if (session) {
        const { data } = await supabase!
          .from("owners")
          .select("user_id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        allowed = !!data;
      }
      if (active) {
        setOwner(allowed);
        await reload();
      }
    }
    void checkOwner();
    const { data: auth } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => void checkOwner(), 0);
    });
    const channel = supabase
      .channel("store-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        () => void reload(),
      )
      .subscribe();
    const focus = () => void reload();
    window.addEventListener("focus", focus);
    return () => {
      active = false;
      auth.subscription.unsubscribe();
      supabase!.removeChannel(channel);
      window.removeEventListener("focus", focus);
    };
  }, [reload]);
  async function save(table: Collection | "settings", record: any) {
    if (supabase) {
      if (!owner) throw new Error("لا تملكين صلاحية إدارة المتجر.");
      const { error } = await supabase
        .from(table)
        .upsert({
          id: record.id,
          payload: record,
          published: table === "settings" || record.visible,
          sort_order: record.order ?? 0,
        });
      if (error) throw new Error("تعذّر الحفظ. تحققي من الاتصال والصلاحيات.");
      await reload();
    } else {
      if (!demoAdmin) throw new Error("افتحي وضع الإدارة التجريبي أولًا.");
      const previous = dataRef.current;
      const next = { ...previous };
      if (table === "settings") next.settings = record as Settings;
      else
        (next[table] as any[]) = previous[table].some((x) => x.id === record.id)
          ? previous[table].map((x) => (x.id === record.id ? record : x))
          : [...previous[table], record];
      try {
        localStorage.setItem("elite-demo-v1", JSON.stringify(next));
      } catch {
        throw new Error("ذاكرة المتصفح ممتلئة؛ استخدمي صورًا أصغر.");
      }
      dataRef.current = next;
      setData(next);
    }
  }
  async function remove(table: Collection, id: string) {
    if (supabase) {
      if (!owner) throw new Error("غير مصرح.");
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw new Error("تعذّر الحذف.");
      await reload();
    } else {
      if (!demoAdmin) throw new Error("غير مصرح.");
      const prev = dataRef.current;
      const next = { ...prev, [table]: prev[table].filter((x) => x.id !== id) };
      localStorage.setItem("elite-demo-v1", JSON.stringify(next));
      dataRef.current = next;
      setData(next);
    }
  }
  function add(
    p: Product,
    quantity = 1,
    color = p.colors[0] ?? "",
    size = p.sizes[0] ?? "",
  ) {
    if (!p.visible || p.stock < 1 || quantity < 1) return;
    const item = { productId: p.id, quantity, color, size };
    const key = cartKey(item);
    const current = cart
      .filter((x) => x.productId === p.id)
      .reduce((n, x) => n + x.quantity, 0);
    if (current + quantity > p.stock) {
      toast("هذه الكمية غير متوفرة حاليًا.");
      return;
    }
    setCart((prev) =>
      prev.some((x) => cartKey(x) === key)
        ? prev.map((x) =>
            cartKey(x) === key ? { ...x, quantity: x.quantity + quantity } : x,
          )
        : [...prev, item],
    );
    toast(`أُضيف ${p.name} إلى حقيبتك`);
  }
  function updateCart(key: string, quantity: number) {
    if (quantity < 1) return;
    setCart((prev) =>
      prev.map((x) => {
        if (cartKey(x) !== key) return x;
        const p = data.products.find((p) => p.id === x.productId);
        const other = prev
          .filter((i) => i.productId === x.productId && cartKey(i) !== key)
          .reduce((n, i) => n + i.quantity, 0);
        if (!p || quantity + other > p.stock) {
          toast("الكمية المطلوبة غير متوفرة.");
          return x;
        }
        return { ...x, quantity };
      }),
    );
  }
  return (
    <StoreContext.Provider
      value={{
        data,
        demo: !supabase,
        loading,
        error,
        owner,
        demoAdmin,
        setDemoAdmin,
        reload,
        save,
        remove,
        cart,
        add,
        updateCart,
        removeCart: (key) =>
          setCart((prev) => prev.filter((x) => cartKey(x) !== key)),
        toast,
        notice,
        favorites,
        favorite: (id) =>
          setFavorites((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
          ),
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
export const useStore = () => useContext(StoreContext);

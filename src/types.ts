export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  shortDescription: string;
  images: string[];
  price: number;
  salePrice: number | null;
  stock: number;
  colors: string[];
  sizes: string[];
  visible: boolean;
  featured: boolean;
  isNew: boolean;
  order: number;
  createdAt: string;
}
export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  visible: boolean;
  featured: boolean;
  order: number;
}
export interface Banner {
  id: string;
  title: string;
  description: string;
  eyebrow: string;
  image: string;
  mobileImage: string;
  button: string;
  link: string;
  visible: boolean;
  order: number;
  placement: "right" | "center" | "left";
  overlay: boolean;
}
export interface Review {
  id: string;
  image: string;
  caption: string;
  visible: boolean;
  order: number;
}
export type DeliveryRegion = "jerusalem" | "west-bank" | "inside";
export type DeliveryRates = Record<DeliveryRegion, number>;

export interface Settings {
  id: string;
  name: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  logo: string;
  currency: string;
  /** Legacy field retained for existing settings records. */
  deliveryFee: number;
  deliveryRates?: DeliveryRates;
  deliveryAreas: string;
  announcement: string;
  contact: string;
  about: string;
  autoplay: number;
  sections: string[];
  promoTitle: string;
  promoText: string;
  promoImage: string;
}
export interface StoreData {
  products: Product[];
  categories: Category[];
  banners: Banner[];
  reviews: Review[];
  settings: Settings;
}
export type Collection = "products" | "categories" | "banners" | "reviews";
export interface CartItem {
  productId: string;
  quantity: number;
  color: string;
  size: string;
}
export interface Customer {
  deliveryRegion: DeliveryRegion | "";
  name: string;
  phone: string;
  city: string;
  address: string;
  landmark: string;
  maps: string;
  notes: string;
}

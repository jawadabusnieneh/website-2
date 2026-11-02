import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StoreProvider } from "./lib/store";
import Layout from "./components/Layout";
import DialogBehavior from "./components/DialogBehavior";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Product from "./pages/Product";
import Cart from "./pages/Cart";
import Info from "./pages/Info";
import "./styles.css";
const Admin = lazy(() => import("./pages/Admin"));
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <DialogBehavior />
        <Suspense fallback={<div className="loading">جارٍ التحميل...</div>}>
          <Routes>
            <Route path="/elite-management-portal" element={<Admin />} />
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="shop" element={<Shop />} />
              <Route path="product/:id" element={<Product />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Cart checkout />} />
              <Route path="about" element={<Info kind="about" />} />
              <Route path="contact" element={<Info kind="contact" />} />
              <Route path="info/:slug" element={<Info />} />
              <Route path="*" element={<Info />} />
            </Route>
          </Routes>
        </Suspense>
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

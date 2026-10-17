import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { syncPublicStock } from "./lib/inventory";
import HomePage from "./pages/HomePage";
import WatchPage from "./pages/WatchPage";
import ShopPage from "./pages/ShopPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import InquiryPage from "./pages/InquiryPage";
import AboutPage from "./pages/AboutPage";

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export default function App() {
  useEffect(() => {
    syncPublicStock();
  }, []);

  return (
    <Layout>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/watch/:ep" element={<WatchPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/shop/:code" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/inquiry" element={<InquiryPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Layout>
  );
}

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 정적 호스팅(Vercel·GitHub Pages 하위 경로)에서도 동작하도록 상대 경로로 빌드한다. 라우팅은 HashRouter.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "./",
  build: { chunkSizeWarningLimit: 1500 },
});

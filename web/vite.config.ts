import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true, // 0.0.0.0 바인딩 — 같은 와이파이의 폰에서 192.168.x.x:5177로 접속 가능
    port: 5177,
  },
});

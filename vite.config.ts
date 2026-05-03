import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative base so the build works whether served from / (custom domain)
  // or from /<repo-name>/ (default GitHub Pages project URL).
  base: "./",
  plugins: [react()],
});

import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [tailwindcss(), preact()],
});

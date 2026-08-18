import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "node",
    // fake-indexeddb stands in for the browser's IndexedDB so the Dexie
    // layer behaves identically in tests as on the tablet (db/test-setup.js).
    setupFiles: ["./db/test-setup.js"],
  },
});

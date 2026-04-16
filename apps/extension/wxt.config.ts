import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  dev: {
    server: {
      port: 3003,
    },
  },
  manifest: {
    name: "StyleScan — Design DNA for AI Agents",
    description:
      "Extract the design language of any webpage into a design.md file for AI coding agents.",
    version: "0.1.0",
    permissions: ["activeTab", "storage", "tabs"],
    host_permissions: ["https://api.stylescan.dev/*", "http://localhost:3001/*"],
  },
});

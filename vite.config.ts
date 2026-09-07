import { defineConfig } from "vite"

const repo = process.env.GITHUB_REPOSITORY?.split("/")[1]
const base = process.env.GITHUB_PAGES === "1" && repo ? `/${repo}/` : "./"

export default defineConfig({
  base,
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  worker: {
    format: "es",
  },
})

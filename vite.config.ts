import { defineConfig } from "vite"

const repo = process.env.GITHUB_REPOSITORY?.split("/")[1]
const base = process.env.GITHUB_PAGES === "1" && repo ? `/${repo}/` : "./"

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://demotiles.maplibre.org",
  "worker-src 'self' blob:",
  "child-src blob:",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ")

export default defineConfig(({ mode }) => ({
  base,
  plugins: [
    {
      name: "csp",
      transformIndexHtml(html) {
        if (mode !== "production") return html
        return html.replace(
          "<head>",
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
        )
      },
    },
  ],
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  worker: {
    format: "es",
  },
}))

import { t } from "./i18n.ts"

export const KOFI_URL = "https://ko-fi.com/Q5Q5DH9I8"

export function kofiButton(): string {
  return `
    <a class="kofi-btn" href="${KOFI_URL}" target="_blank" rel="noopener noreferrer">
      ${kofiCup()}
      <span class="kofi-btn-rule" aria-hidden="true"></span>
      <span class="kofi-btn-copy">
        <strong>${t("kofi.buy")}</strong>
        <span class="kofi-btn-sub">${t("kofi.on")}</span>
      </span>
    </a>
  `
}

export function kofiCup(): string {
  return `<svg class="kofi-cup" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M7.2 6.1h9.6v1.7H7.2z"/><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M8 7.8h8l-.95 11.3c-.12.9-.88 1.55-1.8 1.55h-2.5c-.92 0-1.68-.65-1.8-1.55L8 7.8z"/><path fill="#f05b4e" d="M12 15.4 10.88 14.38c-.68-.62-1.48-1.34-1.48-2.22 0-.72.58-1.3 1.3-1.3.42 0 .82.2 1.08.52.26-.32.66-.52 1.08-.52.72 0 1.3.58 1.3 1.3 0 .88-.8 1.6-1.48 2.22z"/></svg>`
}

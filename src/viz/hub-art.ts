/** Hub diagrams: labeled pictures of what each tool teaches. */

const ink = "#042a22"
const rust = "#d4532a"
const cream = "#042a22"
const muted = "#3f6b58"
const land = "#8fbf5a"
const landStroke = "#3f6b58"
const ocean = "#d8f0b4"
const ok = "#1f7a45"
const bad = "#c23048"
const svo = "#1578a0"
const panel = "#ffffff"
const ui = `"DM Sans", "Segoe UI", sans-serif`

export type HubArtId = "atlas" | "sunburst" | "dossier" | "compare" | "investigate" | "learn" | "sov" | "sprachbund" | "pair" | "tree"

function frame(label: string, inner: string): string {
  return `<svg class="hub-art" viewBox="0 0 320 176" role="img" aria-label="${label}"><title>${label}</title>${inner}</svg>`
}

const worldLand = `
  <g fill="${land}" stroke="${landStroke}" stroke-width="1.2" stroke-linejoin="round">
    <path d="M42 46c10-16 26-22 34-8 6 12 2 28 8 40 4 10-2 26-12 34-12 10-26 4-30-10-4-16 2-32 0-56z"/>
    <path d="M58 98c10-2 18 8 20 20 2 16-6 30-16 36-12 6-20-4-18-16 2-14 4-32 14-40z"/>
    <path d="M108 40c32-18 78-16 118-4 22 8 42 2 54 16 8 10 2 24-12 30-24 10-52 2-76 10-26 8-48 20-68 8-16-10-20-32-16-60z"/>
    <path d="M128 84c16-2 26 12 28 26 2 18-8 34-20 40-14 8-26-4-24-20 2-16 4-40 16-46z"/>
    <path d="M248 112c14-6 24 4 26 14 2 12-8 18-20 16-14-2-18-16-6-30z"/>
  </g>
`

function legend(items: { color: string; label: string }[], x = 16, y = 158): string {
  return items
    .map((item, i) => {
      const dx = x + i * 72
      return `<circle cx="${dx}" cy="${y}" r="5" fill="${item.color}" stroke="${ink}" stroke-width="0.8"/><text x="${dx + 10}" y="${y + 4}" fill="${cream}" font-size="11" font-family="${ui}">${item.label}</text>`
    })
    .join("")
}

export const hubArt: Record<HubArtId, string> = {
  atlas: frame(
    "World map of word-order types",
    `
    <rect width="320" height="176" rx="16" fill="${ocean}"/>
    ${worldLand}
    <g fill="${ink}">
      <circle cx="148" cy="58" r="4.5"/><circle cx="168" cy="54" r="5"/><circle cx="188" cy="58" r="4.5"/>
      <circle cx="206" cy="52" r="4"/><circle cx="158" cy="70" r="4.5"/><circle cx="178" cy="66" r="4"/>
    </g>
    <g fill="${svo}">
      <circle cx="52" cy="62" r="4.5"/><circle cx="70" cy="78" r="4"/><circle cx="248" cy="70" r="4.5"/>
    </g>
    <g fill="${rust}">
      <circle cx="64" cy="108" r="4.5"/><circle cx="78" cy="118" r="4"/>
    </g>
    <rect x="12" y="12" width="92" height="22" rx="11" fill="${panel}" stroke="${ink}" stroke-width="1.4"/>
    <text x="20" y="27" fill="${ink}" font-size="12" font-family="${ui}">SOV belt</text>
    ${legend([
      { color: ink, label: "SOV" },
      { color: svo, label: "SVO" },
      { color: rust, label: "VOS" },
    ])}
  `,
  ),
  sunburst: frame(
    "Genealogy sunburst linked to a world map",
    `
    <rect width="320" height="176" rx="16" fill="${ocean}"/>
    <g transform="translate(96,88)">
      <circle r="22" fill="${panel}" stroke="${ink}" stroke-width="1.4"/>
      <path d="M-38-18A42 42 0 0 1 38-18L28-8A28 28 0 0 0-28-8Z" fill="${land}" stroke="${landStroke}" stroke-width="1"/>
      <path d="M38-18A42 42 0 0 1 20 36L12 24A28 28 0 0 0 28-8Z" fill="${land}" stroke="${landStroke}" stroke-width="1"/>
      <path d="M20 36A42 42 0 0 1-38-18L-28-8A28 28 0 0 0 12 24Z" fill="${land}" stroke="${landStroke}" stroke-width="1"/>
      <path d="M-52-8A54 54 0 0 1 52-8" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="butt"/>
      <path d="M52-8A54 54 0 0 1 18 50" fill="none" stroke="${svo}" stroke-width="7"/>
      <path d="M18 50A54 54 0 0 1-52-8" fill="none" stroke="${rust}" stroke-width="7"/>
      <text x="-18" y="4" fill="${ink}" font-size="9" font-family="${ui}">IE</text>
    </g>
    <g transform="translate(188,28) scale(0.42)">
      <rect width="320" height="176" rx="24" fill="${panel}" stroke="${ink}" stroke-width="3"/>
      <g fill="${land}" stroke="${landStroke}" stroke-width="2">
        <path d="M42 46c10-16 26-22 34-8 6 12 2 28 8 40 4 10-2 26-12 34-12 10-26 4-30-10-4-16 2-32 0-56z"/>
        <path d="M108 40c32-18 78-16 118-4 22 8 42 2 54 16 8 10 2 24-12 30-24 10-52 2-76 10-26 8-48 20-68 8-16-10-20-32-16-60z"/>
      </g>
      <circle cx="160" cy="58" r="8" fill="${ink}"/>
      <circle cx="190" cy="52" r="8" fill="${ink}"/>
      <circle cx="70" cy="70" r="7" fill="${svo}"/>
    </g>
    <path d="M150 88h28" stroke="${ink}" stroke-width="2"/>
    <polygon fill="${ink}" points="178,88 170,83 170,93"/>
    <text x="16" y="164" fill="${ink}" font-size="11" font-family="${ui}">tree filters map  ·  map filters tree</text>
  `,
  ),
  dossier: frame(
    "Language profile with family tree and neighbors",
    `
    <rect width="320" height="176" rx="16" fill="${ocean}"/>
    <rect x="12" y="16" width="118" height="144" rx="16" fill="${panel}" stroke="${ink}" stroke-width="1.4"/>
    <text x="24" y="42" fill="${ink}" font-size="16" font-family="${ui}">K'iche'</text>
    <text x="24" y="64" fill="${muted}" font-size="11" font-family="${ui}">Mayan · quc</text>
    <text x="24" y="92" fill="${cream}" font-size="12" font-family="${ui}">WALS  7</text>
    <text x="24" y="112" fill="${cream}" font-size="12" font-family="${ui}">Grambank  180</text>
    <text x="24" y="140" fill="${rust}" font-size="11" font-family="${ui}">sparse WALS</text>
    <path fill="none" stroke="${ink}" stroke-width="1.8" d="M196 28v36M196 64l-36 28M196 64l36 28M160 92v28M232 92v28"/>
    <circle cx="196" cy="28" r="7" fill="none" stroke="${muted}" stroke-width="1.6"/>
    <circle cx="160" cy="120" r="9" fill="${ink}"/>
    <circle cx="232" cy="120" r="8" fill="${svo}"/>
    <circle cx="268" cy="128" r="6" fill="none" stroke="${rust}" stroke-width="1.6"/>
    <text x="148" y="154" fill="${ink}" font-size="11" font-family="${ui}">K'iche'</text>
    <text x="214" y="154" fill="${svo}" font-size="11" font-family="${ui}">Kaqchikel</text>
    <text x="250" y="168" fill="${rust}" font-size="10" font-family="${ui}">neighbor</text>
  `,
  ),
  compare: frame(
    "Feature table comparing two languages",
    `
    <rect width="320" height="176" rx="16" fill="${ocean}"/>
    <text x="24" y="28" fill="${cream}" font-size="12" font-family="${ui}">K'iche'</text>
    <text x="168" y="28" fill="${cream}" font-size="12" font-family="${ui}">Kaqchikel</text>
    <line x1="16" y1="38" x2="304" y2="38" stroke="${landStroke}" stroke-width="1"/>
    <text x="24" y="58" fill="${muted}" font-size="11" font-family="${ui}">word order</text>
    <text x="140" y="58" fill="${ok}" font-size="12" font-family="${ui}">same</text>
    <text x="24" y="82" fill="${muted}" font-size="11" font-family="${ui}">case</text>
    <text x="140" y="82" fill="${ok}" font-size="12" font-family="${ui}">same</text>
    <text x="24" y="106" fill="${muted}" font-size="11" font-family="${ui}">tone</text>
    <text x="140" y="106" fill="${bad}" font-size="12" font-family="${ui}">differs</text>
    <rect x="16" y="128" width="288" height="32" rx="16" fill="${panel}" stroke="${ink}" stroke-width="1.2"/>
    <text x="28" y="149" fill="${ink}" font-size="14" font-family="${ui}">agree 154 / 174 coded</text>
  `,
  ),
  investigate: frame(
    "Research question on a map plus a correlation chart",
    `
    <rect width="320" height="176" rx="16" fill="${ocean}"/>
    ${worldLand}
    <circle cx="168" cy="60" r="22" fill="none" stroke="${ink}" stroke-width="2"/>
    <text x="160" y="66" fill="${ink}" font-size="20" font-family="${ui}">?</text>
    <g transform="translate(214,18)">
      <rect width="92" height="86" rx="12" fill="${panel}" stroke="${ink}" stroke-width="1"/>
      <rect x="12" y="50" width="16" height="24" fill="${ink}"/>
      <rect x="36" y="36" width="16" height="38" fill="${rust}"/>
      <rect x="60" y="22" width="16" height="52" fill="${svo}"/>
      <text x="10" y="16" fill="${ink}" font-size="9" font-family="${ui}">correlate</text>
    </g>
    <text x="16" y="164" fill="${ink}" font-size="12" font-family="${ui}">Why here?  What travels with it?</text>
  `,
  ),
  learn: frame(
    "Starter path: terms, then a language, then the map",
    `
    <rect width="320" height="176" rx="16" fill="${ocean}"/>
    <rect x="16" y="20" width="88" height="88" rx="16" fill="${panel}" stroke="${ink}" stroke-width="1.4"/>
    <text x="28" y="44" fill="${ink}" font-size="13" font-family="${ui}">1</text>
    <text x="28" y="68" fill="${cream}" font-size="12" font-family="${ui}">terms</text>
    <text x="28" y="88" fill="${muted}" font-size="10" font-family="${ui}">glossary</text>
    <rect x="116" y="44" width="88" height="88" rx="16" fill="${panel}" stroke="${rust}" stroke-width="1.4"/>
    <text x="128" y="68" fill="${rust}" font-size="13" font-family="${ui}">2</text>
    <text x="128" y="92" fill="${cream}" font-size="12" font-family="${ui}">K'iche'</text>
    <text x="128" y="112" fill="${muted}" font-size="10" font-family="${ui}">dossier</text>
    <rect x="216" y="20" width="88" height="88" rx="16" fill="${panel}" stroke="${svo}" stroke-width="1.4"/>
    <text x="228" y="44" fill="${svo}" font-size="13" font-family="${ui}">3</text>
    <text x="228" y="68" fill="${cream}" font-size="12" font-family="${ui}">map</text>
    <text x="228" y="88" fill="${muted}" font-size="10" font-family="${ui}">atlas</text>
    <text x="16" y="158" fill="${ink}" font-size="12" font-family="${ui}">path · terms · what % means</text>
  `,
  ),
  sov: frame(
    "Map highlighting the Eurasian SOV belt",
    `
    <rect width="320" height="176" rx="16" fill="${ocean}"/>
    ${worldLand}
    <ellipse cx="176" cy="58" rx="86" ry="22" fill="${ink}" opacity="0.12" stroke="${ink}" stroke-width="1.6"/>
    <g fill="${ink}">
      <circle cx="140" cy="56" r="5"/><circle cx="158" cy="52" r="5.5"/><circle cx="178" cy="56" r="5"/>
      <circle cx="196" cy="50" r="5"/><circle cx="214" cy="54" r="4.5"/>
    </g>
    <g fill="${svo}">
      <circle cx="58" cy="70" r="4"/><circle cx="250" cy="78" r="4"/>
    </g>
    <text x="16" y="28" fill="${ink}" font-size="14" font-family="${ui}">SOV across Eurasia</text>
    ${legend([
      { color: ink, label: "SOV" },
      { color: svo, label: "other" },
    ])}
  `,
  ),
  sprachbund: frame(
    "Unrelated languages in one area sharing structure",
    `
    <rect width="320" height="176" rx="16" fill="${ocean}"/>
    <ellipse cx="118" cy="88" rx="78" ry="58" fill="none" stroke="${rust}" stroke-width="2" stroke-dasharray="6 5"/>
    <text x="72" y="38" fill="${rust}" font-size="12" font-family="${ui}">same area</text>
    <circle cx="88" cy="78" r="16" fill="${panel}" stroke="${ink}" stroke-width="1.8"/>
    <circle cx="140" cy="70" r="16" fill="${panel}" stroke="${svo}" stroke-width="1.8"/>
    <circle cx="118" cy="112" r="16" fill="${panel}" stroke="${muted}" stroke-width="1.8"/>
    <text x="80" y="83" fill="${ink}" font-size="10" font-family="${ui}">A</text>
    <text x="133" y="75" fill="${svo}" font-size="10" font-family="${ui}">B</text>
    <text x="111" y="117" fill="${muted}" font-size="10" font-family="${ui}">C</text>
    <text x="210" y="70" fill="${ink}" font-size="13" font-family="${ui}">Sprachbund</text>
    <text x="210" y="92" fill="${cream}" font-size="11" font-family="${ui}">three families</text>
    <text x="210" y="110" fill="${cream}" font-size="11" font-family="${ui}">one shared trait</text>
    <text x="210" y="128" fill="${muted}" font-size="11" font-family="${ui}">contact, not kin</text>
  `,
  ),
  pair: frame(
    "Two languages compared side by side",
    `
    <rect width="320" height="176" rx="16" fill="${ocean}"/>
    <rect x="24" y="28" width="112" height="88" rx="16" fill="${panel}" stroke="${ink}" stroke-width="1.8"/>
    <rect x="184" y="28" width="112" height="88" rx="16" fill="${panel}" stroke="${rust}" stroke-width="1.8"/>
    <text x="42" y="62" fill="${ink}" font-size="14" font-family="${ui}">K'iche'</text>
    <text x="42" y="84" fill="${muted}" font-size="11" font-family="${ui}">Mayan</text>
    <text x="198" y="62" fill="${rust}" font-size="14" font-family="${ui}">Kaqchikel</text>
    <text x="198" y="84" fill="${muted}" font-size="11" font-family="${ui}">Mayan</text>
    <path d="M144 72h32" stroke="${ink}" stroke-width="2"/>
    <polygon fill="${ink}" points="176,72 168,66 168,78"/>
    <text x="70" y="152" fill="${ink}" font-size="12" font-family="${ui}">same codes vs different codes</text>
  `,
  ),
  tree: frame(
    "Mayan family tree with K'iche' highlighted",
    `
    <rect width="320" height="176" rx="16" fill="${ocean}"/>
    <path fill="none" stroke="${ink}" stroke-width="1.8" d="M160 24v36M160 60l-70 36M160 60l70 36M90 96v32M230 96v32"/>
    <circle cx="160" cy="24" r="8" fill="${panel}" stroke="${muted}" stroke-width="1.6"/>
    <text x="176" y="28" fill="${muted}" font-size="12" font-family="${ui}">Mayan</text>
    <circle cx="90" cy="128" r="11" fill="${ink}"/>
    <circle cx="230" cy="128" r="10" fill="${svo}"/>
    <text x="24" y="134" fill="${ink}" font-size="13" font-family="${ui}">K'iche'</text>
    <text x="248" y="134" fill="${svo}" font-size="13" font-family="${ui}">Kaqchikel</text>
    <text x="16" y="164" fill="${ink}" font-size="12" font-family="${ui}">kin on the tree · neighbors off it</text>
  `,
  ),
}

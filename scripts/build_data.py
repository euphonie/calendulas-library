#!/usr/bin/env python3
"""Join WALS + Glottolog + Grambank and emit compact JSON for the teaching atlas."""

from __future__ import annotations

import json
import math
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "vendor"
OUT = ROOT / "public" / "data"
DATASETS = json.loads((ROOT / "data" / "datasets.json").read_text())

MIN_WALS_OVERLAP = 10
MIN_GB_OVERLAP = 30
MIN_COMBINED_OVERLAP = 20
TOP_K = 20
GEO_K = 10

CURRICULUM = [
    "wals:81A",
    "wals:85A",
    "wals:87A",
    "wals:88A",
    "wals:13A",
    "wals:30A",
    "wals:31A",
    "wals:49A",
    "wals:51A",
    "wals:1A",
    "wals:26A",
]

HERO = {
    "order": "wals:81A",
    "adpositions": "wals:85A",
    "tone": "wals:13A",
    "gender": "wals:30A",
    "case": "wals:49A",
    "adjNoun": "wals:87A",
    "consonants": "wals:1A",
}

FEATURE_BLURBS = {
    "wals:81A": "The relative order of subject, object, and verb in a typical transitive clause.",
    "wals:85A": "Whether a language uses prepositions (before the noun) or postpositions (after it).",
    "wals:87A": "Whether adjectives precede or follow the noun they modify.",
    "wals:88A": "Whether demonstratives precede or follow the noun.",
    "wals:13A": "Whether the language uses pitch to distinguish words (tone).",
    "wals:30A": "How many grammatical genders (noun classes) a language has.",
    "wals:31A": "Whether gender assignment is sex-based or based on other properties.",
    "wals:49A": "How many morphological cases the language distinguishes.",
    "wals:51A": "Where case markers attach (prefixes, suffixes, or adpositions).",
    "wals:1A": "A coarse coding of how large the consonant inventory is.",
    "wals:26A": "Whether the language prefers prefixes or suffixes in inflection.",
}

AREA_HINTS = {
    "phonology": ("consonant", "vowel", "tone", "syllable", "stress", "nasal", "lateral", "click"),
    "morphology": ("case", "gender", "prefix", "suffix", "inflection", "reduplicat", "article", "plural", "tense", "aspect", "mood", "person", "number of"),
    "syntax": ("order", "adposition", "relative", "passive", "alignment", "object", "subject", "verb", "clause", "demonstrative", "adjective", "negative"),
}


def load_paths() -> dict[str, Path]:
    raw = json.loads((VENDOR / "cldf-paths.json").read_text())
    return {k: ROOT / v for k, v in raw.items()}


def read_csv(path: Path, **kwargs) -> pd.DataFrame:
    return pd.read_csv(path, dtype=str, keep_default_na=False, na_values=["", "NA", "null"], **kwargs)


def clean_name(value, fallback: str) -> str:
    if value is None:
        return fallback
    try:
        if pd.isna(value):
            return fallback
    except TypeError:
        pass
    text = str(value).strip()
    return text or fallback


def usable_code(value) -> str | None:
    text = clean_name(value, "")
    if not text or text.lower() in {"nan", "none", "null", "na"}:
        return None
    return text


def as_float(value) -> float | None:
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except TypeError:
        pass
    text = str(value).strip()
    if not text:
        return None
    return float(text)


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(min(1.0, a)))


def guess_area(name: str, source: str) -> str:
    n = name.lower()
    if source == "grambank":
        return "morphosyntax"
    for area, keys in AREA_HINTS.items():
        if any(k in n for k in keys):
            return area
    return "other"


def is_wals_language_id(lid: str) -> bool:
    return bool(lid) and not lid.startswith(("family-", "genus-", "subfamily-"))


def compact_code_id(parameter_id: str, code_id: str) -> str:
    prefix = f"{parameter_id}-"
    if code_id.startswith(prefix):
        return code_id[len(prefix) :]
    return code_id


def nearest_neighbors(codes: np.ndarray, min_overlap: int, k: int) -> list[list[tuple[int, float, int]]]:
    n, _ = codes.shape
    present = codes >= 0
    out: list[list[tuple[int, float, int]]] = [[] for _ in range(n)]
    for i in range(n):
        mask_i = present[i]
        overlaps = (present & mask_i).sum(axis=1)
        matches = ((codes == codes[i]) & present & mask_i).sum(axis=1)
        scores = np.full(n, -1.0, dtype=np.float64)
        ok = overlaps >= min_overlap
        ok[i] = False
        scores[ok] = matches[ok] / overlaps[ok]
        if not np.any(scores >= 0):
            continue
        kth = min(k, int(np.sum(scores >= 0)))
        cand = np.argpartition(-scores, kth - 1)[:kth]
        cand = cand[np.argsort(-scores[cand])]
        out[i] = [(int(j), float(scores[j]), int(overlaps[j])) for j in cand if scores[j] >= 0]
    return out


def cramers_v(table: np.ndarray) -> float:
    if table.size == 0 or table.sum() == 0:
        return 0.0
    n = table.sum()
    row = table.sum(axis=1, keepdims=True)
    col = table.sum(axis=0, keepdims=True)
    expected = row @ col / n
    with np.errstate(divide="ignore", invalid="ignore"):
        chi = np.nansum((table - expected) ** 2 / np.where(expected == 0, np.nan, expected))
    r, c = table.shape
    denom = min(r - 1, c - 1)
    if denom <= 0:
        return 0.0
    return float(math.sqrt(chi / (n * denom)))


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))


def build_wals(cldf: Path) -> tuple[pd.DataFrame, list[dict], dict[str, dict[str, str]], dict[str, dict]]:
    langs = read_csv(cldf / "languages.csv")
    langs = langs[langs["ID"].map(is_wals_language_id)].copy()
    params = read_csv(cldf / "parameters.csv")
    codes = read_csv(cldf / "codes.csv")
    values = read_csv(cldf / "values.csv", usecols=["Language_ID", "Parameter_ID", "Code_ID", "Value"])

    code_meta: dict[str, dict] = {}
    features: list[dict] = []
    for _, p in params.iterrows():
        pid = p["ID"]
        fid = f"wals:{pid}"
        options = codes[codes["Parameter_ID"] == pid]
        opts = []
        for _, c in options.iterrows():
            cid = compact_code_id(pid, c["ID"])
            opts.append({"id": cid, "name": c["Name"], "number": c.get("Number") or None})
            code_meta[f"{fid}:{cid}"] = {"id": cid, "name": c["Name"]}
        features.append(
            {
                "id": fid,
                "source": "wals",
                "sourceId": pid,
                "name": p["Name"],
                "area": guess_area(p["Name"], "wals"),
                "curriculum": fid in CURRICULUM,
                "blurb": FEATURE_BLURBS.get(fid, ""),
                "codes": opts,
                "url": f"https://wals.info/feature/{pid}",
            }
        )

    by_feat: dict[str, dict[str, str]] = defaultdict(dict)
    by_lang: dict[str, dict[str, str]] = defaultdict(dict)
    for _, row in values.iterrows():
        lid = row["Language_ID"]
        if not is_wals_language_id(lid):
            continue
        pid = row["Parameter_ID"]
        cid = compact_code_id(pid, row["Code_ID"] or row["Value"])
        fid = f"wals:{pid}"
        by_feat[fid][lid] = cid
        by_lang[lid][fid] = cid

    langs["walsN"] = langs["ID"].map(lambda i: len(by_lang.get(i, {})))
    return langs, features, dict(by_feat), dict(by_lang)


def build_grambank(cldf: Path) -> tuple[pd.DataFrame, list[dict], dict[str, dict[str, str]], dict[str, dict]]:
    langs = read_csv(cldf / "languages.csv")
    params = read_csv(cldf / "parameters.csv")
    codes = read_csv(cldf / "codes.csv") if (cldf / "codes.csv").exists() else pd.DataFrame()
    values = read_csv(cldf / "values.csv", usecols=lambda c: c in {"Language_ID", "Parameter_ID", "Code_ID", "Value"})

    code_lookup = defaultdict(list)
    if not codes.empty:
        for _, c in codes.iterrows():
            code_lookup[c["Parameter_ID"]].append({"id": c["ID"], "name": c.get("Name") or c["ID"]})

    features: list[dict] = []
    for _, p in params.iterrows():
        pid = p["ID"]
        fid = f"gb:{pid}"
        opts = code_lookup.get(pid) or [
            {"id": "0", "name": "absent"},
            {"id": "1", "name": "present"},
            {"id": "?", "name": "unknown"},
        ]
        features.append(
            {
                "id": fid,
                "source": "grambank",
                "sourceId": pid,
                "name": p["Name"],
                "area": "morphosyntax",
                "curriculum": False,
                "blurb": "Grambank morphosyntactic coding (binary or small categorical).",
                "codes": [{"id": compact_code_id(pid, o["id"]), "name": o["name"]} for o in opts],
                "url": f"https://grambank.clld.org/parameters/{pid}",
            }
        )

    by_feat: dict[str, dict[str, str]] = defaultdict(dict)
    by_lang: dict[str, dict[str, str]] = defaultdict(dict)
    skip_unknown = {"?", "NA", "nan"}
    for _, row in values.iterrows():
        val = row.get("Value") or row.get("Code_ID")
        if val in skip_unknown or val is None:
            continue
        lid = row["Language_ID"]
        pid = row["Parameter_ID"]
        cid = compact_code_id(pid, str(val))
        fid = f"gb:{pid}"
        by_feat[fid][lid] = cid
        by_lang[lid][fid] = cid

    langs["grambankN"] = langs["ID"].map(lambda i: len(by_lang.get(i, {})))
    return langs, features, dict(by_feat), dict(by_lang)


def load_glottolog(cldf: Path) -> tuple[pd.DataFrame, dict[str, list[str]], dict[str, str]]:
    langs = read_csv(cldf / "languages.csv")
    names = {r["ID"]: clean_name(r["Name"], r["ID"]) for _, r in langs.iterrows()}
    class_paths: dict[str, list[str]] = {}
    values_path = cldf / "values.csv"
    if values_path.exists():
        usecols = ["Language_ID", "Parameter_ID", "Value"]
        for chunk in pd.read_csv(
            values_path,
            dtype=str,
            keep_default_na=False,
            chunksize=200_000,
            usecols=lambda c: c in usecols,
        ):
            sub = chunk[chunk["Parameter_ID"] == "classification"]
            for _, row in sub.iterrows():
                path = [p for p in str(row["Value"]).split("/") if p]
                class_paths[row["Language_ID"]] = path
    return langs, class_paths, names


def lect_score(row, glot_name: str, n: int) -> tuple:
    """Prefer the lect with the most codes, then the Glottolog name, then an unadorned label."""
    name = clean_name(row.get("Name"), "")
    glot = (glot_name or "").casefold()
    return (n, int(name.casefold() == glot), 0 if "(" in name else 1)


def unify_languages(
    wals_langs: pd.DataFrame,
    gb_langs: pd.DataFrame,
    glot_langs: pd.DataFrame,
    class_paths: dict[str, list[str]],
    glot_names: dict[str, str],
    wals_by_lang: dict[str, dict],
    gb_by_lang: dict[str, dict],
) -> tuple[list[dict], dict[str, str], dict[str, str]]:
    glot_by_code = {r["ID"]: r for _, r in glot_langs.iterrows()}
    glot_by_iso: dict[str, str] = {}
    for _, r in glot_langs.iterrows():
        iso = usable_code(r.get("ISO639P3code"))
        if iso and r.get("Level") == "language":
            glot_by_iso.setdefault(iso, r["ID"])
    records: dict[str, dict] = {}

    def resolve_gid(row, fallback: str) -> str:
        gid = usable_code(row.get("Glottocode"))
        if gid:
            return gid
        iso = usable_code(row.get("ISO639P3code"))
        if iso and iso in glot_by_iso:
            return glot_by_iso[iso]
        return fallback

    def ensure(gid: str) -> dict:
        if gid not in records:
            g = glot_by_code.get(gid, {})
            path_ids = [p for p in class_paths.get(gid, []) if p and p != gid]
            raw_family = g.get("Family_ID")
            family_id = None if raw_family is None or (isinstance(raw_family, float) and pd.isna(raw_family)) or str(raw_family).strip() in {"", "nan"} else str(raw_family)
            if not family_id and path_ids:
                family_id = path_ids[0]
            if family_id and family_id not in path_ids:
                path_ids = [family_id, *path_ids]
            records[gid] = {
                "id": gid,
                "name": clean_name(g.get("Name"), gid),
                "walsId": None,
                "walsName": None,
                "gbId": None,
                "iso": usable_code(g.get("ISO639P3code")),
                "familyId": family_id,
                "familyName": glot_names.get(family_id) if family_id else None,
                "genus": None,
                "familyPath": [{"id": p, "name": glot_names.get(p, p)} for p in path_ids],
                "lat": as_float(g.get("Latitude")),
                "lon": as_float(g.get("Longitude")),
                "macroarea": g.get("Macroarea") or None,
                "walsN": 0,
                "grambankN": 0,
            }
        return records[gid]

    wals_id_to_gid: dict[str, str] = {}
    gb_id_to_gid: dict[str, str] = {}
    wals_groups: dict[str, list] = defaultdict(list)
    gb_groups: dict[str, list] = defaultdict(list)

    for _, r in wals_langs.iterrows():
        gid = resolve_gid(r, f"wals-{r['ID']}")
        wals_groups[gid].append(r)
        wals_id_to_gid[r["ID"]] = gid

    for _, r in gb_langs.iterrows():
        gid = resolve_gid(r, r["ID"])
        gb_groups[gid].append(r)
        gb_id_to_gid[r["ID"]] = gid

    def attach_best(gid: str, rows: list, by_lang: dict[str, dict], id_key: str, name_key: str | None, n_key: str) -> None:
        rec = ensure(gid)
        ranked = sorted(
            rows,
            key=lambda row: lect_score(row, rec["name"], len(by_lang.get(row["ID"], {}))),
            reverse=True,
        )
        best = ranked[0]
        rec[id_key] = best["ID"]
        if name_key:
            rec[name_key] = best["Name"]
        rec[n_key] = int(len(by_lang.get(best["ID"], {})))
        if rec["lat"] is None:
            rec["lat"] = as_float(best.get("Latitude"))
            rec["lon"] = as_float(best.get("Longitude"))
        if not rec["macroarea"]:
            rec["macroarea"] = best.get("Macroarea") or None
        if not rec["iso"]:
            rec["iso"] = usable_code(best.get("ISO639P3code"))
        if rec["name"] in {gid, rec["id"]}:
            rec["name"] = best["Name"]
        if id_key == "walsId":
            rec["genus"] = best.get("Genus") or rec["genus"]
            if not rec["familyName"]:
                rec["familyName"] = best.get("Family") or rec["familyName"]

    for gid, rows in wals_groups.items():
        attach_best(gid, rows, wals_by_lang, "walsId", "walsName", "walsN")
    for gid, rows in gb_groups.items():
        attach_best(gid, rows, gb_by_lang, "gbId", None, "grambankN")

    langs = [v for v in records.values() if v["walsN"] or v["grambankN"]]
    langs.sort(key=lambda x: x["name"].lower())
    return langs, wals_id_to_gid, gb_id_to_gid


def feature_matrix(langs: list[dict], by_lang: dict[str, dict], key: str, prefix: str) -> tuple[np.ndarray, list[str]]:
    feats = sorted({fid for vec in by_lang.values() for fid in vec if fid.startswith(prefix)})
    index = {f: i for i, f in enumerate(feats)}
    mat = np.full((len(langs), len(feats)), -1, dtype=np.int16)
    code_to_int: dict[str, int] = {}
    nxt = 0
    for i, lang in enumerate(langs):
        src_id = lang[key]
        if not src_id:
            continue
        vec = by_lang.get(src_id, {})
        for fid, cid in vec.items():
            if fid not in index:
                continue
            if cid not in code_to_int:
                code_to_int[cid] = nxt
                nxt += 1
            mat[i, index[fid]] = code_to_int[cid]
    return mat, feats


def neighbor_payload(langs: list[dict], pairs: list[list[tuple[int, float, int]]]) -> dict[str, list[dict]]:
    out = {}
    for i, neigh in enumerate(pairs):
        out[langs[i]["id"]] = [
            {
                "id": langs[j]["id"],
                "name": langs[j]["name"],
                "score": round(score, 4),
                "nShared": n,
                "sameFamily": bool(langs[i]["familyId"] and langs[i]["familyId"] == langs[j]["familyId"]),
                "distanceKm": None
                if langs[i]["lat"] is None or langs[j]["lat"] is None
                else round(haversine_km(langs[i]["lat"], langs[i]["lon"], langs[j]["lat"], langs[j]["lon"]), 1),
            }
            for j, score, n in neigh
        ]
    return out


def geo_unrelated(langs: list[dict]) -> dict[str, list[dict]]:
    coords = [(i, lang) for i, lang in enumerate(langs) if lang["lat"] is not None and lang["lon"] is not None]
    out: dict[str, list[dict]] = {lang["id"]: [] for lang in langs}
    for i, a in coords:
        scored = []
        for j, b in coords:
            if i == j:
                continue
            if a["familyId"] and a["familyId"] == b["familyId"]:
                continue
            d = haversine_km(a["lat"], a["lon"], b["lat"], b["lon"])
            scored.append((d, j))
        scored.sort()
        out[a["id"]] = [
            {
                "id": langs[j]["id"],
                "name": langs[j]["name"],
                "score": None,
                "nShared": 0,
                "sameFamily": False,
                "distanceKm": round(d, 1),
            }
            for d, j in scored[:GEO_K]
        ]
    return out


def build_trees(langs: list[dict]) -> dict:
    trees: dict[str, dict] = {}
    for lang in langs:
        path = lang["familyPath"] or (
            [{"id": lang["familyId"], "name": lang["familyName"]}] if lang["familyId"] else []
        )
        if not path:
            fid = "isolate"
            node = trees.setdefault(fid, {"id": fid, "name": "Isolates and ungrouped", "children": {}})
        else:
            fid = path[0]["id"]
            node = trees.setdefault(fid, {"id": fid, "name": path[0]["name"], "children": {}})
            for step in path[1:]:
                node = node["children"].setdefault(
                    step["id"], {"id": step["id"], "name": step["name"], "children": {}}
                )
        node["children"][lang["id"]] = {
            "id": lang["id"],
            "name": lang["name"],
            "language": True,
            "children": {},
        }
    def freeze(n: dict) -> dict:
        kids = [freeze(c) for c in n["children"].values()]
        kids.sort(key=lambda x: x["name"].lower())
        out = {"id": n["id"], "name": clean_name(n.get("name"), n["id"]), "children": kids}
        if n.get("language"):
            out["language"] = True
        return out

    return {k: freeze(v) for k, v in trees.items()}


def genealogy_stats(langs: list[dict], pairs: list[list[tuple[int, float, int]]]) -> dict:
    buckets = Counter()
    sums = Counter()
    dist_bins = [(500, "0-500km"), (2000, "500-2000km"), (5000, "2000-5000km"), (10**9, "5000km+")]
    dist_n = Counter()
    dist_s = Counter()
    for i, neigh in enumerate(pairs):
        for j, score, _n in neigh[:5]:
            a, b = langs[i], langs[j]
            if a["genus"] and a["genus"] == b["genus"]:
                key = "sameGenus"
            elif a["familyId"] and a["familyId"] == b["familyId"]:
                key = "sameFamily"
            else:
                key = "differentFamily"
            buckets[key] += 1
            sums[key] += score
            if a["lat"] is None or b["lat"] is None:
                continue
            d = haversine_km(a["lat"], a["lon"], b["lat"], b["lon"])
            for limit, label in dist_bins:
                if d <= limit:
                    dist_n[label] += 1
                    dist_s[label] += score
                    break
    return {
        "byGenealogy": [
            {"key": k, "n": buckets[k], "mean": round(sums[k] / buckets[k], 4) if buckets[k] else 0}
            for k in ("sameGenus", "sameFamily", "differentFamily")
        ],
        "byDistance": [
            {"key": lab, "n": dist_n[lab], "mean": round(dist_s[lab] / dist_n[lab], 4) if dist_n[lab] else 0}
            for _, lab in dist_bins
        ],
        "note": "Means use each language's top structural neighbors. Missing data and large families bias the picture; treat as a teaching sketch, not a population parameter.",
    }


def associations(by_feat: dict[str, dict[str, str]], wals_id_to_gid: dict[str, str]) -> dict:
    focus = "wals:85A"
    others = [f for f in CURRICULUM if f != focus]
    out = {}
    base = {wals_id_to_gid.get(k, k): v for k, v in by_feat.get(focus, {}).items()}
    for other in others:
        joint: dict[tuple[str, str], int] = Counter()
        rows = Counter()
        cols = Counter()
        mapped = {wals_id_to_gid.get(k, k): v for k, v in by_feat.get(other, {}).items()}
        shared = set(base) & set(mapped)
        for gid in shared:
            a, b = base[gid], mapped[gid]
            joint[(a, b)] += 1
            rows[a] += 1
            cols[b] += 1
        row_ids = sorted(rows)
        col_ids = sorted(cols)
        table = np.zeros((len(row_ids), len(col_ids)), dtype=np.float64)
        for (a, b), n in joint.items():
            table[row_ids.index(a), col_ids.index(b)] = n
        cond = []
        for a in row_ids:
            total = rows[a]
            cond.append(
                {
                    "code": a,
                    "n": int(total),
                    "given": [
                        {"code": b, "p": round(joint[(a, b)] / total, 3), "n": joint[(a, b)]}
                        for b in col_ids
                        if joint[(a, b)]
                    ],
                }
            )
        out[other] = {
            "feature": other,
            "n": len(shared),
            "cramersV": round(cramers_v(table), 3),
            "rowCodes": row_ids,
            "colCodes": col_ids,
            "table": table.astype(int).tolist(),
            "conditional": cond,
        }
    return {"focus": focus, "pairs": out}


def macroarea_order(by_feat: dict[str, dict[str, str]], langs: list[dict], wals_id_to_gid: dict[str, str]) -> dict:
    gid_meta = {l["id"]: l for l in langs}
    counts: dict[str, Counter] = defaultdict(Counter)
    order = {wals_id_to_gid.get(k, k): v for k, v in by_feat.get("wals:81A", {}).items()}
    for gid, code in order.items():
        area = (gid_meta.get(gid) or {}).get("macroarea") or "Unknown"
        counts[area][code] += 1
    return {
        "feature": "wals:81A",
        "areas": [
            {"area": area, "codes": dict(c)}
            for area, c in sorted(counts.items(), key=lambda x: sum(x[1].values()), reverse=True)
        ],
    }


def remap_feature_values(
    by_feat: dict[str, dict[str, str]],
    id_map: dict[str, str],
    preferred: dict[str, str],
    richness: dict[str, int],
) -> dict[str, dict[str, str]]:
    remapped: dict[str, dict[str, str]] = {}
    for fid, mapping in by_feat.items():
        by_gid: dict[str, list[tuple[str, str]]] = defaultdict(list)
        for lid, cid in mapping.items():
            gid = id_map.get(lid)
            if not gid:
                if lid.startswith("wals-"):
                    gid = lid
                else:
                    continue
            by_gid[gid].append((lid, cid))
        out: dict[str, str] = {}
        for gid, pairs in by_gid.items():
            want = preferred.get(gid)
            pick = next((cid for lid, cid in pairs if lid == want), None)
            if pick is None:
                pick = max(pairs, key=lambda p: richness.get(p[0], 0))[1]
            out[gid] = pick
        remapped[fid] = out
    return remapped


def main() -> None:
    paths = load_paths()
    print("loading WALS")
    wals_langs, wals_feats, wals_by_feat, wals_by_lang = build_wals(paths["wals"])
    print("loading Grambank")
    gb_langs, gb_feats, gb_by_feat, gb_by_lang = build_grambank(paths["grambank"])
    print("loading Glottolog")
    glot_langs, class_paths, glot_names = load_glottolog(paths["glottolog"])

    langs, wals_id_to_gid, gb_id_to_gid = unify_languages(
        wals_langs, gb_langs, glot_langs, class_paths, glot_names, wals_by_lang, gb_by_lang
    )
    wals_preferred = {l["id"]: l["walsId"] for l in langs if l["walsId"]}
    gb_preferred = {l["id"]: l["gbId"] for l in langs if l["gbId"]}
    wals_rich = {lid: len(vec) for lid, vec in wals_by_lang.items()}
    gb_rich = {lid: len(vec) for lid, vec in gb_by_lang.items()}

    wals_by_feat_g = remap_feature_values(wals_by_feat, wals_id_to_gid, wals_preferred, wals_rich)
    gb_by_feat_g = remap_feature_values(gb_by_feat, gb_id_to_gid, gb_preferred, gb_rich)

    print(f"{len(langs)} languages")
    OUT.mkdir(parents=True, exist_ok=True)
    write_json(
        OUT / "features.json",
        {
            "curriculum": CURRICULUM,
            "hero": HERO,
            "defaultFeature": "wals:81A",
            "features": wals_feats + gb_feats,
        },
    )

    values_dir = OUT / "values"
    values_dir.mkdir(exist_ok=True)
    for fid, mapping in {**wals_by_feat_g, **gb_by_feat_g}.items():
        safe = fid.replace(":", "_")
        write_json(values_dir / f"{safe}.json", mapping)
    vectors: dict[str, dict[str, str]] = defaultdict(dict)
    for fid, mapping in {**wals_by_feat_g, **gb_by_feat_g}.items():
        for gid, cid in mapping.items():
            vectors[gid][fid] = cid
    for lang in langs:
        vec = vectors.get(lang["id"], {})
        lang["walsN"] = sum(1 for k in vec if k.startswith("wals:"))
        lang["grambankN"] = sum(1 for k in vec if k.startswith("gb:"))
    write_json(OUT / "languages.json", langs)
    write_json(OUT / "vectors.json", dict(vectors))

    print("similarity")
    wals_mat, _ = feature_matrix(langs, wals_by_lang, "walsId", "wals:")
    gb_mat, _ = feature_matrix(langs, gb_by_lang, "gbId", "gb:")
    combined = np.concatenate([wals_mat, gb_mat], axis=1) if gb_mat.size and wals_mat.size else wals_mat
    wals_nb = nearest_neighbors(wals_mat, MIN_WALS_OVERLAP, TOP_K)
    gb_nb = nearest_neighbors(gb_mat, MIN_GB_OVERLAP, TOP_K) if gb_mat.shape[1] else [[] for _ in langs]
    comb_nb = nearest_neighbors(combined, MIN_COMBINED_OVERLAP, TOP_K)
    geo_nb = geo_unrelated(langs)

    wals_pay = neighbor_payload(langs, wals_nb)
    gb_pay = neighbor_payload(langs, gb_nb)
    comb_pay = neighbor_payload(langs, comb_nb)
    neighbors = {
        lang["id"]: {
            "wals": wals_pay.get(lang["id"], []),
            "grambank": gb_pay.get(lang["id"], []),
            "combined": comb_pay.get(lang["id"], []),
            "geoUnrelated": geo_nb.get(lang["id"], []),
        }
        for lang in langs
    }
    write_json(OUT / "neighbors.json", neighbors)

    print("trees")
    trees = build_trees(langs)
    write_json(OUT / "trees.json", {"families": sorted(({ "id": k, "name": clean_name(v.get("name"), k)} for k, v in trees.items()), key=lambda x: x["name"].lower()), "trees": trees})

    print("stats")
    stats = {
        "sovMacroarea": macroarea_order(wals_by_feat_g, langs, {}),
        "postpositions": associations(wals_by_feat_g, {}),
        "genealogy": genealogy_stats(langs, comb_nb),
        "minOverlap": {"wals": MIN_WALS_OVERLAP, "grambank": MIN_GB_OVERLAP, "combined": MIN_COMBINED_OVERLAP},
        "sprachbundTours": [
            {
                "id": "mesoamerica",
                "name": "Mesoamerica",
                "seed": next((l["id"] for l in langs if l["id"] == "kich1262"), langs[0]["id"]),
                "blurb": "Mayan languages sit in a well-studied linguistic area. Compare genealogical relatives with nearby unrelated neighbors.",
            },
            {
                "id": "balkans",
                "name": "Balkans",
                "seed": next((l["id"] for l in langs if l["name"] == "Albanian" or l["iso"] == "sqi"), "gheg1238"),
                "blurb": "The Balkan Sprachbund is the textbook case of unrelated languages sharing structure through contact.",
            },
            {
                "id": "southasia",
                "name": "South Asia",
                "seed": next((l["id"] for l in langs if l["id"] == "hind1269" or l["name"] == "Hindi"), "hind1269"),
                "blurb": "South Asia shows long-range areal convergence (for example SOV and retroflexion) across families.",
            },
        ],
        "datasets": DATASETS,
    }
    write_json(OUT / "stats.json", stats)

    kiche = next((l for l in langs if l["id"] == "kich1262" or (l["name"] or "").lower().startswith("k'iche") or (l["name"] or "").lower().startswith("quiche")), None)
    print("K'iche' record:", json.dumps(kiche, ensure_ascii=False) if kiche else "NOT FOUND")
    spanish = next((l for l in langs if l["id"] == "stan1288"), None)
    print("Spanish record:", json.dumps(spanish, ensure_ascii=False) if spanish else "NOT FOUND")
    print("wrote", OUT)


if __name__ == "__main__":
    main()

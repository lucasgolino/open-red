#!/usr/bin/env node
/**
 * Merge two package.json files using only Node.js built-in modules.
 *
 * Usage:
 *   node merge-package-json.js package.base.json package.extra.json [output.json]
 *
 * Default output: package.json
 */

const fs = require("fs");
const path = require("path");

const [,, baseFile, extraFile, outFileArg] = process.argv;

if (!baseFile || !extraFile) {
  console.error("Usage: node merge-package-json.js <base.json> <extra.json> [output.json]");
  process.exit(1);
}

const outFile = outFileArg || "package.json";

function readJson(file) {
  const p = path.resolve(process.cwd(), file);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function isSpecialSpec(v) {
  if (typeof v !== "string") return true;
  return (
    v.startsWith("file:") ||
    v.startsWith("link:") ||
    v.startsWith("workspace:") ||
    v.startsWith("git+") ||
    v.startsWith("github:") ||
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("npm:") ||
    v.startsWith("patch:")
  );
}

// Extract a comparable numeric version triple from a version spec.
// Examples:
//   "^1.2.3" -> [1,2,3]
//   "~2.0.0" -> [2,0,0]
//   "1.2"    -> [1,2,0]
//   ">=1.2.3"-> [1,2,3] (best-effort)
// If can't parse -> null
function parseVersionTriple(spec) {
  if (typeof spec !== "string") return null;

  // Find the first occurrence of digits.digits(.digits)?
  const m = spec.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) return null;

  return [Number(m[1]), Number(m[2]), Number(m[3] || 0)];
}

function cmpTriple(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

// Decide which version string to keep between A (base) and B (extra)
function pickVersion(a, b) {
  if (a === b) return a;

  // Prefer "special" specs from extra if present
  const aSpecial = isSpecialSpec(a);
  const bSpecial = isSpecialSpec(b);
  if (bSpecial && !aSpecial) return b;
  if (aSpecial && !bSpecial) return a;
  if (aSpecial && bSpecial) return b; // prefer extra

  const pa = parseVersionTriple(a);
  const pb = parseVersionTriple(b);

  if (pa && pb) {
    // Pick higher numeric version
    const c = cmpTriple(pa, pb);
    if (c > 0) return a;
    if (c < 0) return b;

    // Same numeric version but different range operators: prefer "looser" (heuristic)
    // Order: "*" > "" > "^" > "~" > others (prefer extra if unclear)
    const score = (s) => {
      if (s.trim() === "*" ) return 5;
      const t = s.trim();
      if (/^\d/.test(t)) return 4;     // exact
      if (t.startsWith("^")) return 3;
      if (t.startsWith("~")) return 2;
      if (t.startsWith(">") || t.startsWith("<") || t.includes("||")) return 1;
      return 0;
    };

    const sa = score(a);
    const sb = score(b);
    if (sa > sb) return a;
    if (sb > sa) return b;
    return b; // tie -> prefer extra
  }

  // If we can't parse, prefer extra (assume it's intended)
  return b;
}

function mergeDepBlock(base = {}, extra = {}) {
  const out = { ...base };
  for (const [name, verB] of Object.entries(extra)) {
    const verA = out[name];
    out[name] = verA ? pickVersion(verA, verB) : verB;
  }

  // Sort keys for clean diffs
  return Object.fromEntries(
    Object.entries(out).sort(([a], [b]) => a.localeCompare(b))
  );
}

function mergePackage(basePkg, extraPkg) {
  return {
    ...basePkg, // keep base fields by default
    dependencies: mergeDepBlock(basePkg.dependencies, extraPkg.dependencies),
    devDependencies: mergeDepBlock(basePkg.devDependencies, extraPkg.devDependencies),
    peerDependencies: mergeDepBlock(basePkg.peerDependencies, extraPkg.peerDependencies),
    optionalDependencies: mergeDepBlock(basePkg.optionalDependencies, extraPkg.optionalDependencies),
  };
}

const base = readJson(baseFile);
const extra = readJson(extraFile);

const merged = mergePackage(base, extra);

fs.writeFileSync(path.resolve(process.cwd(), outFile), JSON.stringify(merged, null, 2) + "\n", "utf8");
console.log(`✅ Merged written to ${outFile}`);

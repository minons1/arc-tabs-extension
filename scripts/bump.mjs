import { readFileSync, writeFileSync } from "fs";

const arg = process.argv[2];

if (!["p", "mi", "ma"].includes(arg)) {
  console.error("Usage: pnpm bump <p|mi|ma>");
  console.error("  p  → patch  (0.2.0 → 0.2.1)");
  console.error("  mi → minor  (0.2.0 → 0.3.0)");
  console.error("  ma → major  (0.2.0 → 1.0.0)");
  process.exit(1);
}

// package.json is the source of truth
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);

const prev = pkg.version;

let next;
if (arg === "p")  next = `${major}.${minor}.${patch + 1}`;
if (arg === "mi") next = `${major}.${minor + 1}.0`;
if (arg === "ma") next = `${major + 1}.0.0`;

// Bump package.json
pkg.version = next;
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

// Sync manifest.json to match
const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8"));
manifest.version = next;
writeFileSync("public/manifest.json", JSON.stringify(manifest, null, 2) + "\n");

console.log(`v${prev} → v${next}`);

import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

const args = process.argv.slice(2)
const config = JSON.parse(readFileSync(new URL("../docgen.json", import.meta.url), "utf8"))
const configuredDocs = process.env.DOCGEN_GENERATE_DOCS === undefined
  ? config.generateDocs !== false
  : process.env.DOCGEN_GENERATE_DOCS !== "false"
const generateDocs = args.includes("--no-docs=false")
  ? true
  : configuredDocs && !args.some((arg) => arg === "--no-docs" || arg === "--no-docs=true")
const docgen = spawnSync(process.platform === "win32" ? "docgen.cmd" : "docgen", args, {
  stdio: "inherit",
  shell: false
})

if (docgen.status !== 0) {
  process.exitCode = docgen.status ?? 1
} else if (generateDocs && !args.some((arg) => arg === "--validate" || arg === "--validate=true")) {
  const docs = spawnSync(process.execPath, ["scripts/docs.mjs"], { stdio: "inherit" })
  process.exitCode = docs.status ?? 1
}

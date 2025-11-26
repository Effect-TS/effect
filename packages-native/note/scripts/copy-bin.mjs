import { chmod, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const pkgDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(pkgDir, "..")
const source = resolve(root, "build/esm/bin.js")
const target = resolve(root, "dist/bin.mjs")

let content
try {
  content = await readFile(source, "utf8")
} catch (error) {
  throw new Error(`note: expected ESM build at ${source}`, { cause: error })
}

await mkdir(dirname(target), { recursive: true })
await writeFile(target, content, "utf8")
await chmod(target, 0o755)

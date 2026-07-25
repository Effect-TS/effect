import { createRequire } from "node:module"
import { relative } from "node:path"
import { fileURLToPath } from "node:url"

const mode = process.argv[2] ?? "Import"
const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL(".", import.meta.url))
const specifiers = [
  "oracle-package",
  "oracle-package/exact",
  "oracle-package/import-default",
  "oracle-package/node-default",
  "oracle-package/node-before-import",
  "oracle-package/feature/a",
  "oracle-package/feature/special/a",
  "oracle-package/feature/private/a"
]

const results = {}
for (const specifier of specifiers) {
  try {
    const resolved = mode === "Import" ? import.meta.resolve(specifier) : require.resolve(specifier)
    const pathname = resolved.startsWith("file:") ? fileURLToPath(resolved) : resolved
    results[specifier] = `./${relative(root, pathname).replaceAll("\\", "/")}`
  } catch (error) {
    results[specifier] = error.code
  }
}
process.stdout.write(JSON.stringify(results))

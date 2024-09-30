import * as Glob from "glob"
import * as Fs from "node:fs"

const dirs = [".", ...Glob.sync("packages/*/")]
dirs.forEach((pkg) => {
  const files = [".tsbuildinfo", "docs", "build", "dist", "coverage", "node_modules"]

  files.forEach((file) => {
    if (pkg === "." && file === "docs") {
      return
    }

    Fs.rmSync(`${pkg}/${file}`, { recursive: true, force: true }, () => {})
  })
})

Glob.sync("docs/*/").forEach((dir) => {
  Fs.rmSync(dir, { recursive: true, force: true }, () => {})
})

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

export const writeFixturePackage = (
  repoRoot: string,
  files: Readonly<Record<string, string>>,
  exports: Readonly<Record<string, unknown>> = {
    ".": "./index.js",
    "./*": "./*.js",
    "./internal/*": null
  }
): void => {
  const root = join(repoRoot, "packages", "sample", "dist")
  mkdirSync(root, { recursive: true })
  writeFileSync(
    join(root, "package.json"),
    `${
      JSON.stringify(
        {
          name: "@fixture/sample",
          version: "1.0.0",
          exports
        },
        null,
        2
      )
    }\n`
  )
  for (const [name, source] of Object.entries(files)) {
    const path = join(root, name)
    mkdirSync(join(path, ".."), { recursive: true })
    writeFileSync(path, source)
  }
}

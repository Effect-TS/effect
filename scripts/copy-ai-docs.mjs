import * as Fs from "node:fs"
import * as Glob from "glob"
import * as Path from "node:path"

const source = "LLMS.md"
const targets = ["AGENTS.md", "CLAUDE.md"]

for (const packageJsonPath of Glob.globSync("packages/{*,*/*}/package.json")) {
  const packageJson = JSON.parse(Fs.readFileSync(packageJsonPath, "utf8"))
  if (packageJson.private) {
    continue
  }

  for (const target of targets) {
    if (!packageJson.files?.includes(target)) {
      throw new Error(`${packageJsonPath} must include ${target} in its files list`)
    }
    Fs.copyFileSync(source, Path.join(Path.dirname(packageJsonPath), target))
  }
}

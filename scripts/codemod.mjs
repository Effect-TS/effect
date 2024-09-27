// @ts-check
import * as Glob from "glob"
import jscodeshift from "jscodeshift/src/Runner.js"
import * as Fs from "node:fs"
import * as Path from "node:path"

const packageJsonPath = Path.resolve("package.json")
const packageJson = JSON.parse(Fs.readFileSync(packageJsonPath, "utf-8"))
const workspaces = Glob.globSync(packageJson["workspaces"])
const packages = workspaces.map((workspace) => workspace.replace("packages/", ""))
const pattern = `packages/{${packages.join(",")}}/src/**/*.ts`

const paths = Glob.globSync(pattern, {
  ignore: ["**/internal/**"]
}).map((path) => Path.resolve(path))

const transformer = Path.resolve("scripts/codemods/jsdoc.ts")

jscodeshift.run(Path.resolve(transformer), paths, {
  babel: true,
  parser: "ts"
})

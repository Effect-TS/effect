// @ts-check
import * as Glob from "glob"
import Jscodeshift from "jscodeshift/src/Runner.js"
import * as Path from "node:path"

// Look up files in all workspace packages including those nested in
// sub-packages (e.g. `packages/ai/openapi`).
const pattern = "packages/{*,*/*}/src/**/*.ts"

const paths = Glob.globSync(pattern, {
  ignore: ["**/internal/**"]
}).map((path) => Path.resolve(path))

const transformer = Path.resolve("scripts/codemods/jsdoc.ts")

Jscodeshift.run(transformer, paths, {
  babel: true,
  parser: "ts"
})

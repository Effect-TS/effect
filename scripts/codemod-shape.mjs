// @ts-check
// Rewrites a record service's name used as an implementation type to its `Shape`:
//
//   pnpm codemod:shape --module FileSystem packages/platform/node-shared/src packages/platform/deno/src
//
// See scripts/codemods/record-shape.ts for what is and is not rewritten.
import * as Glob from "glob"
import * as Jscodeshift from "jscodeshift/src/Runner.js"
import * as Path from "node:path"

const args = process.argv.slice(2)
const moduleIndex = args.indexOf("--module")
const module = moduleIndex === -1 ? "FileSystem" : args[moduleIndex + 1]
const roots = args.filter((arg, i) => arg !== "--module" && i !== moduleIndex + 1)
if (roots.length === 0) {
  console.error("usage: pnpm codemod:shape [--module FileSystem|Terminal] <path>...")
  process.exit(1)
}

const paths = roots.flatMap((root) =>
  root.endsWith(".ts") ? [root] : Glob.globSync(`${root}/**/*.ts`, { ignore: ["**/node_modules/**", "**/dist/**"] })
).map((path) => Path.resolve(path))

const transformer = Path.resolve("scripts/codemods/record-shape.ts")

Jscodeshift.run(transformer, paths, {
  babel: true,
  parser: "ts",
  module
})

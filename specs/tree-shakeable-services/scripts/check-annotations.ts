/**
 * The lint rule esbuild needs, as a script: every module-level declaration
 * whose initializer is a call to `Context.Operation`, `Stream.Operation`,
 * `Sink.Operation` or `Context.Operations` must carry a `@__PURE__`
 * annotation, so that a bundler which does not read the constructors'
 * `@__NO_SIDE_EFFECTS__` annotation across modules (esbuild) can still drop
 * the keys a program never references.
 *
 *   pnpm check-annotations
 *
 * The published `effect` build adds the annotation to every top-level call
 * (`babel-plugin-annotate-pure-calls`), so inside `packages/*` the rule is
 * about source-bundled consumers and the repository's own bundle tests; in
 * application code bundled from source with esbuild it is what keeps a
 * contract module free.
 */
import * as fs from "node:fs"
import * as path from "node:path"

const root = path.resolve(import.meta.dirname, "..")

const sources = (directory: string): Array<string> =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(path.join(directory, entry.name))
      : entry.name.endsWith(".ts")
      ? [path.join(directory, entry.name)]
      : []
  )

// A constructor call in initializer position: `=`, optional comments, then `Context.Operation(`,
// `Context.Operation<` (the curried form), `Stream.Operation`, `Sink.Operation` or `Context.Operations`. The comment
// group is what must carry the annotation. A real rule works on the AST; the text form is enough here because the
// contracts are formatted by dprint.
const constructorCall =
  /=\s*(?<comments>(?:\/\*[\s\S]*?\*\/\s*)*)(?<callee>(?:Context|Stream|Sink)\s*\.\s*Operations?)\s*[<(]/g
const declaredName = /(?:const|let|var)\s+(\w+)[^;]*?$/

let failures = 0
let checked = 0
for (const file of sources(path.join(root, "src"))) {
  const text = fs.readFileSync(file, "utf8")
  for (const match of text.matchAll(constructorCall)) {
    checked++
    if (!/@__PURE__/.test(match.groups!.comments)) {
      const before = text.slice(0, match.index)
      const name = declaredName.exec(before)?.[1] ?? "<unknown>"
      console.error(
        `${path.relative(root, file)}:${before.split("\n").length}: ${name} is not annotated /* @__PURE__ */`
      )
      failures++
    }
  }
}
if (failures > 0) process.exit(1)
console.log(`OK: every operation and record service in src is annotated /* @__PURE__ */ (${checked} declarations)`)

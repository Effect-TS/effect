/**
 * The same composition root, importing the implementation namespace and
 * reading the two layers off it. Member access on a namespace import is the
 * one object-property pattern bundlers do shake, so this root bundles the same
 * two implementations as `main.ts`. The bundle check builds it to prove that.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
// oxlint-disable-next-line effect/no-import-from-barrel-package -- this root exists to show that the namespace form tree-shakes too
import * as NodeFileSystem from "./node/index.ts"
import { backup } from "./program.ts"

const live = Layer.mergeAll(NodeFileSystem.readFile, NodeFileSystem.writeFile)

const path = process.argv[2] ?? "package.json"

Effect.runPromise(backup(path).pipe(Effect.provide(live))).then(
  (size) => process.stdout.write(`backed up ${size} bytes of ${path}\n`),
  (error) => {
    process.stderr.write(`${error}\n`)
    process.exit(1)
  }
)

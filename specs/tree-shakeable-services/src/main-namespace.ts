/**
 * The same composition root, importing the implementation module as a
 * namespace and reading the two layers off it. Member access on a namespace
 * import is the one object-property pattern bundlers shake, so this root
 * bundles the same two implementations as `main.ts`. The bundle check builds
 * it to prove that.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as NodeFileSystem from "./NodeFileSystem.ts"
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

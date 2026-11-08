/**
 * The same program provided with the coarse-grained layer: every operation,
 * as a record service would be provided today. The bundle check builds this
 * root as the baseline, to show that the saving in `main.ts` comes from
 * providing per operation and not from the program.
 */
import * as Effect from "effect/Effect"
import { layer } from "./NodeFileSystem.ts"
import { backup } from "./program.ts"

const path = process.argv[2] ?? "package.json"

Effect.runPromise(backup(path).pipe(Effect.provide(layer))).then(
  (size) => process.stdout.write(`backed up ${size} bytes of ${path}\n`),
  (error) => {
    process.stderr.write(`${error}\n`)
    process.exit(1)
  }
)

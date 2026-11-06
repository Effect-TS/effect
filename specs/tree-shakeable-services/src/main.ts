/**
 * The composition root. It provides exactly the operations the program
 * requires, imported by name from the one implementation module, so the
 * bundle contains exactly those implementations.
 *
 * If a provided layer is missing, the `Effect.runPromise` call below does not
 * compile: the missing operation's key is printed in the error.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { readFile, writeFile } from "./NodeFileSystem.ts"
import { backup } from "./program.ts"

const live = Layer.mergeAll(readFile, writeFile)

const path = process.argv[2] ?? "package.json"

Effect.runPromise(backup(path).pipe(Effect.provide(live))).then(
  (size) => process.stdout.write(`backed up ${size} bytes of ${path}\n`),
  (error) => {
    process.stderr.write(`${error}\n`)
    process.exit(1)
  }
)

/**
 * The composition root: it provides the two operations the program requires,
 * read off the implementations' namespace, so the bundle contains exactly
 * those two implementations. Run as `node main.js <file>`.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Node from "./node/index.ts"
import { backup } from "./program.ts"

const path = process.argv[2]

Effect.runPromise(backup(path).pipe(Effect.provide(Layer.mergeAll(Node.readFile, Node.writeFile)))).then(
  (size) => process.stdout.write(`backed up ${size} bytes of ${path}\n`),
  (error) => {
    process.stderr.write(`${error}\n`)
    process.exit(1)
  }
)

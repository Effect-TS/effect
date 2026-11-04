/**
 * The composition root for the read-only program: the three member layers
 * merged satisfy `ReadOnly` by plain assignability, so the bundle carries
 * three implementations. `node/layer.ts` would satisfy it too, at the cost of
 * all thirty.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { exists } from "./node/exists.ts"
import { readFile } from "./node/readFile.ts"
import { stat } from "./node/stat.ts"
import { sizeOf } from "./program-readonly.ts"

const path = process.argv[2] ?? "package.json"

Effect.runPromise(sizeOf(path).pipe(Effect.provide(Layer.mergeAll(exists, readFile, stat)))).then(
  (size) => process.stdout.write(`${path} is ${size} bytes\n`),
  (error) => {
    process.stderr.write(`${error}\n`)
    process.exit(1)
  }
)

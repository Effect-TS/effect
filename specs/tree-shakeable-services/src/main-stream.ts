/**
 * The composition root for the program that uses the Stream-returning
 * `stream` operation. The bundle check builds it to show that the Stream
 * runtime appears in a bundle when, and only when, a Stream operation is
 * used.
 */
import * as Effect from "effect/Effect"
import { stream } from "./NodeFileSystem.ts"
import { byteCount } from "./program-stream.ts"

const path = process.argv[2] ?? "package.json"

Effect.runPromise(byteCount(path).pipe(Effect.provide(stream))).then(
  (total) => process.stdout.write(`${path} has ${total} bytes\n`),
  (error) => {
    process.stderr.write(`${error}\n`)
    process.exit(1)
  }
)

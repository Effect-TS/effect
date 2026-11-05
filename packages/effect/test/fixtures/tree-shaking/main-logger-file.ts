/**
 * Writes a log line with `Logger.toFile`, provided with the one file system
 * operation it requires, `NodeFileSystem.open`. The bundle contains that
 * implementation and none of the other thirty-one.
 * Run as `node main.js <file>`; it appends to the file.
 */
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as Effect from "effect/Effect"
import * as Logger from "effect/Logger"

const path = process.argv[2]

const program = Effect.scoped(Effect.gen(function*() {
  const fileLogger = yield* Logger.toFile(Logger.formatSimple, path)
  yield* Effect.log("logged to a file").pipe(Effect.provide(Logger.layer([fileLogger])))
}))

Effect.runPromise(program.pipe(Effect.provide(NodeFileSystem.open))).then(
  () => process.stdout.write(`logged to ${path}\n`),
  (error) => {
    process.stderr.write(`${error}\n`)
    process.exit(1)
  }
)

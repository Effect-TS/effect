// Layer.succeed on an operation needs the service, not the operation, and the record service cannot be provided
// with a partial record.
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as FileSystem from "../../src/FileSystem.ts"

export const notTheService = Layer.succeed(FileSystem.readFile, () => Effect.succeed(new Uint8Array()))

export const partialRecord = Layer.succeed(FileSystem.FileSystem, {
  readFile: () => Effect.succeed(new Uint8Array())
})

// The record service cannot be provided with a partial record: the parameter is the whole shape.
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as FileSystem from "../../src/FileSystem.ts"

export const partialRecord = Layer.succeed(FileSystem.FileSystem, {
  readFile: () => Effect.succeed(new Uint8Array())
})

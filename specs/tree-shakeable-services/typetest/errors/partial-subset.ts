// A partial record given where a subset record's shape is expected: the diagnostic names the `Pick` alias.
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as FileSystem from "../../src/FileSystem.ts"

export const partial = Layer.succeed(FileSystem.ReadOnly, { readFile: () => Effect.succeed(new Uint8Array()) })

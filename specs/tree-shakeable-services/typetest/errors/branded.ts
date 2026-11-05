// Phase 0 of a migration: operations branded with an existing record service's identity. A layer of the record
// satisfies them; a member layer does not satisfy the record, and does not satisfy another branded member.
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

export interface Legacy {
  readonly readFile: (path: string) => Effect.Effect<string>
  readonly writeFile: (path: string, data: string) => Effect.Effect<void>
}
export const readFile = Context.Operation<Legacy["readFile"], Legacy>()("test/Legacy/readFile")
export const writeFile = Context.Operation<Legacy["writeFile"], Legacy>()("test/Legacy/writeFile")
export const Legacy = Context.Operations<Legacy, Legacy>()("test/Legacy", { readFile, writeFile })

const readFileLayer = Layer.succeed(readFile, () => Effect.succeed(""))

// a program over a branded operation, run unprovided: the requirement prints the brand with the key
Effect.runSync(readFile("a"))

// a member layer does not provide the record's identity
export const notTheRecord: Layer.Layer<Legacy> = readFileLayer

// nor another branded member
export const notAnother: Effect.Effect<void, never, never> = writeFile("a", "b").pipe(Effect.provide(readFileLayer))

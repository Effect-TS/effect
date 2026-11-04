// The identity passed to Context.Operations must be exactly the union of the members' identifiers, and the shape
// exactly the record of their shapes. The error names where they differ.
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import { readFile, writeFile } from "../../src/FileSystem.ts"

type Members = { readonly readFile: typeof readFile; readonly writeFile: typeof writeFile }
type Shape = Context.Operations.Shape<Members>

export const Partial = Context.Operations<"effect/FileSystem/readFile", Shape>()("test/Partial", {
  readFile,
  writeFile
})

export const WrongShape = Context.Operations<
  Context.Operations.Identifier<Members>,
  { readonly readFile: Shape["readFile"]; readonly writeFile: (path: string) => Effect.Effect<void> }
>()("test/WrongShape", { readFile, writeFile })

// The flat form without a type on the declaration has nothing to take the identity and shape from.
export const Unannotated = Context.Operations("test/Unannotated", { readFile, writeFile })
export const unannotatedOperation = Context.Operation("test/unannotated")

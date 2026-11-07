// The identifier given to Context.Operations<Self, Shape>() must contain every member's identifier, and the shape, if
// given, must be exactly the record of the members' shapes. The error lands on the key argument and names the
// difference. A record given no identifier is told to declare one.
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

export const Unknown = Context.Operations()("test/Unknown", { readFile, writeFile })

export const noShape = Context.Operation("test/noShape")

// The identity passed to Context.Operations must contain every member's identifier, and the shape must be exactly
// the record of the members' shapes. The error names where they differ. A declaration without a shape has nothing to
// take the shape from.
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import { readFile, writeFile } from "../../src/FileSystem.ts"

type Members = { readonly readFile: typeof readFile; readonly writeFile: typeof writeFile }
type Shape = Context.Operations.Shape<Members>

export const Partial: Context.Operations<"effect/FileSystem/readFile", Shape> = Context.Operations("test/Partial", {
  readFile,
  writeFile
})

export const WrongShape: Context.Operations<
  Context.Operations.Identifier<Members>,
  { readonly readFile: Shape["readFile"]; readonly writeFile: (path: string) => Effect.Effect<void> }
> = Context.Operations("test/WrongShape", { readFile, writeFile })

export const Unknown: Context.Operations<unknown, Shape> = Context.Operations("test/Unknown", { readFile, writeFile })

export const noShape = Context.Operation("test/noShape")

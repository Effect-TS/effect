import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as FileSystem from "effect/FileSystem"

const program = Effect.fnUntraced(function*(path: string) {
  const context = yield* Effect.context<FileSystem.FileSystem>()
  const fs = Context.getOrUndefinedUnsafe<FileSystem.FileSystem>(context, "effect/FileSystem")!
  const bytes = yield* fs.readFile(path)
  return `${bytes.length} copy: ${typeof fs.copy}`
})

export const main = (path: string): Promise<string> =>
  Effect.runPromise(Effect.provide(program(path), NodeFileSystem.layer))

import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"

const program = Effect.fnUntraced(function*(path: string) {
  const fs = yield* FileSystem.FileSystem
  const bytes = yield* fs.readFile(path)
  return `${bytes.length} ${Object.keys(fs).sort().join(",")}`
})

export const main = (path: string): Promise<string> =>
  Effect.runPromise(Effect.provide(program(path), NodeFileSystem.layer))

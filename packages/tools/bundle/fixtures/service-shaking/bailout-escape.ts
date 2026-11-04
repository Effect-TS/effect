import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"

const methodType = (fs: FileSystem.FileSystem, method: string): string => typeof Reflect.get(fs, method)

const program = Effect.fnUntraced(function*(path: string, method: string) {
  const fs = yield* FileSystem.FileSystem
  const bytes = yield* fs.readFile(path)
  return `${bytes.length} ${method}: ${methodType(fs, method)}`
})

export const main = (path: string, method: string): Promise<string> =>
  Effect.runPromise(Effect.provide(program(path, method), NodeFileSystem.layer))

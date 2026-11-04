import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"

const program = (path: string) =>
  Effect.context<FileSystem.FileSystem>().pipe(
    Effect.flatMap((context) => Context.get(context, FileSystem.FileSystem).readFile(path)),
    Effect.map((bytes) => `${bytes.length}`)
  )

export const main = (path: string): Promise<string> =>
  Effect.runPromise(Effect.provide(program(path), NodeFileSystem.layer))

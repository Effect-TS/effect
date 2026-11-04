import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"

const program = (path: string) => {
  const log: Array<string> = []

  const readLength = Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const bytes = yield* fs.readFile(path)
    return bytes.length
  })

  const Mock = Layer.effect(
    FileSystem.FileSystem,
    Effect.acquireRelease(
      Effect.sync(() => {
        log.push("mock acquired")
        return FileSystem.makeNoop({ readFile: () => Effect.succeed(new Uint8Array(3)) })
      }),
      () => Effect.sync(() => log.push("mock released"))
    )
  )

  return Effect.gen(function*() {
    log.push(`node ${yield* readLength}`)
    log.push(`mock ${yield* Effect.provide(readLength, Mock)}`)
    const updated = yield* readLength.pipe(
      Effect.updateService(FileSystem.FileSystem, (fs) => ({
        ...fs,
        readFile: (path) => Effect.map(fs.readFile(path), (bytes) => bytes.subarray(1))
      }))
    )
    log.push(`updated ${updated}`)
    return log.join("\n")
  })
}

export const main = (path: string): Promise<string> =>
  Effect.runPromise(Effect.provide(program(path), NodeFileSystem.layer))

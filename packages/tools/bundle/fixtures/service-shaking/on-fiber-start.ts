import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"

// `onFiberStart` hands the running Fiber, and so its Context, to user code.
let fiber: object | undefined
const copyType = () => {
  const services: ReadonlyMap<string, object> = Reflect.get(Reflect.get(fiber!, "context"), "mapUnsafe")
  return typeof Reflect.get(services.get("effect/FileSystem")!, "copy")
}

const program = Effect.fnUntraced(function*(path: string) {
  const fs = yield* FileSystem.FileSystem
  const bytes = yield* fs.readFile(path)
  return `${bytes.length} copy: ${copyType()}`
})

export const main = (path: string): Promise<string> =>
  Effect.runPromise(Effect.provide(program(path), NodeFileSystem.layer), {
    onFiberStart: (started) => {
      fiber = started
    }
  })

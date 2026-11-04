import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"

// A plain computed read, so this fixture only depends on the rule it targets.
const property = (target: object, key: string): any => (target as Record<string, any>)[key]

// The fiber returned by `runFork` is discarded, but `onFiberStart` still
// hands it to user code.
let fiber: object | undefined
const copyType = () => {
  const services: ReadonlyMap<string, object> = property(property(fiber!, "context"), "mapUnsafe")
  return typeof property(services.get("effect/FileSystem")!, "copy")
}

const program = Effect.fnUntraced(function*(path: string) {
  const fs = yield* FileSystem.FileSystem
  const bytes = yield* fs.readFile(path)
  return `${bytes.length} copy: ${copyType()}`
})

const main = (path: string): Promise<string> =>
  new Promise((resolve) => {
    Effect.runFork(Effect.provide(Effect.map(program(path), resolve), NodeFileSystem.layer), {
      onFiberStart: (started) => {
        fiber = started
      }
    })
  })

// A closed program: it exports nothing and prints its result.
main(process.argv[2]!).then((output) => console.log(output))

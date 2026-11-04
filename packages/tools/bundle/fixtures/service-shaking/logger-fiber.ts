import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"

// A plain computed read, so this fixture only depends on the rule it targets.
const property = (target: object, key: string): any => (target as Record<string, any>)[key]

// A logger receives the current Fiber, whose Context holds the FileSystem.
const seen: Array<string> = []
const logger = Logger.make((options) => {
  const services: ReadonlyMap<string, object> = property(property(options.fiber, "context"), "mapUnsafe")
  seen.push(`copy: ${typeof property(services.get("effect/FileSystem")!, "copy")}`)
})

const program = Effect.fnUntraced(function*(path: string) {
  const fs = yield* FileSystem.FileSystem
  const bytes = yield* fs.readFile(path)
  yield* Effect.log("read")
  return `${bytes.length} ${seen.join(",")}`
})

const main = (path: string): Promise<string> =>
  Effect.runPromise(Effect.provide(program(path), Layer.mergeAll(NodeFileSystem.layer, Logger.layer([logger]))))

// A closed program: it exports nothing and prints its result.
main(process.argv[2]!).then((output) => console.log(output))

import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"

// A plain computed read, so this fixture only depends on the rule it targets.
const property = (target: object, key: string): any => (target as Record<string, any>)[key]

const methodType = (fs: FileSystem.FileSystem, method: string): string => typeof property(fs, method)

const program = Effect.fnUntraced(function*(path: string, method: string) {
  const fs = yield* FileSystem.FileSystem
  const bytes = yield* fs.readFile(path)
  return `${bytes.length} ${method}: ${methodType(fs, method)}`
})

const main = (path: string, method: string): Promise<string> =>
  Effect.runPromise(Effect.provide(program(path, method), NodeFileSystem.layer))

// A closed program: it exports nothing and prints its result.
main(process.argv[2]!, process.argv[3]!).then((output) => console.log(output))

import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"

const program = (path: string) =>
  Effect.all([
    FileSystem.FileSystem.use((fs) => fs.readFile(path)),
    Effect.flatMap(FileSystem.FileSystem, (fs) => fs.readFile(path)),
    FileSystem.FileSystem.pipe(Effect.flatMap((fs) => fs.readFile(path)))
  ]).pipe(Effect.map((results) => results.map((bytes) => bytes.length).join(",")))

const main = (path: string): Promise<string> => Effect.runPromise(Effect.provide(program(path), NodeFileSystem.layer))

// A closed program: it exports nothing and prints its result.
main(process.argv[2]!).then((output) => console.log(output))

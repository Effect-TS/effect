/**
 * Serves a file with `HttpServerResponse.file` through the portable
 * `HttpPlatform.layer`, provided with only the two file system operations
 * that layer requires: `NodeFileSystem.stat` and `NodeFileSystem.stream`.
 * The bundle contains those implementations (and `open`, which `stream` is
 * built on) and none of the others.
 * Run as `node main.js <file>`; it prints the file's contents.
 */
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as Effect from "effect/Effect"
import * as HttpPlatform from "effect/http/HttpPlatform"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import * as Layer from "effect/Layer"

const path = process.argv[2]

// `HttpPlatform.layer` requires exactly these two operations
const fileSystem: Layer.Layer<"effect/FileSystem/stat" | "effect/FileSystem/stream"> = Layer.mergeAll(
  NodeFileSystem.stat,
  NodeFileSystem.stream
)
const PlatformLive = HttpPlatform.layer.pipe(Layer.provide(fileSystem))

const program = Effect.gen(function*() {
  const response = yield* HttpServerResponse.file(path)
  return yield* Effect.promise(() => HttpServerResponse.toWeb(response).text())
})

Effect.runPromise(program.pipe(Effect.provide(PlatformLive))).then(
  (body) => process.stdout.write(`served ${body}\n`),
  (error) => {
    process.stderr.write(`${error}\n`)
    process.exit(1)
  }
)

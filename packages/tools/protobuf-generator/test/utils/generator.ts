/**
 * Helpers for the `generate` contract tests: building plugin requests from
 * descriptors written in their protobuf JSON form, as protoc would send them,
 * and importing the generated modules from a scratch directory.
 */
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Generator from "@effect/protobuf-generator/Generator"
import { assert } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import * as ProtobufJson from "effect/protobuf/ProtobufJson"
import { CodeGeneratorRequest, type CodeGeneratorResponse } from "effect/protobuf/ProtobufPlugin"
import * as Schema from "effect/Schema"
import { fileURLToPath, pathToFileURL } from "node:url"

/** A `CodeGeneratorRequest` from its protobuf JSON form. */
export const request = (json: {
  readonly fileToGenerate: ReadonlyArray<string>
  readonly parameter?: string
  readonly protoFile: ReadonlyArray<unknown>
}): CodeGeneratorRequest => Schema.decodeUnknownSync(ProtobufJson.toCodec(CodeGeneratorRequest))(json)

/** The files of a successful response, by name. */
export const files = (response: CodeGeneratorResponse): Record<string, string> => {
  assert.strictEqual(response.error, undefined)
  return Object.fromEntries(response.file.map((file) => [file.name ?? "", file.content ?? ""]))
}

export const generateFiles = (json: Parameters<typeof request>[0]): Record<string, string> =>
  files(Generator.generate(request(json)))

const tmpRoot = fileURLToPath(new URL("../.tmp", import.meta.url))

/**
 * Writes `modules` (relative path to contents) to a fresh directory under
 * `test/.tmp` and imports `entry` from it. The directory is removed afterwards.
 */
export const importModule = (modules: Readonly<Record<string, string>>, entry: string): Promise<any> =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    yield* fs.makeDirectory(tmpRoot, { recursive: true })
    const dir = yield* fs.makeTempDirectoryScoped({ directory: tmpRoot, prefix: "generated-" })
    for (const [relative, content] of Object.entries(modules)) {
      const file = path.join(dir, relative)
      yield* fs.makeDirectory(path.dirname(file), { recursive: true })
      yield* fs.writeFileString(file, content)
    }
    return yield* Effect.promise((): Promise<any> => import(pathToFileURL(path.join(dir, entry)).href))
  }).pipe(Effect.scoped, Effect.provide(NodeServices.layer), Effect.runPromise)

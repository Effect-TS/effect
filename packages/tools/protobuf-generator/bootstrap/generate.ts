/**
 * Generates `descriptor.proto` and `plugin.proto` into
 * `packages/effect/src/protobuf/internal/generated`, which
 * `effect/protobuf/ProtobufDescriptor` and `effect/protobuf/ProtobufPlugin`
 * re-export. It answers the request buf would send, from `descriptor-set.binpb`,
 * and writes the files of the response. With `--check`, it writes nothing and
 * exits with code `1` if a file is out of date.
 *
 * `descriptor-set.binpb` holds descriptor.proto and plugin.proto of protoc 36.2
 * with their comments:
 *
 *   protoc --include_source_info --descriptor_set_out=descriptor-set.binpb \
 *     -I <protoc>/include google/protobuf/descriptor.proto google/protobuf/compiler/plugin.proto
 */
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { generate } from "@effect/protobuf-generator/Generator"
import * as Command from "effect/cli/Command"
import * as Flag from "effect/cli/Flag"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import * as Protobuf from "effect/protobuf/Protobuf"
import { FileDescriptorSet } from "effect/protobuf/ProtobufDescriptor"
import * as Schema from "effect/Schema"

const command = Command.make(
  "bootstrap",
  { check: Flag.Boolean("check").pipe(Flag.withDefault(false)) },
  ({ check }) =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const here = yield* path.fromFileUrl(new URL(".", import.meta.url))
      const out = path.join(here, "../../../effect/src/protobuf/internal/generated")
      const set = yield* fs.readFile(path.join(here, "descriptor-set.binpb")).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(Protobuf.toCodec(FileDescriptorSet)))
      )
      const response = generate({
        fileToGenerate: ["google/protobuf/descriptor.proto", "google/protobuf/compiler/plugin.proto"],
        parameter: "import_extension=ts",
        protoFile: set.file,
        sourceFileDescriptors: []
      })
      if (response.error !== undefined) return yield* Effect.die(response.error)
      let stale = 0
      for (const file of response.file) {
        const target = path.join(out, file.name!)
        const current = yield* fs.readFileString(target).pipe(Effect.orElseSucceed(() => undefined))
        if (current === file.content) continue
        stale++
        yield* Console.log(`${check ? "out of date" : "wrote"}: ${path.relative(process.cwd(), target)}`)
        if (check) continue
        yield* fs.makeDirectory(path.dirname(target), { recursive: true })
        yield* fs.writeFileString(target, file.content!)
      }
      if (check && stale > 0) return yield* Effect.fail(new Error("run: pnpm bootstrap"))
    })
)

Command.run(command, { version: "0.0.0" }).pipe(
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain
)

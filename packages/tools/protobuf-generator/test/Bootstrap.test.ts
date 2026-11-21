/**
 * `protoc-gen-effect` is self-hosted: effect/protobuf's `ProtobufDescriptorProto`
 * and `ProtobufPluginProto`, which it resolves and reads its requests with,
 * re-export its plain output for `descriptor.proto` and `plugin.proto`.
 * `pnpm bootstrap` regenerates that output through buf.
 */
import * as Generator from "@effect/protobuf-generator/Generator"
import { assert, describe, it } from "@effect/vitest"
import { readFileSync } from "node:fs"
import { bootstrapSet, files } from "./utils/generator.ts"

const checkedIn = (name: string) =>
  readFileSync(new URL(`../../../effect/src/protobuf/internal/generated/${name}`, import.meta.url), "utf8")

describe("bootstrap", () => {
  it("effect/protobuf's generated definitions are up to date", () => {
    const generated = files(Generator.generate({
      file_to_generate: ["google/protobuf/descriptor.proto", "google/protobuf/compiler/plugin.proto"],
      parameter: "import_extension=ts",
      proto_file: bootstrapSet
    }))
    assert.deepStrictEqual(Object.keys(generated), [
      "google/protobuf/descriptor.proto.ts",
      "google/protobuf/compiler/plugin.proto.ts"
    ])
    for (const [name, content] of Object.entries(generated)) {
      assert.strictEqual(content, checkedIn(name), `${name} is stale: run pnpm bootstrap`)
    }
  })
})

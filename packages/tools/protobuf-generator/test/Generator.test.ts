import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Generator from "@effect/protobuf-generator/Generator"
import { assert, describe, it } from "@effect/vitest"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import * as Protobuf from "effect/protobuf/Protobuf"
import * as ProtobufDescriptor from "effect/protobuf/ProtobufDescriptor"
import * as Schema from "effect/Schema"
import { fileURLToPath } from "node:url"
import { files, generateFiles, importModule, request } from "./utils/generator.ts"

const bytes = (hex: string) => new Uint8Array(Buffer.from(hex.replaceAll(" ", ""), "hex"))

// Generated modules are imported untyped.
const decode = (schema: Schema.Codec<unknown>, hex: string): unknown =>
  Schema.decodeUnknownSync(Protobuf.toCodec(schema))(bytes(hex))

const scalar = (name: string, number: number, type: string, extra: object = {}) => ({
  name,
  number,
  label: "LABEL_OPTIONAL",
  type,
  jsonName: name.replace(/_(.)/g, (_, c: string) => c.toUpperCase()),
  ...extra
})

const message = (name: string, number: number, typeName: string) => scalar(name, number, "TYPE_MESSAGE", { typeName })

// message A { int32 x = 1; } and message B { int32 y = 1; } in their own files
const a = {
  name: "a.proto",
  package: "a",
  syntax: "proto3",
  messageType: [{ name: "A", field: [scalar("x", 1, "TYPE_INT32")] }]
}
const b = {
  name: "b.proto",
  package: "b",
  syntax: "proto3",
  messageType: [{ name: "B", field: [scalar("y", 1, "TYPE_INT32")] }]
}

describe("Generator", () => {
  it.effect("reproduces the descriptor modules of effect from their descriptor set", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = fileURLToPath(new URL("..", import.meta.url))
      const set = Schema.decodeSync(Protobuf.toCodec(ProtobufDescriptor.FileDescriptorSet))(
        new Uint8Array(yield* fs.readFile(path.join(root, "bootstrap/descriptor-set.binpb")))
      )
      const response = Generator.generate({
        fileToGenerate: ["google/protobuf/descriptor.proto", "google/protobuf/compiler/plugin.proto"],
        parameter: "import_extension=ts",
        protoFile: set.file,
        sourceFileDescriptors: []
      })
      const generated = path.join(root, "../../effect/src/protobuf/internal/generated")
      for (const [name, content] of Object.entries(files(response))) {
        assert.strictEqual(content, yield* fs.readFileString(path.join(generated, name)), name)
      }
      assert.strictEqual(response.file.length, 2)
    }).pipe(Effect.provide(NodeServices.layer)))

  it("generates modules that import each other and decode the wire format", async () => {
    // syntax = "proto3"; package acme.common.v1; message Id { string value = 1; }
    const id = {
      name: "acme/common/v1/id.proto",
      package: "acme.common.v1",
      syntax: "proto3",
      messageType: [{ name: "Id", field: [scalar("value", 1, "TYPE_STRING")] }]
    }
    // syntax = "proto3"; package acme.v1;
    // message User {
    //   enum Role { ROLE_UNSPECIFIED = 0; ROLE_ADMIN = 1; }
    //   acme.common.v1.Id id = 1;
    //   Role role = 2;
    //   google.protobuf.Timestamp created_at = 3;
    //   oneof contact { string email = 4; string phone = 5; }
    // }
    const user = {
      name: "acme/v1/user.proto",
      package: "acme.v1",
      syntax: "proto3",
      dependency: ["acme/common/v1/id.proto", "google/protobuf/timestamp.proto"],
      messageType: [{
        name: "User",
        field: [
          message("id", 1, ".acme.common.v1.Id"),
          scalar("role", 2, "TYPE_ENUM", { typeName: ".acme.v1.User.Role" }),
          message("created_at", 3, ".google.protobuf.Timestamp"),
          scalar("email", 4, "TYPE_STRING", { oneofIndex: 0 }),
          scalar("phone", 5, "TYPE_STRING", { oneofIndex: 0 })
        ],
        oneofDecl: [{ name: "contact" }],
        enumType: [{
          name: "Role",
          value: [{ name: "ROLE_UNSPECIFIED", number: 0 }, { name: "ROLE_ADMIN", number: 1 }]
        }]
      }]
    }
    const generated = generateFiles({ fileToGenerate: [id.name, user.name], protoFile: [id, user] })
    assert.deepStrictEqual(Object.keys(generated), ["acme/common/v1/id.proto.ts", "acme/v1/user.proto.ts"])
    assert.include(generated["acme/v1/user.proto.ts"], `from "../common/v1/id.proto.js"`)

    const module = await importModule(generated, "acme/v1/user.proto.ts")
    assert.deepStrictEqual(decode(module.User, "0a04 0a027531 1001 1a02 0801 2203 614078"), {
      id: { value: "u1" },
      role: "ROLE_ADMIN",
      createdAt: DateTime.makeUnsafe(1000),
      contact: { _tag: "email", value: "a@x" }
    })
    assert.isTrue(module.registry.messages.has("acme.common.v1.Id"))
    assert.isTrue(module.registry.messages.has("google.protobuf.Timestamp"))
  })

  it("imports files mapped to one module from that module instead of generating them", async () => {
    const libraries = generateFiles({ fileToGenerate: [a.name, b.name], protoFile: [a, b] })
    const common = [
      `import * as Protobuf from "effect/protobuf/Protobuf"`,
      `import * as a from "./a.proto.ts"`,
      `import * as b from "./b.proto.ts"`,
      "export const A = a.A",
      "export const B = b.B",
      "export const registry = Protobuf.registry(a.registry, b.registry)"
    ].join("\n")
    // syntax = "proto3"; package c; message C { a.A a = 1; b.B b = 2; }
    const c = {
      name: "c.proto",
      package: "c",
      syntax: "proto3",
      dependency: ["a.proto", "b.proto"],
      messageType: [{ name: "C", field: [message("a", 1, ".a.A"), message("b", 2, ".b.B")] }]
    }
    const generated = generateFiles({
      fileToGenerate: [a.name, c.name],
      parameter: "proto_map=a.proto=./common.ts,proto_map=b.proto=./common.ts",
      protoFile: [a, b, c]
    })
    assert.deepStrictEqual(Object.keys(generated), ["c.proto.ts"])

    const module = await importModule({ ...libraries, "common.ts": common, ...generated }, "c.proto.ts")
    assert.deepStrictEqual(decode(module.C, "0a02 0801 1202 0802"), { a: { x: 1 }, b: { y: 2 } })
    assert.isTrue(module.registry.messages.has("a.A"))
    assert.isTrue(module.registry.messages.has("b.B"))
  })

  it("imports a file whose path starts with a digit", async () => {
    const numeric = { ...a, name: "123/numeric.proto" }
    // syntax = "proto3"; package main; import "123/numeric.proto"; message Main { a.A a = 1; }
    const main = {
      name: "main.proto",
      package: "main",
      syntax: "proto3",
      dependency: [numeric.name],
      messageType: [{ name: "Main", field: [message("a", 1, ".a.A")] }]
    }
    const generated = generateFiles({ fileToGenerate: [numeric.name, main.name], protoFile: [numeric, main] })
    const module = await importModule(generated, "main.proto.ts")
    assert.deepStrictEqual(decode(module.Main, "0a02 0807"), { a: { x: 7 } })
  })

  it("reports oneof cases that would get the same property key", () => {
    // syntax = "proto2"; message Choice { oneof choice { int32 foo_bar = 1; int32 fooBar = 2; } }
    const choice = {
      name: "choice.proto",
      syntax: "proto2",
      messageType: [{
        name: "Choice",
        field: [
          scalar("foo_bar", 1, "TYPE_INT32", { oneofIndex: 0 }),
          scalar("fooBar", 2, "TYPE_INT32", { oneofIndex: 0 })
        ],
        oneofDecl: [{ name: "choice" }]
      }]
    }
    const response = Generator.generate(request({ fileToGenerate: [choice.name], protoFile: [choice] }))
    assert.match(response.error ?? "", /fooBar/)
    assert.deepStrictEqual(response.file, [])
  })

  it("reports invalid parameters in the response, which still declares the supported features", () => {
    const response = Generator.generate(
      request({ fileToGenerate: [a.name], parameter: "import_extension=mjs", protoFile: [a] })
    )
    assert.match(response.error ?? "", /^invalid plugin parameters/)
    assert.deepStrictEqual({ ...response, error: undefined }, {
      // FEATURE_PROTO3_OPTIONAL | FEATURE_SUPPORTS_EDITIONS, from EDITION_PROTO2 to EDITION_2024
      supportedFeatures: 3n,
      minimumEdition: 998,
      maximumEdition: 1001,
      error: undefined,
      file: []
    })
  })
})

import { assert, describe, it } from "@effect/vitest"
import { ProtobufDescriptor, ProtobufMessage } from "effect/protobuf"
import * as Result from "effect/Result"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { field, message, registry, T } from "./descriptors.ts"

const fieldOf = (typeName: string, name: string): ProtobufDescriptor.FieldDescriptor => {
  const found = message(typeName).fields.find((f) => f.name === name)
  if (found === undefined) throw new Error(`no field ${typeName}.${name}`)
  return found
}

// The properties of a field that its syntax or edition and features decide.
const resolved = (f: ProtobufDescriptor.FieldDescriptor) => ({
  kind: f.kind,
  ...(f.kind === "singular" ? { presence: f.presence } : {}),
  ...(f.kind === "list" ? { packed: f.packed } : {}),
  ...(f.type.kind === "scalar" ? { validateUtf8: f.type.validateUtf8, jsType: f.type.jsType } : {}),
  ...(f.type.kind === "message" ? { delimited: f.type.delimited } : {}),
  ...(f.type.kind === "enum" ? { open: f.type.enum.open } : {})
})

describe("ProtobufDescriptor", () => {
  describe("resolves fields", () => {
    const string = { validateUtf8: true, jsType: "bigint" }
    const cases: ReadonlyArray<readonly [string, string, object]> = [
      ["test.Scalars", "int32", { kind: "singular", presence: "implicit", ...string }],
      ["test.Optional", "a", { kind: "singular", presence: "explicit", ...string }],
      ["test.Shape", "origin", { kind: "singular", presence: "explicit", delimited: false }],
      ["test.Shape", "label", { kind: "singular", presence: "explicit", ...string }],
      ["test.Shape", "ids", { kind: "list", packed: true, ...string }],
      ["test.Shape", "tags", { kind: "list", packed: false, ...string }],
      ["test.Shape", "color", { kind: "singular", presence: "implicit", open: true }],
      ["test.Js", "as_string", { kind: "singular", presence: "implicit", validateUtf8: true, jsType: "string" }],
      ["test.Js", "as_number", { kind: "singular", presence: "implicit", validateUtf8: true, jsType: "number" }],
      ["legacy.Legacy", "id", { kind: "singular", presence: "required", validateUtf8: false, jsType: "bigint" }],
      ["legacy.Legacy", "name", { kind: "singular", presence: "explicit", validateUtf8: false, jsType: "bigint" }],
      ["legacy.Legacy", "values", { kind: "list", packed: false, validateUtf8: false, jsType: "bigint" }],
      ["legacy.Legacy", "item", { kind: "singular", presence: "explicit", delimited: true }],
      ["legacy.Legacy", "mode", { kind: "singular", presence: "explicit", open: false }],
      ["legacy.Legacy", "modes", { kind: "list", packed: true, open: false }],
      ["editions.E", "a", { kind: "singular", presence: "explicit", ...string }],
      ["editions.E", "b", { kind: "singular", presence: "implicit", ...string }],
      ["editions.E", "c", { kind: "list", packed: true, ...string }],
      ["editions.E", "d", { kind: "singular", presence: "explicit", delimited: true }],
      ["editions.E", "e", { kind: "singular", presence: "explicit", open: false }]
    ]
    for (const [typeName, name, expected] of cases) {
      it(`${typeName}.${name}`, () => {
        assert.deepStrictEqual(resolved(fieldOf(typeName, name)), expected)
      })
    }
  })

  it("resolves map fields, and hides their entry messages", () => {
    const counts = fieldOf("test.Shape", "counts")
    assert.strictEqual(counts.kind, "map")
    if (counts.kind !== "map") return
    assert.strictEqual(counts.key.scalar, "string")
    assert.deepStrictEqual(counts.type.kind === "scalar" && counts.type.scalar, "int32")
    assert.isUndefined(registry.getMessage("test.Shape.CountsEntry"))
    assert.deepStrictEqual(message("test.Shape").messages, [])
  })

  it("keeps oneofs, but not the synthetic oneofs of proto3 optional fields", () => {
    const shape = message("test.Shape")
    assert.deepStrictEqual(shape.oneofs.map((o) => [o.localName, o.fields.map((f) => f.localName)]), [
      ["kind", ["label", "center"]]
    ])
    assert.deepStrictEqual(message("test.Optional").oneofs, [])
    assert.isUndefined(fieldOf("test.Optional", "a").oneof)
  })

  it("names fields in lowerCamelCase, and escapes Object.prototype properties", () => {
    assert.deepStrictEqual(
      message("test.Names").fields.map((f) => [f.localName, f.jsonName]),
      [["constructor$", "constructor"], ["fooBar", "fooBar"]]
    )
  })

  it("resolves services, extensions and enums", () => {
    const service = registry.getService("test.Shapes")!
    assert.deepStrictEqual(
      service.methods.map((m) => [m.name, m.input.typeName, m.output.typeName, m.serverStreaming, m.idempotency]),
      [["Get", "test.Point", "test.Shape", false, "noSideEffects"], [
        "Watch",
        "test.Point",
        "test.Shape",
        true,
        "unknown"
      ]]
    )
    const priority = registry.getExtension("legacy.priority")!
    assert.strictEqual(registry.findExtension("legacy.Legacy", 100), priority)
    assert.strictEqual(priority.extendee, message("legacy.Legacy"))
    const member = registry.getExtension("legacy.SetMember.member")!
    assert.strictEqual(member.parent, message("legacy.SetMember"))
    assert.isTrue(member.extendee.messageSetWireFormat)
    assert.deepStrictEqual(registry.getEnum("legacy.Mode")!.values.map((v) => [v.name, v.number]), [["A", 1], ["B", 2]])
  })

  describe("fails to resolve", () => {
    const point = { name: "Point", field: [field("x", 1, "int32")] }
    const cases: ReadonlyArray<readonly [string, ReadonlyArray<ProtobufDescriptor.FileDescriptorProto>, string]> = [
      [
        "a missing dependency",
        [{ name: "a.proto", dependency: ["b.proto"] }],
        "a.proto imports b.proto, which is missing"
      ],
      [
        "an import cycle",
        [{ name: "a.proto", dependency: ["b.proto"] }, { name: "b.proto", dependency: ["a.proto"] }],
        "a.proto is part of an import cycle"
      ],
      [
        "an undefined type",
        [{ name: "a.proto", messageType: [{ name: "A", field: [field("f", 1, ".x.Missing")] }] }],
        "A.f: message x.Missing is not defined"
      ],
      ["a relative type name", [{
        name: "a.proto",
        messageType: [
          { name: "A", field: [{ name: "f", number: 1, label: 1, type: T.message, typeName: "Point" }] },
          point
        ]
      }], "A.f: expected a fully qualified type name, got Point"],
      [
        "an unsupported edition",
        [{ name: "a.proto", syntax: "editions", edition: 1002 }],
        "a.proto: edition 1002 is not supported"
      ],
      [
        "a type defined twice",
        [{ name: "a.proto", messageType: [point] }, { name: "b.proto", messageType: [point] }],
        "Point is defined twice"
      ]
    ]
    for (const [name, files, message_] of cases) {
      it(name, () => {
        const result = ProtobufDescriptor.make(files)
        assert.isTrue(Result.isFailure(result))
        if (Result.isFailure(result)) assert.strictEqual(result.failure.message, message_)
      })
    }
  })

  describe("descriptor sets", () => {
    // `protoc --descriptor_set_out --include_source_info` of protoc 36.2, for
    // google/protobuf/descriptor.proto and google/protobuf/compiler/plugin.proto.
    const bytes = readFileSync(fileURLToPath(new URL("../fixtures/protobuf/descriptor-set.binpb", import.meta.url)))
    const { FileDescriptorProto, FileDescriptorSet } = ProtobufDescriptor

    it("resolves the files of a descriptor set", () => {
      const resolved = Result.getOrThrow(ProtobufDescriptor.fromFileDescriptorSet(bytes))
      assert.deepStrictEqual(resolved.files.map((f) => [f.name, f.edition]), [
        ["google/protobuf/descriptor.proto", "proto2"],
        ["google/protobuf/compiler/plugin.proto", "proto2"]
      ])
      const request = resolved.getMessage("google.protobuf.compiler.CodeGeneratorRequest")!
      assert.deepStrictEqual(
        request.fields.map((f) =>
          f.kind === "list" || f.type.kind !== "message" ? f.localName : f.type.message.typeName
        ),
        ["fileToGenerate", "parameter", "protoFile", "sourceFileDescriptors", "google.protobuf.compiler.Version"]
      )
    })

    it("encodes a decoded descriptor set to the same bytes", () => {
      const set = Result.getOrThrow(ProtobufMessage.decode(FileDescriptorSet)(bytes))
      const comments = (set.file as any)[0].sourceCodeInfo.location.filter((l: any) => l.leadingComments !== undefined)
      assert.isTrue(comments.length > 0)
      assert.deepStrictEqual(Result.getOrThrow(ProtobufMessage.encode(FileDescriptorSet)(set)), new Uint8Array(bytes))
    })

    it("has descriptor.proto as protoc describes it", () => {
      // Equal encodings also mean that `descriptorFile` describes every field of
      // protoc's descriptor.proto: fields it lacks would be decoded as unknown
      // fields of `protoc` and written back.
      const encode = ProtobufMessage.encode(FileDescriptorProto)
      const set = Result.getOrThrow(ProtobufMessage.decode(FileDescriptorSet)(bytes))
      const { sourceCodeInfo: _, ...protoc } = (set.file as any)[0]
      assert.deepStrictEqual(
        Result.getOrThrow(encode(ProtobufDescriptor.descriptorFile.proto)),
        Result.getOrThrow(encode(protoc))
      )
    })

    it("fails for malformed bytes", () => {
      const result = ProtobufDescriptor.fromFileDescriptorSet(new Uint8Array([0x0a, 0x05]))
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) {
        assert.strictEqual(result.failure.message, "file[0]: Expected a complete value at offset 2")
      }
    })
  })
})

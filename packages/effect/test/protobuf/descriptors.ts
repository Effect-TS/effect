import { ProtobufDescriptor } from "effect/protobuf"
import * as Result from "effect/Result"

type FieldProto = ProtobufDescriptor.FieldDescriptorProto
type MessageProto = ProtobufDescriptor.DescriptorProto

// `FieldDescriptorProto.Type`
export const T = {
  double: 1,
  float: 2,
  int64: 3,
  uint64: 4,
  int32: 5,
  fixed64: 6,
  fixed32: 7,
  bool: 8,
  string: 9,
  group: 10,
  message: 11,
  bytes: 12,
  uint32: 13,
  enum: 14,
  sfixed32: 15,
  sfixed64: 16,
  sint32: 17,
  sint64: 18
} as const

type Scalar = Exclude<keyof typeof T, "group" | "message" | "enum">

// An optional field of a scalar type, or of a message (`.name`), or with
// another type and label.
export const field = (
  name: string,
  number: number,
  type: Scalar | `.${string}`,
  extra: Partial<FieldProto> = {}
): FieldProto =>
  type.startsWith(".")
    ? { name, number, label: 1, type: T.message, typeName: type, ...extra }
    : { name, number, label: 1, type: T[type as Scalar], ...extra }

export const repeated = (field: FieldProto, extra: Partial<FieldProto> = {}): FieldProto => ({
  ...field,
  label: 3,
  ...extra
})

// A map field and its entry message, as protoc writes them.
export const map = (
  scope: string,
  name: string,
  entry: string,
  number: number,
  key: Scalar,
  value: Scalar | `.${string}`,
  valueExtra: Partial<FieldProto> = {}
): readonly [FieldProto, MessageProto] => [
  repeated(field(name, number, `.${scope}.${entry}`)),
  { name: entry, field: [field("key", 1, key), field("value", 2, value, valueExtra)], options: { mapEntry: true } }
]

const [counts, CountsEntry] = map("test.Shape", "counts", "CountsEntry", 9, "string", "int32")
const [byId, ByIdEntry] = map("test.Shape", "by_id", "ByIdEntry", 10, "int64", "string")
const [flags, FlagsEntry] = map("test.Shape", "flags", "FlagsEntry", 11, "bool", ".test.Point")
const [modeByName, ModeByNameEntry] = map(
  "legacy.Legacy",
  "mode_by_name",
  "ModeByNameEntry",
  8,
  "string",
  ".legacy.Mode",
  {
    type: T.enum
  }
)

// syntax = "proto3"; package test;
export const proto3: ProtobufDescriptor.FileDescriptorProto = {
  name: "test.proto",
  package: "test",
  syntax: "proto3",
  messageType: [
    {
      // Each field's number is its type's number.
      name: "Scalars",
      field: ([
        "double",
        "float",
        "int64",
        "uint64",
        "int32",
        "fixed64",
        "fixed32",
        "bool",
        "string",
        "bytes",
        "uint32",
        "sfixed32",
        "sfixed64",
        "sint32",
        "sint64"
      ] as const)
        .map((type) => field(type, T[type], type))
    },
    {
      name: "Js",
      field: [
        field("as_string", 1, "int64", { options: { jstype: 1 } }),
        field("as_number", 2, "int64", { options: { jstype: 2 } })
      ]
    },
    {
      // optional int32 a = 1;
      name: "Optional",
      field: [field("a", 1, "int32", { oneofIndex: 0, proto3Optional: true })],
      oneofDecl: [{ name: "_a" }]
    },
    { name: "Point", field: [field("x", 1, "int32"), field("y", 2, "int32")] },
    {
      name: "Shape",
      field: [
        field("name", 1, "string"),
        field("origin", 2, ".test.Point"),
        repeated(field("points", 3, ".test.Point")),
        field("label", 4, "string", { oneofIndex: 0 }),
        field("center", 5, ".test.Point", { oneofIndex: 0 }),
        repeated(field("ids", 6, "int32")),
        repeated(field("weights", 7, "double")),
        repeated(field("tags", 8, "string")),
        counts,
        byId,
        flags,
        field("color", 12, ".test.Color", { type: T.enum }),
        repeated(field("colors", 13, ".test.Color", { type: T.enum })),
        repeated(field("floats", 14, "float"))
      ],
      oneofDecl: [{ name: "kind" }],
      nestedType: [CountsEntry, ByIdEntry, FlagsEntry]
    },
    { name: "Tree", field: [repeated(field("children", 1, ".test.Tree"))] },
    { name: "Names", field: [field("constructor", 1, "int32"), field("foo_bar", 2, "int32", { jsonName: "fooBar" })] }
  ],
  enumType: [{ name: "Color", value: [{ name: "RED", number: 0 }, { name: "GREEN", number: 1 }] }],
  service: [{
    name: "Shapes",
    method: [
      { name: "Get", inputType: ".test.Point", outputType: ".test.Shape", options: { idempotencyLevel: 1 } },
      { name: "Watch", inputType: ".test.Point", outputType: ".test.Shape", serverStreaming: true }
    ]
  }]
}

// syntax = "proto2"; package legacy;
export const proto2: ProtobufDescriptor.FileDescriptorProto = {
  name: "legacy.proto",
  package: "legacy",
  messageType: [
    {
      name: "Legacy",
      field: [
        field("id", 1, "int32", { label: 2 }),
        field("name", 2, "string"),
        repeated(field("values", 3, "int32")),
        field("item", 4, ".legacy.Legacy.Item", { type: T.group }),
        field("mode", 6, ".legacy.Mode", { type: T.enum }),
        repeated(field("modes", 7, ".legacy.Mode", { type: T.enum, options: { packed: true } })),
        modeByName
      ],
      nestedType: [{ name: "Item", field: [field("x", 5, "int32")] }, ModeByNameEntry],
      extensionRange: [{ start: 100, end: 200 }]
    },
    { name: "Set", options: { messageSetWireFormat: true }, extensionRange: [{ start: 4, end: 536870912 }] },
    {
      name: "SetMember",
      field: [field("text", 1, "string")],
      extension: [field("member", 1000, ".legacy.SetMember", { extendee: ".legacy.Set" })]
    }
  ],
  enumType: [{ name: "Mode", value: [{ name: "A", number: 1 }, { name: "B", number: 2 }] }],
  extension: [
    field("priority", 100, "int32", { extendee: ".legacy.Legacy" }),
    repeated(field("labels", 101, "string", { extendee: ".legacy.Legacy" }))
  ]
}

// edition = "2023"; package editions;
export const editions: ProtobufDescriptor.FileDescriptorProto = {
  name: "editions.proto",
  package: "editions",
  syntax: "editions",
  edition: 1000,
  messageType: [
    {
      name: "E",
      field: [
        field("a", 1, "int32"),
        field("b", 2, "int32", { options: { features: { fieldPresence: 2 } } }),
        repeated(field("c", 3, "int32")),
        field("d", 4, ".editions.E.Inner", { options: { features: { messageEncoding: 2 } } }),
        field("e", 5, ".editions.Closed", { type: T.enum })
      ],
      nestedType: [{ name: "Inner", field: [field("x", 1, "int32")] }]
    }
  ],
  enumType: [{
    name: "Closed",
    value: [{ name: "ONE", number: 1 }],
    options: { features: { enumType: 2 } }
  }]
}

export const registry = Result.getOrThrow(ProtobufDescriptor.make([proto3, proto2, editions]))

export const message = (typeName: string): ProtobufDescriptor.MessageDescriptor => {
  const descriptor = registry.getMessage(typeName)
  if (descriptor === undefined) throw new Error(`no message ${typeName}`)
  return descriptor
}

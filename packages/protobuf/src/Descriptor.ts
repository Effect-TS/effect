/**
 * Schemas for the parts of `google/protobuf/descriptor.proto` and
 * `google/protobuf/compiler/plugin.proto` used by the code generator, defined
 * with `Protobuf.field` so that `Protobuf.toCodec` can read and write them.
 *
 * PROTOTYPE — see the package README. Only the fields the generator needs are
 * declared; unknown fields are skipped when decoding.
 *
 * Both files are proto2: singular fields have explicit presence
 * (`Schema.optionalKey`) and repeated scalars are not packed unless declared
 * with `[packed = true]`.
 *
 * @since 4.0.0
 */
import * as Schema from "effect/Schema"
import * as Protobuf from "./Protobuf.ts"

const optional = <S extends Schema.Top>(schema: S, number: number) =>
  Schema.optionalKey(schema).pipe(Protobuf.field(number))

const repeated = <S extends Schema.Top>(schema: S, number: number) =>
  Schema.Array(schema).pipe(Protobuf.field(number, { packed: false }))

// -----------------------------------------------------------------------------
// enums
// -----------------------------------------------------------------------------

/**
 * `google.protobuf.FieldDescriptorProto.Type`.
 *
 * @since 4.0.0
 */
export const FieldType = {
  TYPE_DOUBLE: 1,
  TYPE_FLOAT: 2,
  TYPE_INT64: 3,
  TYPE_UINT64: 4,
  TYPE_INT32: 5,
  TYPE_FIXED64: 6,
  TYPE_FIXED32: 7,
  TYPE_BOOL: 8,
  TYPE_STRING: 9,
  TYPE_GROUP: 10,
  TYPE_MESSAGE: 11,
  TYPE_BYTES: 12,
  TYPE_UINT32: 13,
  TYPE_ENUM: 14,
  TYPE_SFIXED32: 15,
  TYPE_SFIXED64: 16,
  TYPE_SINT32: 17,
  TYPE_SINT64: 18
} as const

/**
 * @since 4.0.0
 */
export type FieldType = typeof FieldType[keyof typeof FieldType]

/**
 * `google.protobuf.FieldDescriptorProto.Label`.
 *
 * @since 4.0.0
 */
export const FieldLabel = {
  LABEL_OPTIONAL: 1,
  LABEL_REPEATED: 3,
  LABEL_REQUIRED: 2
} as const

/**
 * @since 4.0.0
 */
export type FieldLabel = typeof FieldLabel[keyof typeof FieldLabel]

/**
 * `google.protobuf.FieldOptions.JSType`.
 *
 * @since 4.0.0
 */
export const JSType = {
  JS_NORMAL: 0,
  JS_STRING: 1,
  JS_NUMBER: 2
} as const

/**
 * @since 4.0.0
 */
export type JSType = typeof JSType[keyof typeof JSType]

/**
 * `google.protobuf.MethodOptions.IdempotencyLevel`.
 *
 * @since 4.0.0
 */
export const IdempotencyLevel = {
  IDEMPOTENCY_UNKNOWN: 0,
  NO_SIDE_EFFECTS: 1,
  IDEMPOTENT: 2
} as const

/**
 * @since 4.0.0
 */
export type IdempotencyLevel = typeof IdempotencyLevel[keyof typeof IdempotencyLevel]

// -----------------------------------------------------------------------------
// options
// -----------------------------------------------------------------------------

/**
 * `google.protobuf.MessageOptions`.
 *
 * @since 4.0.0
 */
export const MessageOptions = Schema.Struct({
  deprecated: optional(Schema.Boolean, 3),
  mapEntry: optional(Schema.Boolean, 7)
}).annotate({ identifier: "google.protobuf.MessageOptions" })

/**
 * @since 4.0.0
 */
export type MessageOptions = typeof MessageOptions.Type

/**
 * `google.protobuf.FieldOptions`.
 *
 * @since 4.0.0
 */
export const FieldOptions = Schema.Struct({
  packed: optional(Schema.Boolean, 2),
  deprecated: optional(Schema.Boolean, 3),
  jstype: optional(Schema.Enum(JSType), 6)
}).annotate({ identifier: "google.protobuf.FieldOptions" })

/**
 * @since 4.0.0
 */
export type FieldOptions = typeof FieldOptions.Type

/**
 * `google.protobuf.EnumOptions`.
 *
 * @since 4.0.0
 */
export const EnumOptions = Schema.Struct({
  allowAlias: optional(Schema.Boolean, 2),
  deprecated: optional(Schema.Boolean, 3)
}).annotate({ identifier: "google.protobuf.EnumOptions" })

/**
 * @since 4.0.0
 */
export type EnumOptions = typeof EnumOptions.Type

/**
 * `google.protobuf.EnumValueOptions`.
 *
 * @since 4.0.0
 */
export const EnumValueOptions = Schema.Struct({
  deprecated: optional(Schema.Boolean, 1)
}).annotate({ identifier: "google.protobuf.EnumValueOptions" })

/**
 * @since 4.0.0
 */
export type EnumValueOptions = typeof EnumValueOptions.Type

/**
 * `google.protobuf.ServiceOptions`.
 *
 * @since 4.0.0
 */
export const ServiceOptions = Schema.Struct({
  deprecated: optional(Schema.Boolean, 33)
}).annotate({ identifier: "google.protobuf.ServiceOptions" })

/**
 * @since 4.0.0
 */
export type ServiceOptions = typeof ServiceOptions.Type

/**
 * `google.protobuf.MethodOptions`.
 *
 * @since 4.0.0
 */
export const MethodOptions = Schema.Struct({
  deprecated: optional(Schema.Boolean, 33),
  idempotencyLevel: optional(Schema.Enum(IdempotencyLevel), 34)
}).annotate({ identifier: "google.protobuf.MethodOptions" })

/**
 * @since 4.0.0
 */
export type MethodOptions = typeof MethodOptions.Type

// -----------------------------------------------------------------------------
// descriptors
// -----------------------------------------------------------------------------

/**
 * `google.protobuf.FieldDescriptorProto`.
 *
 * @since 4.0.0
 */
export const FieldDescriptorProto = Schema.Struct({
  name: optional(Schema.String, 1),
  extendee: optional(Schema.String, 2),
  number: optional(Protobuf.Int32, 3),
  label: optional(Schema.Enum(FieldLabel), 4),
  type: optional(Schema.Enum(FieldType), 5),
  typeName: optional(Schema.String, 6),
  defaultValue: optional(Schema.String, 7),
  options: optional(FieldOptions, 8),
  oneofIndex: optional(Protobuf.Int32, 9),
  jsonName: optional(Schema.String, 10),
  proto3Optional: optional(Schema.Boolean, 17)
}).annotate({ identifier: "google.protobuf.FieldDescriptorProto" })

/**
 * @since 4.0.0
 */
export type FieldDescriptorProto = typeof FieldDescriptorProto.Type

/**
 * `google.protobuf.OneofDescriptorProto`.
 *
 * @since 4.0.0
 */
export const OneofDescriptorProto = Schema.Struct({
  name: optional(Schema.String, 1)
}).annotate({ identifier: "google.protobuf.OneofDescriptorProto" })

/**
 * @since 4.0.0
 */
export type OneofDescriptorProto = typeof OneofDescriptorProto.Type

/**
 * `google.protobuf.EnumValueDescriptorProto`.
 *
 * @since 4.0.0
 */
export const EnumValueDescriptorProto = Schema.Struct({
  name: optional(Schema.String, 1),
  number: optional(Protobuf.Int32, 2),
  options: optional(EnumValueOptions, 3)
}).annotate({ identifier: "google.protobuf.EnumValueDescriptorProto" })

/**
 * @since 4.0.0
 */
export type EnumValueDescriptorProto = typeof EnumValueDescriptorProto.Type

/**
 * `google.protobuf.EnumDescriptorProto`.
 *
 * @since 4.0.0
 */
export const EnumDescriptorProto = Schema.Struct({
  name: optional(Schema.String, 1),
  value: repeated(EnumValueDescriptorProto, 2),
  options: optional(EnumOptions, 3)
}).annotate({ identifier: "google.protobuf.EnumDescriptorProto" })

/**
 * @since 4.0.0
 */
export type EnumDescriptorProto = typeof EnumDescriptorProto.Type

/**
 * `google.protobuf.DescriptorProto`, a message declaration.
 *
 * @since 4.0.0
 */
export interface DescriptorProto {
  readonly name?: string
  readonly field: ReadonlyArray<FieldDescriptorProto>
  readonly nestedType: ReadonlyArray<DescriptorProto>
  readonly enumType: ReadonlyArray<EnumDescriptorProto>
  readonly options?: MessageOptions
  readonly oneofDecl: ReadonlyArray<OneofDescriptorProto>
}

/**
 * @since 4.0.0
 */
export const DescriptorProto: Schema.Codec<DescriptorProto> = Schema.Struct({
  name: optional(Schema.String, 1),
  field: repeated(FieldDescriptorProto, 2),
  nestedType: repeated(Schema.suspend((): Schema.Codec<DescriptorProto> => DescriptorProto), 3),
  enumType: repeated(EnumDescriptorProto, 4),
  options: optional(MessageOptions, 7),
  oneofDecl: repeated(OneofDescriptorProto, 8)
}).annotate({ identifier: "google.protobuf.DescriptorProto" })

/**
 * `google.protobuf.MethodDescriptorProto`.
 *
 * @since 4.0.0
 */
export const MethodDescriptorProto = Schema.Struct({
  name: optional(Schema.String, 1),
  inputType: optional(Schema.String, 2),
  outputType: optional(Schema.String, 3),
  options: optional(MethodOptions, 4),
  clientStreaming: optional(Schema.Boolean, 5),
  serverStreaming: optional(Schema.Boolean, 6)
}).annotate({ identifier: "google.protobuf.MethodDescriptorProto" })

/**
 * @since 4.0.0
 */
export type MethodDescriptorProto = typeof MethodDescriptorProto.Type

/**
 * `google.protobuf.ServiceDescriptorProto`.
 *
 * @since 4.0.0
 */
export const ServiceDescriptorProto = Schema.Struct({
  name: optional(Schema.String, 1),
  method: repeated(MethodDescriptorProto, 2),
  options: optional(ServiceOptions, 3)
}).annotate({ identifier: "google.protobuf.ServiceDescriptorProto" })

/**
 * @since 4.0.0
 */
export type ServiceDescriptorProto = typeof ServiceDescriptorProto.Type

/**
 * `google.protobuf.SourceCodeInfo.Location`.
 *
 * @since 4.0.0
 */
export const SourceCodeInfo_Location = Schema.Struct({
  path: Schema.Array(Protobuf.Int32).pipe(Protobuf.field(1, { packed: true })),
  span: Schema.Array(Protobuf.Int32).pipe(Protobuf.field(2, { packed: true })),
  leadingComments: optional(Schema.String, 3),
  trailingComments: optional(Schema.String, 4),
  leadingDetachedComments: repeated(Schema.String, 6)
}).annotate({ identifier: "google.protobuf.SourceCodeInfo.Location" })

/**
 * @since 4.0.0
 */
export type SourceCodeInfo_Location = typeof SourceCodeInfo_Location.Type

/**
 * `google.protobuf.SourceCodeInfo`.
 *
 * @since 4.0.0
 */
export const SourceCodeInfo = Schema.Struct({
  location: repeated(SourceCodeInfo_Location, 1)
}).annotate({ identifier: "google.protobuf.SourceCodeInfo" })

/**
 * @since 4.0.0
 */
export type SourceCodeInfo = typeof SourceCodeInfo.Type

/**
 * `google.protobuf.FileDescriptorProto`.
 *
 * `edition` is kept as a plain number (`google.protobuf.Edition`), so that
 * editions unknown to this schema still decode.
 *
 * @since 4.0.0
 */
export const FileDescriptorProto = Schema.Struct({
  name: optional(Schema.String, 1),
  package: optional(Schema.String, 2),
  dependency: repeated(Schema.String, 3),
  messageType: repeated(DescriptorProto, 4),
  enumType: repeated(EnumDescriptorProto, 5),
  service: repeated(ServiceDescriptorProto, 6),
  sourceCodeInfo: optional(SourceCodeInfo, 9),
  syntax: optional(Schema.String, 12),
  edition: optional(Protobuf.Int32, 14)
}).annotate({ identifier: "google.protobuf.FileDescriptorProto" })

/**
 * @since 4.0.0
 */
export type FileDescriptorProto = typeof FileDescriptorProto.Type

/**
 * `google.protobuf.FileDescriptorSet`, the output of `buf build` /
 * `protoc --descriptor_set_out`.
 *
 * @since 4.0.0
 */
export const FileDescriptorSet = Schema.Struct({
  file: repeated(FileDescriptorProto, 1)
}).annotate({ identifier: "google.protobuf.FileDescriptorSet" })

/**
 * @since 4.0.0
 */
export type FileDescriptorSet = typeof FileDescriptorSet.Type

// -----------------------------------------------------------------------------
// plugin protocol
// -----------------------------------------------------------------------------

/**
 * `google.protobuf.compiler.Version`.
 *
 * @since 4.0.0
 */
export const CompilerVersion = Schema.Struct({
  major: optional(Protobuf.Int32, 1),
  minor: optional(Protobuf.Int32, 2),
  patch: optional(Protobuf.Int32, 3),
  suffix: optional(Schema.String, 4)
}).annotate({ identifier: "google.protobuf.compiler.Version" })

/**
 * @since 4.0.0
 */
export type CompilerVersion = typeof CompilerVersion.Type

/**
 * `google.protobuf.compiler.CodeGeneratorRequest`, sent by `protoc` / `buf` to
 * a plugin on stdin.
 *
 * @since 4.0.0
 */
export const CodeGeneratorRequest = Schema.Struct({
  fileToGenerate: repeated(Schema.String, 1),
  parameter: optional(Schema.String, 2),
  compilerVersion: optional(CompilerVersion, 3),
  protoFile: repeated(FileDescriptorProto, 15),
  sourceFileDescriptors: repeated(FileDescriptorProto, 17)
}).annotate({ identifier: "google.protobuf.compiler.CodeGeneratorRequest" })

/**
 * @since 4.0.0
 */
export type CodeGeneratorRequest = typeof CodeGeneratorRequest.Type

/**
 * `google.protobuf.compiler.CodeGeneratorResponse.File`.
 *
 * @since 4.0.0
 */
export const CodeGeneratorResponse_File = Schema.Struct({
  name: optional(Schema.String, 1),
  insertionPoint: optional(Schema.String, 2),
  content: optional(Schema.String, 15)
}).annotate({ identifier: "google.protobuf.compiler.CodeGeneratorResponse.File" })

/**
 * @since 4.0.0
 */
export type CodeGeneratorResponse_File = typeof CodeGeneratorResponse_File.Type

/**
 * `google.protobuf.compiler.CodeGeneratorResponse.Feature`.
 *
 * @since 4.0.0
 */
export const Feature = {
  FEATURE_NONE: 0,
  FEATURE_PROTO3_OPTIONAL: 1,
  FEATURE_SUPPORTS_EDITIONS: 2
} as const

/**
 * `google.protobuf.compiler.CodeGeneratorResponse`, written by a plugin to
 * stdout.
 *
 * @since 4.0.0
 */
export const CodeGeneratorResponse = Schema.Struct({
  error: optional(Schema.String, 1),
  supportedFeatures: optional(Protobuf.UInt64, 2),
  minimumEdition: optional(Protobuf.Int32, 3),
  maximumEdition: optional(Protobuf.Int32, 4),
  file: repeated(CodeGeneratorResponse_File, 15)
}).annotate({ identifier: "google.protobuf.compiler.CodeGeneratorResponse" })

/**
 * @since 4.0.0
 */
export type CodeGeneratorResponse = typeof CodeGeneratorResponse.Type

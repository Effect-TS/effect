# @effect/protobuf-generator

`protoc-gen-effect` generates an Effect Schema module for each `.proto` file,
as a plugin for [buf](https://buf.build) and `protoc` or from a descriptor
set. The schemas are
annotated for `effect/protobuf/Protobuf`, so `Protobuf.toCodec` reads and
writes their binary encoding. Neither the plugin nor the generated code
depends on other protobuf libraries.

## Installation

```sh
npm install effect
npm install --save-dev @effect/protobuf-generator @effect/platform-node
```

## Usage

With buf, in `buf.gen.yaml`:

```yaml
version: v2
plugins:
  - local: protoc-gen-effect
    out: src/gen
    opt:
      - import_extension=ts
```

and run `npx buf generate`. With protoc:

```sh
protoc --plugin=./node_modules/.bin/protoc-gen-effect \
  --effect_out=src/gen --effect_opt=import_extension=ts \
  -I proto proto/acme/v1/user.proto
```

### From a descriptor set

`protoc-gen-effect generate` reads a `FileDescriptorSet` and writes the module
of every file in it, except the files whose types come from `effect` (the
well-known types, `descriptor.proto`, and `plugin.proto`). It writes only the
modules whose content changed:

```sh
buf build proto -o set.binpb
# or: protoc --include_imports --descriptor_set_out=set.binpb -I proto proto/acme/v1/user.proto
npx protoc-gen-effect generate set.binpb --out src/gen --import-extension ts
```

The parameters below are flags (`--import-extension`, `--timestamp`,
`--duration`). With `--check`, it writes nothing, lists the modules that are
out of date, and exits with code `1` if there are any, for CI. Invalid usage
and a file that is not a descriptor set exit with code `2`.

| Flag                        | Description                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--file <proto>[=<output>]` | Generates only this file of the set, under another name if given. Repeatable. Selected files are generated even when their types come from `effect`.   |
| `--header <text>`           | Text written at the top of every module, such as a module JSDoc.                                                                                       |
| `--jsdoc <text>`            | Text appended to the JSDoc of every export, such as tags. `{category}` becomes the kind of export: `schemas`, `models`, `extensions`, or `registries`. |
| `--import-map <from>=<to>`  | Replaces an import specifier, such as `effect/Schema=../Schema.ts`. Repeatable.                                                                        |

`effect/protobuf/ProtobufDescriptor` and `effect/protobuf/ProtobufPlugin` are
generated this way, by `pnpm bootstrap` (`bootstrap/generate.sh`).

### Parameters

| Parameter                       | Default    | Description                                                                                                                                                  |
| ------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `import_extension=js\|ts\|none` | `js`       | The extension of imports between generated modules                                                                                                           |
| `timestamp=parts`               | `datetime` | Decodes `google.protobuf.Timestamp` as its seconds and nanos, keeping sub-millisecond precision, instead of a `DateTime.Utc`                                 |
| `duration=parts`                | `duration` | Decodes `google.protobuf.Duration` as its seconds and nanos, keeping values a `Duration` cannot hold, instead of a `Duration`                                |
| `proto_map=<proto>=<module>`    |            | Imports a `.proto` file, or a directory ending in `/`, from a module generated elsewhere, such as a library, instead of generating it. Repeatable; see below |

### Code generated elsewhere

Every `.proto` file becomes one module at a fixed path, so generating several
entry points into one directory writes each shared import once. Imports of a
file that is generated elsewhere, such as by a library that ships its
generated modules, are mapped with `proto_map` (`--proto-map` for `generate`),
and the file is not generated:

```yaml
opt:
  - proto_map=acme/common/v1/money.proto=@acme/money
  - proto_map=acme/common/=@acme/common-proto/
```

A file maps to a module; a directory ending in `/` maps to a specifier ending
in `/`, followed by the rest of the path (`acme/common/v1/money.proto` is
imported from `@acme/common-proto/v1/money.proto`). `descriptor.proto` and
`plugin.proto` map to `effect/protobuf/ProtobufDescriptor` and
`effect/protobuf/ProtobufPlugin` unless mapped otherwise.

## Output

`acme/v1/user.proto` becomes `acme/v1/user.proto.ts`:

```ts
import * as Protobuf from "effect/protobuf/Protobuf"
import * as Schema from "effect/Schema"

export const User_Role = Protobuf.OpenEnum("acme.v1.User.Role", {
  ROLE_UNSPECIFIED: 0,
  ROLE_ADMIN: 1
})
export type User_Role = typeof User_Role.Type

export const User = Protobuf.Message("acme.v1.User", {
  id: Protobuf.UInt64.pipe(Protobuf.field(1)),
  displayName: Schema.String.pipe(Protobuf.field(2)),
  email: Schema.optionalKey(Schema.String).pipe(Protobuf.field(3)),
  role: User_Role.pipe(Protobuf.field(4)),
  contact: Protobuf.Oneof({
    phone: Schema.String.pipe(Protobuf.field(5)),
    address: Schema.String.pipe(Protobuf.field(6))
  })
})
export interface User extends Schema.Schema.Type<typeof User> {}

export const registry = Protobuf.registry(User)
```

- Messages are `Protobuf.Message`s, which are `Schema.Struct`s, with an
  interface of their type of the same name. Nested names
  are joined with `_`, and names that are reserved in TypeScript or used by
  the generated code get a `$` suffix (`Object$`).
- Enums are `Protobuf.OpenEnum`s (proto3, editions `OPEN`) or `Protobuf.Enum`s
  (proto2, editions `CLOSED`) of their value names as string literals
  (`"ROLE_ADMIN"`), as in the JSON mapping of protobuf. Open enums also decode
  unknown numbers; closed enums keep them as unknown fields.
- Property keys and oneof cases are the lowerCamelCase field names.
- Maps are `Protobuf.Map`s of their key schema
  (`Protobuf.Map(Protobuf.Int64String, Schema.String)`).
- Fields with explicit presence (proto3 `optional`, proto2 `optional`,
  editions `EXPLICIT`, and message fields) are `Schema.optionalKey`. A oneof is
  an optional `Protobuf.Oneof` of `{ _tag, value }` cases. proto2 `required`
  scalars and enums take `required: true`, and fail to decode when
  missing, as do required messages.
- Every message keeps the fields it does not declare under `$unknown`
  (`Protobuf.unknown`), and writes them back.
- Extensions are `Protobuf.extension`s, read and written with
  `Protobuf.getExtension` and `Protobuf.setExtension`; MessageSet extendees
  are supported. Each records its full name, its key in JSON.
- `[default = …]` values are not filled in, so an absent field stays
  distinguishable, as in protobuf; they are recorded with
  `Protobuf.field(n, { default })` and documented with `@default`.
- Property keys are the default `json_name`s of the fields. A field records
  its proto name with `Protobuf.field(n, { name })` when it is not the key in
  snake_case (`field_1`, `FieldName`), and a custom `json_name` with
  `{ jsonName }`.
- Groups, `[packed]`, `[jstype]` on every 64-bit type, and the editions
  features `field_presence`, `enum_type`, `repeated_field_encoding`,
  `utf8_validation`, and `message_encoding` are supported. Editions proto2
  through 2024 are supported.
- Messages that refer to each other do so through `Schema.suspend`.
- Well-known types use the schemas of `effect/protobuf/Protobuf`
  (`Timestamp` is a `DateTime.Utc`, `StringValue` a `string`,
  `FieldMask` its paths, …), and the types of `descriptor.proto` and
  `plugin.proto` use `effect/protobuf/ProtobufDescriptor` and
  `effect/protobuf/ProtobufPlugin`. Other imported files must be generated as
  well, or mapped to their modules with `proto_map`.
- `registry` holds the messages and extensions of the file and of its
  imports, for `Protobuf.anyUnpack`, `Protobuf.toCodec(schema, { registry })`,
  and `ProtobufJson.toCodec(schema, { registry })`.
- Comments become JSDoc, with `@deprecated` for deprecated declarations.

## Limitations

- Services are not generated yet. They will become `effect/rpc` groups once
  ConnectRPC support is available.
- The text format is not supported.
- Editions after 2024, including `UNSTABLE`, are not supported.

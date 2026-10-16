# `@effect/protobuf` — PROTOTYPE

> **Throwaway prototype.** It lives on the `prototype/effect-protobuf` branch to
> answer one question: _what would Protocol Buffers and Connect RPC look like
> in Effect, driven by Effect Schema?_ None of these APIs are stable, and none of
> them are meant to be merged as they are.

Inspired by [`@bufbuild/protobuf`](https://github.com/bufbuild/protobuf-es) and
[`@connectrpc/connect`](https://github.com/connectrpc/connect-es), and tested
against both for wire compatibility.

## Run it

```sh
pnpm --filter @effect/protobuf demo        # schema → .proto, codec, Connect server + 2 clients
pnpm vitest run --project @effect/protobuf  # compat tests vs @bufbuild / @connectrpc
pnpm --filter @effect/protobuf generate:fixtures  # regenerate gen-es / gen-effect from the fixture .proto
```

## What's in it

| Module                 | What it does                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `Protobuf`             | `field(n)` annotation, scalar schemas (`Int32`, `UInt64`, …), WKTs, `toCodec`, `toCodecJson` |
| `ProtoFile`            | renders a `.proto` file from schemas and `RpcGroup`s (schema-first → other toolchains)       |
| `ProtoCodegen` / `bin` | `protoc-gen-effect`: `.proto` → Effect Schema + `RpcGroup` source (proto-first)              |
| `Descriptor`           | `descriptor.proto` / `plugin.proto` as Effect schemas (the codegen decodes itself)           |
| `ConnectServer`        | an `RpcServer.Protocol` serving an `RpcGroup` over Connect on `HttpRouter`                   |
| `ConnectClient`        | an `RpcClient.Protocol` calling any Connect server                                           |
| `ConnectRpc`           | `ServiceName` group annotation, `code(...)` error annotation                                 |

### Schema → protobuf mapping

The codec is compiled from the **encoded side** of a schema, so transformations
(`FiniteFromString`, `DateTimeUtcFromMillis`, classes, …) run before the wire
layer sees the value.

| Schema                                            | Protobuf                                                     |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `Struct` / `Class`                                | `message`; every wire property needs `Protobuf.field(n)`     |
| `identifier` annotation                           | the message's full name (`"acme.v1.User"`)                   |
| `String`, `Boolean`, `Uint8Array`                 | `string`, `bool`, `bytes`                                    |
| `Number`                                          | `double`; `Protobuf.Int32`, `Float`, `Fixed32`, … for others |
| `BigInt`                                          | `int64`; `Protobuf.UInt64`, `SInt64`, … for others           |
| `Enum` (numeric members)                          | `enum`; `Protobuf.enumNumbers` for literal unions            |
| `Array(A)`                                        | `repeated A` (packed for numerics)                           |
| `Record(String \| Int32 \| mapKey(..), A)`        | `map<K, A>`                                                  |
| required scalar                                   | implicit presence: absent → zero value, zero not written     |
| `optionalKey`, `optional`, `NullOr`, `Option`     | explicit presence (`optional`)                               |
| `Literal` property                                | constant, never on the wire (restored on decode)             |
| union of numbered members                         | `oneof` (see below)                                          |
| `DateTimeUtc`, `Date`                             | `google.protobuf.Timestamp`                                  |
| `Duration`                                        | `google.protobuf.Duration`                                   |
| `Json`, `Unknown`, `Protobuf.Struct`, `ListValue` | `google.protobuf.Value` / `Struct` / `ListValue`             |
| `Protobuf.StringValue`, …                         | wrapper messages                                             |
| other declarations with `toCodecJson`             | their JSON form, laid out structurally                       |

A union property becomes a `oneof`. Each member either carries its own field
number (the whole member is the case value), or is a tagged struct with exactly
one numbered field, as `protoc-gen-effect` generates it:

```ts
shape: Schema.optionalKey(Schema.Union([
  Schema.TaggedStruct("circle", { value: Circle.pipe(Protobuf.field(12)) }),
  Schema.TaggedStruct("label", { value: Schema.String.pipe(Protobuf.field(14)) })
]))
```

### Proto-first: `protoc-gen-effect`

```yaml
# buf.gen.yaml
version: v2
plugins:
  - local: ["node", "path/to/packages/protobuf/src/bin.ts"]
    out: gen
    opt: [import_extension=ts] # js (default) | ts | none; effect_import=<module>
```

Each `foo.proto` becomes `foo_effect.ts`: messages as `Schema.Struct(...)`
annotated with their full name (an interface plus `Schema.suspend` for
messages in a cycle), enums as `const` objects plus `XxxSchema = Schema.Enum(...)`,
services as an `RpcGroup` annotated with `ConnectRpc.ServiceName`. See
`test/fixtures/gen-effect/` and `test/fixtures/codegen/gen-effect/` (proto2,
imports between files, mutual recursion, `json_name`, `jstype`, deprecations).
The generated schemas are the same shape as hand-written ones: compare
`gen-effect/acme/v1/kitchen_sink_effect.ts` with `test/fixtures/schemas.ts`.

The plugin decodes its `CodeGeneratorRequest` with `Protobuf.toCodec` and the
`Descriptor` schemas, so the codec handles its own descriptors.

### Connect on top of `RpcServer` / `RpcClient`

Connect is plugged in as a regular RPC **protocol**, so handlers (`group.toLayer`),
middleware, tracing and the typed client are unchanged Effect RPC. The protocols
use an identity `codecFor`: the RPC layer hands over encoded values, and the
protocol lays them out per method (`/<ServiceName>/<Rpc tag>`).

- unary: `application/proto` and `application/json`
- server streaming (`stream: true`): `application/connect+proto|json`, enveloped
  frames, end-stream message
- typed errors: an error schema that is a message is sent as a Connect error
  detail (`type` = its identifier, `value` = protobuf bytes); the code comes from
  `ConnectRpc.code(...)`. The Effect client turns matching details back into the
  typed failure; anything else becomes a defect.
- `Connect-Timeout-Ms` is honoured by the server and can be set on the client.

## Findings

**Works, verified against the reference implementations**

- Binary output is **byte-identical** to `@bufbuild/protobuf` for every fixture
  message (all 15 scalar types at their extremes, packed repeated, maps with
  string and int keys, proto3 `optional`, oneofs with message and scalar cases,
  WKTs, recursion), and decodes their bytes back to the same value.
- The proto3 JSON output is identical to `toJson` from `@bufbuild/protobuf`, and
  their JSON decodes back.
- Connect interop in all directions: Effect client ↔ Effect server,
  `@connectrpc/connect-node` client → Effect server, Effect client →
  `connect-node` server, in binary and JSON, unary + streaming + errors.
- `ProtoFile` output for the schema-first fixture matches the hand-written
  `kitchen_sink.proto`, and `buf build` compiles it.
- Driving the codec off the layout of the encoded side, with no codegen at
  runtime, is enough. Schema checks still run after decoding (for example
  `NonEmptyString` rejects an absent, zero-valued field).

**Friction found**

- Key annotations (`optionalKey`, `annotateKey`) copy the AST node. The same
  message used at two field positions compiles to two descriptors, so named
  types have to be deduplicated by `identifier` (`ProtoFile` does this). A real
  implementation wants an AST identity that ignores the key context.
- `annotate` on a checked schema lands on the last check. Reading protobuf
  annotations has to walk the checks, and a user `.check(...)` after
  `Protobuf.Int32` must not lose the scalar type.
- The rpc protocols carry an `unknown` hole per message. Connect needs the
  method's schemas on both ends, so the protocols take the `RpcGroup` as an
  argument instead of only an `RpcSerialization`. Making the protocol aware of
  the rpc being sent would make this cleaner.
- `Timestamp` → `DateTime.Utc` loses sub-millisecond precision.
- `protoc-gen-es` emits TS `enum`s, which Node's strip-only TS mode cannot run.
  `protoc-gen-effect` emits `const` objects + `Schema.Enum` for that reason.
- **Open enums.** proto3 enums are open but `Schema.Enum` is closed: a number
  sent by a newer peer fails to decode (`Expected acme.v1.Color`). bufbuild
  keeps the number instead.
- **proto2** is only partly covered: `required` fields are generated as plain
  (implicit-presence) fields, so a zero value is not written, where bufbuild
  always writes required fields. `[default = …]` is ignored.
- With `allow_alias`, the JSON enum name is the last alias rather than the
  first.
- Schema validation failures of an rpc payload surface as a defect (`internal`)
  from `RpcServer`, where Connect would use `invalid_argument`.
- `FieldMask`, `NullValue` and the other special well-known types are rejected
  by the generator. Their JSON forms need dedicated mappings.

## Decisions taken for the prototype (to revisit)

1. Field numbers are always explicit (`Protobuf.field(n)`): no hashing, and no
   ordering by declaration.
2. Required scalar fields use implicit presence and zero-fill on decode. Schema
   validation runs on the zero value.
3. A required message-typed field that is absent is left for the schema to
   report (`Missing key`), rather than becoming an empty message.
4. Unknown fields are skipped in binary and **ignored in JSON**. Proto3 JSON
   parsers reject them by default, which would break forward compatibility.
5. Open enums: an unknown enum number passes through to the schema, which
   rejects it unless the enum declares it.
6. `Literal` properties are not on the wire (`_tag` of tagged structs and
   errors).
7. `Any` is binary only (JSON needs a type registry).
8. Not implemented: compression, Connect GET, client/bidi streaming, gRPC and
   gRPC-Web, editions, proto2 defaults/groups (groups are skipped on decode),
   extensions.

## Open questions for the next iteration

- Should this live in `effect/encoding/Protobuf` (core, next to `SchemaBinary`),
  with Connect in `effect/rpc`, or stay a separate package?
- Proto-first vs schema-first: which one gets the polish first?
- gRPC needs HTTP/2 trailers (tie-in with the HTTP/2 serving work). gRPC-Web
  does not, so it could be the next protocol.
- Oneof representation in generated code: `{ _tag, value }` (current) vs
  bufbuild's `{ case, value }`, vs flattening message cases.
- Should implicit-presence zero-filling be opt-out per field? Does proto2
  `required` need an "always write" presence mode?
- Open enums: a dedicated `Protobuf.Enum` schema that accepts unknown numbers?

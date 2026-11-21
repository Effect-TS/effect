# @effect/protobuf-generator

`protoc-gen-effect`, a [protoc](https://protobuf.dev) and [buf](https://buf.build)
plugin that generates a module per `.proto` file for the experimental
`effect/protobuf`. It has no third-party protobuf dependencies: it reads
its requests with effect's own generated `plugin.proto` module.

## Installation

```sh
npm install effect @effect/platform-node
npm install --save-dev @effect/protobuf-generator
```

## Usage

With buf:

```yaml
# buf.gen.yaml
version: v2
plugins:
  - local: protoc-gen-effect
    out: src/generated
```

With protoc:

```sh
protoc --plugin=protoc-gen-effect=node_modules/.bin/protoc-gen-effect \
  --effect_out=src/generated -I proto proto/acme/v1/user.proto
```

`acme/v1/user.proto` becomes `acme/v1/user.proto.ts`, which exports:

- `userFile`: the file's `FileDescriptor`, resolved when the module loads,
  against the modules of the files it imports.
- Per message, an interface of its values and its `MessageDescriptor`, under
  the same name, for `ProtobufMessage.encode` and `ProtobufMessage.decode`.
  Nested types are named `Outer_Inner`.
- Per enum, an object of its numbers by name, and the type of its values.
- Per extension and service, its descriptor.

```ts
import { ProtobufMessage } from "effect/protobuf"
import * as Result from "effect/Result"
import * as User from "./generated/acme/v1/user.proto.js"

const bytes = Result.getOrThrow(ProtobufMessage.encode(User.User)({ display_name: "Ada" }))
const user = Result.getOrThrow(ProtobufMessage.decode(User.User)(bytes)) as User.User
```

Values are keyed by the original field names, as `ProtobufMessage` keys them.
Imports of `google/protobuf/descriptor.proto` and
`google/protobuf/compiler/plugin.proto` use `effect/protobuf/ProtobufDescriptorProto`
and `effect/protobuf/ProtobufPluginProto`.

Plugin parameters, comma separated (`opt` in buf, `--effect_opt` in protoc):

- `import_extension=js|ts|none`: the extension of imports between generated
  modules (default `js`).

## Bootstrapping

The plugin is self-hosted. It is built on two modules of `effect/protobuf`
that re-export its own output, with no options of its own for them:

- `ProtobufDescriptorProto`, from `google/protobuf/descriptor.proto`, which
  resolves the files of a request.
- `ProtobufPluginProto`, from `google/protobuf/compiler/plugin.proto`, which
  decodes the `CodeGeneratorRequest` and encodes the `CodeGeneratorResponse`.

They were first generated with a stage-0 plugin on `@bufbuild/protoplugin`.
Since then the plugin regenerates them, and the output is a fixed point:
generating again with it gives the same bytes.

```sh
pnpm --filter @effect/protobuf-generator bootstrap
```

runs `buf generate` with `import_extension=ts` on
`packages/effect/test/fixtures/protobuf/descriptor-set.binpb`, and writes into
`packages/effect/src/protobuf/internal/generated`. `test/Bootstrap.test.ts` fails
when the checked-in output differs.

The fixture is the output of protoc 36.2, commit
[`2c74169b34066ceb8ddb6b882fcb3fb32d737a55`](https://github.com/protocolbuffers/protobuf/tree/2c74169b34066ceb8ddb6b882fcb3fb32d737a55),
with source information, because buf's bundled copies of these files lose part
of their comments. To move to another protobuf release:

1. Rebuild the fixture with that release's `protoc` and include directory:

   ```sh
   protoc --include_source_info --descriptor_set_out=descriptor-set.binpb \
     -I /path/to/protoc/include \
     google/protobuf/descriptor.proto google/protobuf/compiler/plugin.proto
   ```

   and replace `packages/effect/test/fixtures/protobuf/descriptor-set.binpb`.
2. Update the provenance in this document and in effect's
   `THIRD_PARTY_NOTICES.md`.
3. Run `pnpm bootstrap` twice; the second run must not change anything. Review
   the generated changes and run the protobuf tests, `pnpm check` and
   `pnpm lint`.

## Tests

`pnpm fixtures` rebuilds `test/fixtures/protos.binpb` from the sample `.proto`
files with buf. The modules generated from them are snapshots under
`test/generated/`.

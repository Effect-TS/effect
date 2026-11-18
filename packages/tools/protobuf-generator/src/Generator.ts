/**
 * `protoc-gen-effect`, a plugin for protoc and buf that generates a module per
 * `.proto` file for `effect/protobuf`.
 *
 * **Mental model**
 *
 * - `acme/v1/user.proto` becomes `acme/v1/user.proto.ts`, which exports the
 *   file's `FileDescriptor` as `userFile`, resolved when the module loads.
 * - Per message, an interface of its values and its `MessageDescriptor`, under
 *   the same name, for `ProtobufMessage.encode` and `ProtobufMessage.decode`.
 *   Nested types are named `Outer_Inner`.
 * - Per enum, an object of its numbers by name, and the type of its values.
 *   Per extension and service, its descriptor.
 * - A module resolves its file against the modules of the files it imports,
 *   so that its types refer to their descriptors.
 * - The plugin is self-hosted: it reads its requests with `ProtobufPluginProto`
 *   and resolves them with `ProtobufDescriptorProto`, whose definitions are its
 *   own output for `descriptor.proto` and `plugin.proto`.
 *
 * **Gotchas**
 *
 * - Imports of `google/protobuf/descriptor.proto` and
 *   `google/protobuf/compiler/plugin.proto` import
 *   `effect/protobuf/ProtobufDescriptorProto` and
 *   `effect/protobuf/ProtobufPluginProto`, whose descriptors effect resolves.
 * - Names that generated code reserves, such as `Uint8Array` or keywords, get
 *   a `$` suffix.
 *
 * @since 4.1.5
 */
import { Edition, type FileDescriptorProto } from "effect/protobuf/ProtobufDescriptorProto"
import {
  type CodeGeneratorRequest,
  type CodeGeneratorResponse,
  CodeGeneratorResponse_Feature
} from "effect/protobuf/ProtobufPluginProto"
import * as Result from "effect/Result"
import { generateFiles } from "./internal/generate.ts"
import { parseParameters } from "./internal/parameters.ts"

const SUPPORTED_FEATURES = BigInt(
  CodeGeneratorResponse_Feature.FEATURE_PROTO3_OPTIONAL | CodeGeneratorResponse_Feature.FEATURE_SUPPORTS_EDITIONS
)
const MINIMUM_EDITION = Edition.EDITION_PROTO2
const MAXIMUM_EDITION = Edition.EDITION_2026

/**
 * A response that reports an error instead of files.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const errorResponse = (error: string): CodeGeneratorResponse => ({
  error,
  supported_features: SUPPORTED_FEATURES,
  minimum_edition: MINIMUM_EDITION,
  maximum_edition: MAXIMUM_EDITION
})

/**
 * Answers a plugin request with the generated modules.
 *
 * **Details**
 *
 * The response declares support for proto3 `optional` and for editions from
 * proto2 through 2026. Invalid parameters and input the generator cannot
 * represent, such as two types that would get the same name, are reported in
 * the `error` of the response.
 *
 * Parameters, comma separated:
 *
 * - `import_extension=js|ts|none`: the extension of imports between generated
 *   modules. Defaults to `js`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const generate = (request: CodeGeneratorRequest): CodeGeneratorResponse =>
  parseParameters(request.parameter ?? "").pipe(
    Result.flatMap((options) =>
      generateFiles(
        (request.proto_file ?? []) as ReadonlyArray<FileDescriptorProto>,
        request.file_to_generate ?? [],
        options
      )
    ),
    Result.match({
      onFailure: (error) => errorResponse(error.message),
      onSuccess: (files) => ({
        supported_features: SUPPORTED_FEATURES,
        minimum_edition: MINIMUM_EDITION,
        maximum_edition: MAXIMUM_EDITION,
        file: files.map((file) => ({ name: file.name, content: file.content }))
      })
    })
  )

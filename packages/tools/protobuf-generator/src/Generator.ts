/**
 * The code generator behind `protoc-gen-effect`, which generates an Effect
 * Schema module for each `.proto` file.
 *
 * `acme/v1/user.proto` becomes `acme/v1/user.proto.ts`. Messages are
 * `Protobuf.Message`s, enums are `Protobuf.Enum`s or `Protobuf.OpenEnum`s of
 * their value names as string literals, and oneofs are `Protobuf.Oneof` tagged
 * unions, so `Protobuf.toCodec` reads and writes their binary encoding. Nested
 * names are joined with `_` (`User.Role` becomes `User_Role`), property keys
 * are the lowerCamelCase field names, and every message keeps the fields it
 * does not declare under `$unknown`. `[default = …]` values are recorded by
 * `Protobuf.field`. Each module also exports its extensions and a `registry` of
 * its messages and extensions.
 *
 * Plugin parameters, comma separated:
 *
 * - `import_extension=js|ts|none`: the extension of imports between generated
 *   modules (default `js`).
 * - `timestamp=parts`: decodes `google.protobuf.Timestamp` as its seconds and
 *   nanos (`Protobuf.TimestampParts`), keeping sub-millisecond precision,
 *   instead of a `DateTime.Utc` (`Protobuf.Timestamp`).
 * - `duration=parts`: decodes `google.protobuf.Duration` as its seconds and
 *   nanos (`Protobuf.DurationParts`), keeping values a `Duration` cannot hold,
 *   instead of a `Duration` (`Protobuf.Duration`).
 * - `proto_map=<proto>=<specifier>`: imports the types of a `.proto` file from
 *   a module generated elsewhere, such as a library, instead of generating it.
 *   A directory ending in `/` maps to a specifier ending in `/`, followed by
 *   the rest of the path: `proto_map=acme/common/=@acme/common-proto/`. May
 *   be given more than once.
 *
 * @since 4.0.7
 */
import type { CodeGeneratorRequest, CodeGeneratorResponse } from "effect/protobuf/ProtobufPlugin"
import { SUPPORTED } from "./internal/features.ts"
import { generateFiles, GeneratorError, isMapped } from "./internal/generate.ts"
import { parseParameters } from "./internal/parameters.ts"

/**
 * Answers a plugin request with the generated modules.
 *
 * **Details**
 *
 * The response declares support for proto3 `optional` and for editions from
 * proto2 through 2024. Invalid parameters and input the generator cannot
 * represent, such as two types that would get the same name, are reported in
 * the `error` of the response, which protoc and buf print.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.7
 */
export const generate = (request: CodeGeneratorRequest): CodeGeneratorResponse => {
  try {
    const options = parseParameters(request.parameter ?? "")
    // Files mapped to other modules with `proto_map` are not generated.
    const names = request.fileToGenerate.filter((name) => !isMapped(name, options))
    const files = generateFiles(request.protoFile, names, options)
    return { ...SUPPORTED, file: files.map((file) => ({ name: file.name, content: file.content })) }
  } catch (e) {
    if (e instanceof GeneratorError) return { ...SUPPORTED, error: e.message, file: [] }
    throw e
  }
}

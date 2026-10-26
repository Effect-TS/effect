/**
 * The `protoc-gen-effect` command, a plugin for buf and protoc: it reads a
 * `CodeGeneratorRequest` from standard input and writes the
 * `CodeGeneratorResponse` of {@link Generator.generate} to standard output.
 *
 * @since 4.0.7
 */
import * as Bytes from "effect/Bytes"
import * as CliError from "effect/cli/CliError"
import * as Command from "effect/cli/Command"
import * as Effect from "effect/Effect"
import type { PlatformError } from "effect/PlatformError"
import * as Protobuf from "effect/protobuf/Protobuf"
import { CodeGeneratorRequest, CodeGeneratorResponse } from "effect/protobuf/ProtobufPlugin"
import * as Runtime from "effect/Runtime"
import * as Schema from "effect/Schema"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"
import * as Generator from "./Generator.ts"
import { SUPPORTED } from "./internal/features.ts"

const decodeRequest = Schema.decodeUnknownEffect(Protobuf.toCodec(CodeGeneratorRequest))
const encodeResponse = Schema.encodeSync(Protobuf.toCodec(CodeGeneratorResponse))

const plugin = Effect.gen(function*() {
  const stdio = yield* Stdio.Stdio
  const input = Bytes.concat(yield* Stream.runCollect(stdio.stdin))
  // A request that cannot be decoded is answered with an error as well.
  const response = yield* decodeRequest(input).pipe(
    Effect.map(Generator.generate),
    Effect.catchTag("SchemaError", (error) =>
      Effect.succeed<CodeGeneratorResponse>({
        ...SUPPORTED,
        error: `invalid CodeGeneratorRequest: ${error.message}`,
        file: []
      }))
  )
  yield* Stream.run(Stream.succeed(encodeResponse(response)), stdio.stdout())
})

const root = Command.make("protoc-gen-effect", {}, () => plugin).pipe(
  Command.withDescription(
    "A plugin for buf and protoc that generates Effect Schema modules from .proto files. Run it through buf generate or protoc --effect_out."
  )
)

/**
 * Runs the `protoc-gen-effect` command-line program.
 *
 * **Details**
 *
 * Invalid CLI usage exits with code `2`. A `PlatformError` comes from reading
 * the request or writing the response.
 *
 * @stability experimental
 * @category running
 * @since 4.0.7
 */
export const run: Effect.Effect<void, CliError.CliError | PlatformError, Command.Environment> = Command.run(root, {
  version: "0.0.0"
}).pipe(
  Effect.mapError((error) =>
    CliError.isCliError(error) && Runtime.getErrorExitCode(error) !== 0
      ? Object.assign(error, { [Runtime.errorExitCode]: 2 })
      : error
  )
)

/**
 * The `protoc-gen-effect` command, a plugin for protoc and buf: it reads a
 * `CodeGeneratorRequest` from standard input and writes the
 * `CodeGeneratorResponse` of {@link Generator.generate} to standard output.
 *
 * @since 4.1.5
 */
import * as Bytes from "effect/Bytes"
import * as CliError from "effect/cli/CliError"
import * as Command from "effect/cli/Command"
import * as Console from "effect/Console"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import type { PlatformError } from "effect/PlatformError"
import * as ProtobufMessage from "effect/protobuf/ProtobufMessage"
import { CodeGeneratorRequest, CodeGeneratorResponse } from "effect/protobuf/ProtobufPluginProto"
import type * as ProtobufPluginProto from "effect/protobuf/ProtobufPluginProto"
import * as Result from "effect/Result"
import * as Runtime from "effect/Runtime"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"
import * as Generator from "./Generator.ts"

/**
 * Standard input is not a `CodeGeneratorRequest`. As the plugin protocol
 * asks, this is reported on stderr with exit code `1`, not in a response.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.5
 */
export class RequestError extends Data.TaggedError("RequestError")<{
  readonly message: string
}> {
  override readonly [Runtime.errorExitCode] = 1
  override readonly [Runtime.errorReported] = false
}

const decodeRequest = ProtobufMessage.decode(CodeGeneratorRequest)
const encodeResponse = ProtobufMessage.encode(CodeGeneratorResponse)

const program = Effect.gen(function*() {
  const stdio = yield* Stdio.Stdio
  const input = Bytes.concat(yield* Stream.runCollect(stdio.stdin))
  const request = decodeRequest(input)
  if (Result.isFailure(request)) {
    return yield* new RequestError({ message: `invalid CodeGeneratorRequest: ${request.failure.message}` })
  }
  const response = Generator.generate(request.success as ProtobufPluginProto.CodeGeneratorRequest)
  const output = Result.getOrThrow(encodeResponse(response))
  yield* Stream.run(Stream.succeed(output), stdio.stdout())
})

const root = Command.make("protoc-gen-effect", {}, () => program).pipe(
  Command.withDescription(
    "A plugin for protoc and buf that generates effect/protobuf modules from .proto files. Run it through buf generate or protoc --effect_out."
  )
)

/**
 * Runs the `protoc-gen-effect` command-line program.
 *
 * **Details**
 *
 * Invalid CLI usage exits with code `2`, and an invalid request with code
 * `1`. A `PlatformError` comes from reading the request or writing the
 * response.
 *
 * @stability experimental
 * @category running
 * @since 4.1.5
 */
export const run: Effect.Effect<void, CliError.CliError | RequestError | PlatformError, Command.Environment> = Command
  .run(root, { version: "0.0.0" }).pipe(
    Effect.mapError((error) =>
      CliError.isCliError(error) && Runtime.getErrorExitCode(error) !== 0
        ? Object.assign(error, { [Runtime.errorExitCode]: 2 })
        : error
    ),
    // Command.run has already printed CLI errors.
    Effect.tapError((error) => CliError.isCliError(error) ? Effect.void : Console.error(error.message))
  )

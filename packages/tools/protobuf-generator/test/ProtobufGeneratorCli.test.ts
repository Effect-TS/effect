/** The plugin reads a `CodeGeneratorRequest` from stdin and writes a `CodeGeneratorResponse` to stdout. */
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Bytes from "effect/Bytes"
import { CliOutput } from "effect/cli"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import { ProtobufMessage, ProtobufPluginProto } from "effect/protobuf"
import * as Result from "effect/Result"
import * as Sink from "effect/Sink"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"
import { TestConsole } from "effect/testing"
import { samples } from "./utils/generator.ts"

const runPlugin = Effect.fnUntraced(function*(stdin: Uint8Array) {
  const { run } = (yield* Effect.promise(
    () => import(new URL("../src/main.ts", import.meta.url).href)
  )) as { readonly run: Effect.Effect<void, { readonly message: string }, Stdio.Stdio> }
  const chunks: Array<Uint8Array> = []
  const exit = yield* run.pipe(
    Effect.provide(Layer.mergeAll(
      TestConsole.layer,
      CliOutput.layer(CliOutput.defaultFormatter({ colors: false })),
      NodeServices.layer,
      Stdio.layerTest({
        stdin: Stream.succeed(stdin),
        stdout: () =>
          Sink.forEach((chunk: string | Uint8Array) =>
            Effect.sync(() => chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk))
          )
      })
    )),
    Effect.exit
  )
  return { exit, stdout: Bytes.concat(chunks) }
})

describe("protoc-gen-effect", () => {
  it.effect("answers a request on stdin with the generated files on stdout", () =>
    Effect.gen(function*() {
      const request: ProtobufPluginProto.CodeGeneratorRequest = {
        file_to_generate: ["acme/common/v1/money.proto"],
        proto_file: samples
      }
      const { stdout } = yield* runPlugin(
        Result.getOrThrow(ProtobufMessage.encode(ProtobufPluginProto.CodeGeneratorRequest)(request))
      )
      const response = Result.getOrThrow(
        ProtobufMessage.decode(ProtobufPluginProto.CodeGeneratorResponse)(stdout)
      ) as ProtobufPluginProto.CodeGeneratorResponse
      assert.strictEqual(response.error, undefined)
      assert.deepStrictEqual(response.file?.map((file) => file.name), ["acme/common/v1/money.proto.ts"])
      assert.strictEqual(response.supported_features, 3n)
    }))

  it.effect("fails on a request it cannot decode, without a response", () =>
    Effect.gen(function*() {
      // field 1 (file_to_generate) with a length past the end of the input
      const { exit, stdout } = yield* runPlugin(new Uint8Array([0x0a, 0x05]))
      assert.isTrue(Exit.isFailure(exit))
      assert.deepStrictEqual(stdout, new Uint8Array())
    }))
})

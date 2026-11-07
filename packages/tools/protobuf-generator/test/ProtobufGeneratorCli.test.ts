/** The plugin reads a `CodeGeneratorRequest` from stdin and writes a `CodeGeneratorResponse` to stdout. */
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Bytes from "effect/Bytes"
import { CliOutput } from "effect/cli"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Protobuf from "effect/protobuf/Protobuf"
import { CodeGeneratorRequest, CodeGeneratorResponse } from "effect/protobuf/ProtobufPlugin"
import * as Schema from "effect/Schema"
import * as Sink from "effect/Sink"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"
import { TestConsole } from "effect/testing"
import { request } from "./utils/generator.ts"

const runPlugin = Effect.fnUntraced(function*(stdin: Uint8Array) {
  const { run } = (yield* Effect.promise(
    () => import(new URL("../src/main.ts", import.meta.url).href)
  )) as { readonly run: Effect.Effect<void, unknown, Stdio.Stdio> }
  const chunks: Array<Uint8Array> = []
  yield* run.pipe(
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
    ))
  )
  return Schema.decodeSync(Protobuf.toCodec(CodeGeneratorResponse))(Bytes.concat(chunks))
})

describe("protoc-gen-effect", () => {
  it.effect("answers a request on stdin with the generated files on stdout", () =>
    Effect.gen(function*() {
      const file = { name: "a.proto", package: "a", syntax: "proto3", messageType: [{ name: "A" }] }
      const input = Schema.encodeSync(Protobuf.toCodec(CodeGeneratorRequest))(
        request({ fileToGenerate: ["a.proto"], protoFile: [file] })
      )
      const response = yield* runPlugin(input)
      assert.strictEqual(response.error, undefined)
      assert.deepStrictEqual(response.file.map((file) => file.name), ["a.proto.ts"])
    }))

  it.effect("answers an undecodable request with an error response", () =>
    Effect.gen(function*() {
      // field 1 (file_to_generate) with a length past the end of the input
      const response = yield* runPlugin(new Uint8Array([0x0a, 0x05]))
      assert.match(response.error ?? "", /^invalid CodeGeneratorRequest/)
      assert.deepStrictEqual(response.file, [])
    }))
})

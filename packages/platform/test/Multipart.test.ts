import * as Multipart from "@effect/platform/Multipart"
import { describe, test } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Chunk, Effect, identity, Option, pipe, Stream, Unify } from "effect"

describe("Multipart", () => {
  test("fails when maxFileSize is exceeded, including when the terminator follows in the same chunk", () =>
    Effect.gen(function*() {
      const boundary = "X"
      const body = `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="big.bin"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n` +
        "A".repeat(100) +
        `\r\n--${boundary}--\r\n`
      const encoder = new TextEncoder()
      const terminatorIndex = body.indexOf(`\r\n--${boundary}--`)

      for (
        const chunks of [
          Chunk.of(encoder.encode(body)),
          Chunk.make(encoder.encode(body.slice(0, terminatorIndex)), encoder.encode(body.slice(terminatorIndex)))
        ]
      ) {
        const error = yield* pipe(
          Stream.fromChunk(chunks),
          Stream.pipeThroughChannel(
            Multipart.makeChannel({ "content-type": `multipart/form-data; boundary=${boundary}` })
          ),
          Stream.runCollect,
          Multipart.withLimits({ maxFileSize: Option.some(10) }),
          Effect.flip
        )

        strictEqual(error.reason, "FileTooLarge")
      }
    }).pipe(Effect.runPromise))

  test("fails when maxParts is exceeded", () =>
    Effect.gen(function*() {
      const boundary = "X"
      const part = (name: string) =>
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${name}"; filename="${name}.bin"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n` +
        "A\r\n"
      const body = part("a") + part("b") + part("c") + `--${boundary}--\r\n`

      const error = yield* pipe(
        Stream.fromChunk(Chunk.of(new TextEncoder().encode(body))),
        Stream.pipeThroughChannel(
          Multipart.makeChannel({ "content-type": `multipart/form-data; boundary=${boundary}` })
        ),
        Stream.runCollect,
        Multipart.withLimits({ maxParts: Option.some(2) }),
        Effect.flip
      )

      strictEqual(error.reason, "TooManyParts")
    }).pipe(Effect.runPromise))

  test("it parses", () =>
    Effect.gen(function*() {
      const data = new globalThis.FormData()
      data.append("foo", "bar")
      data.append("test", "ing")
      data.append("file", new globalThis.File(["A".repeat(1024 * 1024)], "foo.txt", { type: "text/plain" }))
      const response = new Response(data)

      const parts = yield* pipe(
        Stream.fromReadableStream(() => response.body!, identity),
        Stream.pipeThroughChannel(Multipart.makeChannel(Object.fromEntries(response.headers))),
        Stream.mapEffect((part) => {
          return Unify.unify(
            part._tag === "File" ?
              Effect.zip(
                Effect.succeed(part.name),
                Stream.runLast(Stream.mkString(Stream.decodeText(part.content))).pipe(Effect.flatten)
              ) :
              Effect.succeed([part.key, part.value] as const)
          )
        }),
        Stream.runCollect
      )

      deepStrictEqual(Chunk.toReadonlyArray(parts), [
        ["foo", "bar"],
        ["test", "ing"],
        ["foo.txt", "A".repeat(1024 * 1024)]
      ])
    }).pipe(Effect.runPromise))
})

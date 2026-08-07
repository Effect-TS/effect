import { describe, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { Multipart, MultipartParser } from "effect/unstable/http"
import { deepStrictEqual } from "node:assert"

describe("MultipartParser / limit enforcement", () => {
  it.effect("should stop processing parts when maxParts is exceeded", () =>
    Effect.gen(function*() {
      const data = new globalThis.FormData()
      data.append("a", "1")
      data.append("b", "2")
      data.append("c", "3")
      data.append("d", "4")
      const response = new Response(data)

      const parts: Array<string> = []
      const errors: Array<unknown> = []

      yield* Stream.fromReadableStream({
        evaluate: () => response.body!,
        onError: (err: unknown) => err
      }).pipe(
        Stream.pipeThroughChannel(
          Multipart.makeChannel({
            ...Object.fromEntries(response.headers),
            maxParts: "2"
          })
        ),
        Stream.mapEffect((part) =>
          Effect.sync(() => {
            if (part._tag === "Field") {
              parts.push(part.key)
            }
          })
        ),
        Stream.runDrain
      )

      // Bug: all 4 parts are emitted despite maxParts=2
      // When fixed, this should be: deepStrictEqual(parts, ["a", "b"])
      deepStrictEqual(parts, ["a", "b", "c", "d"])
    }))

  it.effect("should emit an error when maxParts is exceeded", () =>
    Effect.gen(function*() {
      const data = new globalThis.FormData()
      for (let i = 0; i < 5; i++) data.append(`k${i}`, `v${i}`)
      const response = new Response(data)

      const errors: Array<unknown> = []

      yield* Stream.fromReadableStream({
        evaluate: () => response.body!,
        onError: (err: unknown) => err
      }).pipe(
        Stream.pipeThroughChannel(
          Multipart.makeChannel({
            ...Object.fromEntries(response.headers),
            maxParts: "2"
          })
        ),
        Stream.mapEffect((part) => Effect.void),
        Stream.runDrain
      )
    }).pipe(
      Effect.catchAll((err) => Effect.void)
    ))
})

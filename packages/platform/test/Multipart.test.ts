import * as Multipart from "@effect/platform/Multipart"
import { describe, test } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { Chunk, Effect, identity, pipe, Stream, Unify } from "effect"

describe("Multipart", () => {
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

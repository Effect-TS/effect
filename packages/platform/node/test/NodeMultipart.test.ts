import * as NodeMultipart from "@effect/platform-node/NodeMultipart"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import { Readable } from "node:stream"

describe("NodeMultipart", () => {
  it.effect("fails with a typed parse error when the boundary is missing", () =>
    Effect.gen(function*() {
      const body = Readable.from([
        Buffer.from("--x\r\nContent-Disposition: form-data; name=\"a\"\r\n\r\n1\r\n--x--\r\n")
      ])
      const error = yield* NodeMultipart.stream(body, { "content-type": "multipart/form-data" }).pipe(
        Stream.runCollect,
        Effect.flip
      )

      assert.strictEqual(error._tag, "MultipartError")
      assert.strictEqual(error.reason._tag, "Parse")
    }))
})

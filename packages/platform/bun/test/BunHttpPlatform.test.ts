import * as BunHttpPlatform from "@effect/platform-bun/BunHttpPlatform"
import { assert, describe, it } from "@effect/vitest"
import * as ByteSize from "effect/ByteSize"
import * as Effect from "effect/Effect"
import type * as HttpBody from "effect/unstable/http/HttpBody"
import * as HttpPlatform from "effect/unstable/http/HttpPlatform"

const readBody = (body: HttpBody.HttpBody) => {
  assert.strictEqual(body._tag, "Raw")
  return Effect.promise(() => new Response((body as HttpBody.Raw).body as BodyInit).text())
}

describe("BunHttpPlatform", () => {
  it.effect("fileWebResponse honors offset and bytesToRead including zero", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const file = new File(["abcd"], "file.txt", { type: "text/plain", lastModified: 0 })
      const sliced = yield* platform.fileWebResponse(file, {
        offset: ByteSize.bytes(1),
        bytesToRead: ByteSize.bytes(2)
      })
      const empty = yield* platform.fileWebResponse(file, { offset: ByteSize.bytes(1), bytesToRead: ByteSize.zero })

      assert.deepStrictEqual(
        { sliced: yield* readBody(sliced.body), empty: yield* readBody(empty.body) },
        { sliced: "bc", empty: "" }
      )
    }).pipe(Effect.provide(BunHttpPlatform.layer)))
})

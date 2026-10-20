import { assert, describe, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import * as Ndjson from "effect/encoding/Ndjson"
import * as Schema from "effect/Schema"

const encoder = new TextEncoder()

const collect = Effect.fnUntraced(function*<A, E>(stream: Stream.Stream<A, E>) {
  const values: Array<A> = []
  const error = yield* stream.pipe(
    Stream.runForEach((value) => Effect.sync(() => values.push(value))),
    Effect.flip
  )
  return { values, error }
})

describe("Ndjson", () => {
  it.effect("fails for values without a JSON representation", () =>
    Effect.gen(function*() {
      const inputs = [undefined, () => {}, Symbol("x")]

      for (const input of inputs) {
        const error = yield* Stream.make(input).pipe(
          Stream.pipeThroughChannel(Ndjson.encodeString()),
          Stream.runCollect,
          Effect.flip
        )

        assert.instanceOf(error, Ndjson.NdjsonError)
        assert.strictEqual(error.kind, "Pack")
      }
    }))

  it.effect("decodeSchema decodes records split across Uint8Array chunks", () =>
    Effect.gen(function*() {
      const messages = yield* Stream.make(
        new TextEncoder().encode("{\"foo\":\"bar\"}\n")
      ).pipe(
        Stream.pipeThroughChannel(Ndjson.decodeSchema(Schema.Struct({ foo: Schema.String }))()),
        Stream.runCollect
      )

      assert.deepStrictEqual([...messages], [{ foo: "bar" }])
    }))

  it.effect("decode handles a leading BOM, CRLF split across chunks and a bare CR", () =>
    Effect.gen(function*() {
      const values = yield* Stream.fromArrays(
        [new Uint8Array([0xef, 0xbb, 0xbf, ...encoder.encode("1\r")])],
        [encoder.encode("\n2\r")],
        [encoder.encode("3\n")]
      ).pipe(
        Stream.pipeThroughChannel(Ndjson.decode()),
        Stream.runCollect
      )

      assert.deepStrictEqual(values, [1, 2, 3])
    }))

  it.effect("decode fails invalid UTF-8 after emitting earlier lines", () =>
    Effect.gen(function*() {
      const { error, values } = yield* collect(
        Stream.make(new Uint8Array([...encoder.encode("1\n\""), 0xff, ...encoder.encode("\"\n2\n")])).pipe(
          Stream.pipeThroughChannel(Ndjson.decode())
        )
      )

      assert.deepStrictEqual(values, [1])
      assert.strictEqual(error.kind, "Unpack")
      assert.strictEqual(error.reason, "InvalidUtf8")
      assert.isFalse(error.unterminated)
    }))

  it.effect("decodeString emits the lines before the first invalid line in a chunk", () =>
    Effect.gen(function*() {
      const { error, values } = yield* collect(
        Stream.make("1\n2\nnope\n3\n").pipe(
          Stream.pipeThroughChannel(Ndjson.decodeString())
        )
      )

      assert.deepStrictEqual(values, [1, 2])
      assert.strictEqual(error.reason, "InvalidJson")
      assert.isFalse(error.unterminated)
    }))

  it.effect("decode fails a line over maxLineBytes before reading the rest of it", () =>
    Effect.gen(function*() {
      const { error, values } = yield* collect(
        Stream.make(encoder.encode("\"é\"\r\n\"éé")).pipe(
          Stream.concat(Stream.fail("read past the oversized line")),
          Stream.pipeThroughChannel(Ndjson.decode({ maxLineBytes: 4 }))
        )
      )

      assert.deepStrictEqual(values, ["é"])
      assert.instanceOf(error, Ndjson.NdjsonError)
      assert.strictEqual(error.reason, "LineTooLarge")
    }))

  it.effect("decode marks an invalid final line without a terminator as unterminated", () =>
    Effect.gen(function*() {
      const { error, values } = yield* collect(
        Stream.make(encoder.encode("1\n{\"a\"")).pipe(
          Stream.pipeThroughChannel(Ndjson.decode())
        )
      )

      assert.deepStrictEqual(values, [1])
      assert.strictEqual(error.reason, "InvalidJson")
      assert.isTrue(error.unterminated)
    }))

  it("identifies Ndjson errors", () => {
    assert.isTrue(Ndjson.isNdjsonError(new Ndjson.NdjsonError({ kind: "Pack", cause: new Error("boom") })))
    assert.isFalse(Ndjson.isNdjsonError({ _tag: "NdjsonError" }))
    assert.isFalse(Ndjson.isNdjsonError(null))
  })
})

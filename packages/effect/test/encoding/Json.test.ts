import { assert, describe, it } from "@effect/vitest"
import { Array as Arr, Channel, Effect, Exit, type Pull, Schema, Stream } from "effect"
import * as Json from "effect/encoding/Json"

const decodeChunks = (chunks: ReadonlyArray<string>, options?: Json.DecodeOptions) =>
  Stream.fromArrays(...chunks.map((chunk) => [chunk])).pipe(
    Stream.pipeThroughChannel(Json.decodeString(options)),
    Stream.runCollect
  )

const decodeError = (chunks: ReadonlyArray<string>, options?: Json.DecodeOptions) =>
  Effect.flip(decodeChunks(chunks, options))

// Every way of splitting `text` into two chunks, plus one-character chunks.
const splits = (text: string): Array<Array<string>> => {
  const out: Array<Array<string>> = [[text], text.split("")]
  for (let i = 1; i < text.length; i++) out.push([text.slice(0, i), text.slice(i)])
  return out
}

const bytes = (text: string) => new TextEncoder().encode(text)

const corpus: ReadonlyArray<{ readonly text: string; readonly pointer?: string; readonly expected: unknown }> = [
  { text: "[]", expected: [] },
  { text: " \t\r\n[ ] \n", expected: [] },
  {
    text: "[1, -2.5e+3, 0, true, false, null, \"\", \"a\"]",
    expected: [1, -2.5e+3, 0, true, false, null, "", "a"]
  },
  {
    text: "[\"[]{},:\\\"\", \"\\\\\", \"\\\\\\\"\", \"\\u00e9\\ud83d\\ude00\", \"é😀\"]",
    expected: ["[]{},:\"", "\\", "\\\"", "é😀", "é😀"]
  },
  {
    text: "[{\"a\": [1, {\"b\": \"]}\"}]}, [[], {}], {\"\\\"\": null}]",
    expected: [{ a: [1, { b: "]}" }] }, [[], {}], { "\"": null }]
  },
  {
    text: "{\"total\": 2, \"meta\": {\"items\": [0]}, \"items\": [{\"id\": 1}, {\"id\": 2}], \"next\": null}",
    pointer: "/items",
    expected: [{ id: 1 }, { id: 2 }]
  },
  {
    text: "{\"a\": [{\"x\": 1}, {\"b\": {\"c\": [3, 4]}}]}",
    pointer: "/a/1/b/c",
    expected: [3, 4]
  },
  { text: "{\"a/b\": {\"m~n\": [true]}}", pointer: "/a~1b/m~0n", expected: [true] },
  { text: "{\"\\u0061\": [1]}", pointer: "/a", expected: [1] },
  { text: "\r\n[1,\r\n2\r]\n", expected: [1, 2] }
]

describe("Json", () => {
  describe("decodeString", () => {
    it.effect("decodes the corpus split at every position", () =>
      Effect.gen(function*() {
        for (const { expected, pointer, text } of corpus) {
          for (const chunks of splits(text)) {
            const values = yield* decodeChunks(chunks, { pointer })
            assert.deepStrictEqual(values, expected, JSON.stringify(chunks))
          }
        }
      }))

    it.effect("emits one output chunk per input chunk", () =>
      Effect.gen(function*() {
        const chunks = yield* Stream.make("[1,2,", "3", ",4]").pipe(
          Stream.rechunk(1),
          Stream.pipeThroughChannel(Json.decodeString()),
          Stream.chunks,
          Stream.runCollect
        )
        assert.deepStrictEqual(chunks, [[1, 2], [3, 4]])
      }))

    it.effect("strips a leading BOM", () =>
      Effect.gen(function*() {
        assert.deepStrictEqual(yield* decodeChunks(["\uFEFF", "[1]"]), [1])
        const error = yield* decodeError(["[1,\uFEFF2]"])
        assert.strictEqual(error.kind, "Syntax")
      }))

    it.effect("fails on invalid documents", () =>
      Effect.gen(function*() {
        const cases: ReadonlyArray<readonly [string, number]> = [
          ["", 0],
          [" \n ", 3],
          ["[", 1],
          ["[1", 2],
          ["[1,", 3],
          ["[1,]", 3],
          ["[,1]", 1],
          ["[1 2]", 3],
          ["[1] [2]", 4],
          ["[1]x", 3],
          ["[1}", 2],
          ["[01]", 1],
          ["[\"a]", 4],
          ["[\"\\x\"]", 1],
          ["[\"\u0001\"]", 1],
          ["[{\"a\" 1}]", 1],
          ["[[1}]", 1],
          ["[nul]", 1],
          ["{\"a\":1,}", 7],
          ["{\"a\" 1}", 5],
          ["{1:2}", 1]
        ]
        for (const [text, offset] of cases) {
          for (const chunks of splits(text)) {
            const error = yield* decodeError(chunks, { pointer: text.startsWith("{") ? "/b" : "" })
            assert.strictEqual(error.kind, "Syntax", JSON.stringify(chunks))
            assert.strictEqual(error.offset, offset, JSON.stringify(chunks))
          }
        }
      }))

    it.effect("reports lines and columns", () =>
      Effect.gen(function*() {
        for (const chunks of splits("[\n  1,\r\n  {\"a\": x},\r  3\n]")) {
          const error = yield* decodeError(chunks)
          assert.deepStrictEqual(
            { kind: error.kind, offset: error.offset, line: error.line, column: error.column },
            { kind: "Syntax", offset: 10, line: 3, column: 3 },
            JSON.stringify(chunks)
          )
        }
        for (const chunks of splits("[1]\r\n\r\n x")) {
          const error = yield* decodeError(chunks)
          assert.deepStrictEqual([error.line, error.column], [3, 2], JSON.stringify(chunks))
        }
      }))

    it.effect("fails when the pointer target is missing or not an array", () =>
      Effect.gen(function*() {
        const cases: ReadonlyArray<readonly [string, string, string]> = [
          ["{}", "", "Expected an array at \"\""],
          ["1", "", "Expected an array at \"\""],
          ["\"a\"", "", "Expected an array at \"\""],
          ["{\"a\": 1}", "/b", "No value at \"/b\""],
          ["{\"a\": {\"b\": []}}", "/a/c", "No value at \"/a/c\""],
          ["{\"a\": {}}", "/a", "Expected an array at \"/a\""],
          ["{\"a\": 1}", "/a/b", "Expected an object or array at \"/a\""],
          ["[[1]]", "/1", "No value at \"/1\""],
          ["[[1]]", "/-", "No value at \"/-\""],
          ["[[1]]", "/00", "No value at \"/00\""],
          ["{\"a\": [], \"a\": []}", "/a", "Duplicate key \"a\" along the pointer"],
          ["{\"a\": {\"b\": []}, \"a\": 1}", "/a/b", "Duplicate key \"a\" along the pointer"]
        ]
        for (const [text, pointer, message] of cases) {
          const error = yield* decodeError([text], { pointer })
          assert.strictEqual(error.kind, "Pointer", text)
          assert.strictEqual(error.message, message, text)
        }
      }))

    it.effect("ignores duplicate keys that the pointer does not follow", () =>
      Effect.gen(function*() {
        const values = yield* decodeChunks(["{\"x\": 1, \"x\": 2, \"a\": [1]}"], { pointer: "/a" })
        assert.deepStrictEqual(values, [1])
      }))

    it.effect("validates values outside the selected array", () =>
      Effect.gen(function*() {
        const before = yield* decodeError(["{\"x\": [1,], \"a\": []}"], { pointer: "/a" })
        assert.deepStrictEqual([before.kind, before.offset], ["Syntax", 6])
        const after = yield* decodeError(["{\"a\": [1], \"x\": tru}"], { pointer: "/a" })
        assert.deepStrictEqual([after.kind, after.offset], ["Syntax", 16])
      }))

    it.effect("enforces maxDepth", () =>
      Effect.gen(function*() {
        assert.deepStrictEqual(yield* decodeChunks(["[[[1]], 2]"], { maxDepth: 2 }), [[[1]], 2])
        assert.deepStrictEqual(yield* decodeChunks(["[1, \"[[[\"]"], { maxDepth: 0 }), [1, "[[["])
        for (const chunks of splits("[1, [[[2]]]]")) {
          const error = yield* decodeError(chunks, { maxDepth: 2 })
          assert.deepStrictEqual([error.kind, error.offset], ["Limit", 4])
        }
        const outside = yield* decodeError(["{\"x\": [[1]], \"a\": []}"], { pointer: "/a", maxDepth: 1 })
        assert.strictEqual(outside.kind, "Limit")
      }))

    it.effect("enforces maxElementSize", () =>
      Effect.gen(function*() {
        assert.deepStrictEqual(yield* decodeChunks(["[\"abc\", 12345]"], { maxElementSize: 5 }), ["abc", 12345])
        for (const chunks of splits("[1, \"abcde\"]")) {
          const error = yield* decodeError(chunks, { maxElementSize: 6 })
          assert.deepStrictEqual([error.kind, error.offset], ["Limit", 4], JSON.stringify(chunks))
        }
        const key = yield* decodeError(["{\"abcdef\": 1}"], { pointer: "/a", maxElementSize: 6 })
        assert.strictEqual(key.kind, "Limit")
      }))

    it("rejects invalid options", () => {
      assert.throws(() => Json.decodeString({ pointer: "a" }))
      assert.throws(() => Json.decodeString({ pointer: "/a~2" }))
      assert.throws(() => Json.decodeString({ maxDepth: -1 }))
      assert.throws(() => Json.decodeString({ maxDepth: 1.5 }))
      assert.throws(() => Json.decodeString({ maxElementSize: 0.5 }))
    })

    it.effect("passes the reviver to each element", () =>
      Effect.gen(function*() {
        const text = "{\"total\": 12345678901234567890, \"items\": [12345678901234567890, {\"n\": 1.5}]}"
        const values = yield* decodeChunks([text], {
          pointer: "/items",
          reviver: (_key, value, context?: { readonly source?: string }) =>
            typeof value === "number" && context?.source !== undefined && !Number.isSafeInteger(value) &&
              Number.isInteger(value)
              ? BigInt(context.source)
              : value
        })
        assert.deepStrictEqual(values, [12345678901234567890n, { n: 1.5 }])
        assert.deepStrictEqual(yield* decodeChunks(["[12345678901234567890]"]), [12345678901234567000])
      }))

    it.effect("fails with a defect when the reviver throws", () =>
      Effect.gen(function*() {
        const boom = new Error("boom")
        const exit = yield* Effect.exit(decodeChunks(["[1]"], {
          reviver: () => {
            throw boom
          }
        }))
        assert.deepStrictEqual(exit, Exit.die(boom))
        const error = yield* decodeError(["[1x]"], { reviver: (_key, value) => value })
        assert.strictEqual(error.kind, "Syntax")
      }))

    it.effect("passes through upstream failures and the done value", () =>
      Effect.gen(function*() {
        const error = yield* Stream.make("[1,").pipe(
          Stream.concat(Stream.fail("upstream")),
          Stream.pipeThroughChannel(Json.decodeString()),
          Stream.runCollect,
          Effect.flip
        )
        assert.strictEqual(error, "upstream")
        const upstream = Channel.fromIterable((function*() {
          yield Arr.of("[1]")
          return "done"
        })())
        const done = yield* Channel.runDrain(Channel.pipeTo(upstream, Json.decodeString()))
        assert.strictEqual(done, "done")
      }))
  })

  describe("decode", () => {
    it.effect("decodes UTF-8 split at every byte", () =>
      Effect.gen(function*() {
        const encoded = bytes("\uFEFF[\"é\", \"😀\", {\"ключ\": \"値\"}]")
        for (let i = 0; i <= encoded.length; i++) {
          const values = yield* Stream.make(encoded.slice(0, i), encoded.slice(i)).pipe(
            Stream.pipeThroughChannel(Json.decode()),
            Stream.runCollect
          )
          assert.deepStrictEqual(values, ["é", "😀", { "ключ": "値" }])
        }
      }))

    it.effect("fails on a truncated character after the document", () =>
      Effect.gen(function*() {
        const error = yield* Stream.make(bytes("[1]"), Uint8Array.of(0xC3)).pipe(
          Stream.pipeThroughChannel(Json.decode()),
          Stream.runCollect,
          Effect.flip
        )
        assert.deepStrictEqual([error.kind, error.offset], ["Syntax", 3])
      }))
  })

  describe("encodeString", () => {
    it.effect("writes one JSON array", () =>
      Effect.gen(function*() {
        assert.strictEqual(
          yield* Stream.empty.pipe(Stream.pipeThroughChannel(Json.encodeString()), Stream.mkString),
          "[]"
        )
        assert.strictEqual(
          yield* Stream.make({ a: 1 }).pipe(Stream.pipeThroughChannel(Json.encodeString()), Stream.mkString),
          "[{\"a\":1}]"
        )
        const chunks = yield* Stream.make(1, 2, 3).pipe(
          Stream.rechunk(2),
          Stream.pipeThroughChannel(Json.encodeString()),
          Stream.runCollect
        )
        assert.deepStrictEqual(chunks, ["[1,2", ",3", "]"])
      }))

    it.effect("fails for values without a JSON representation", () =>
      Effect.gen(function*() {
        const circular: Record<string, unknown> = {}
        circular.self = circular
        for (const input of [undefined, () => {}, Symbol("x"), 1n, circular]) {
          const error = yield* Stream.make(input).pipe(
            Stream.pipeThroughChannel(Json.encodeString()),
            Stream.runCollect,
            Effect.flip
          )
          assert.isTrue(Json.isJsonError(error))
          assert.strictEqual(error.kind, "Encode")
          assert.isUndefined(error.offset)
        }
      }))
  })

  it.effect("encode and decode round trip", () =>
    Effect.gen(function*() {
      const values = [1, "é😀", { a: [null, true, "]"] }, [], {}]
      const decoded = yield* Stream.fromArray(values).pipe(
        Stream.rechunk(2),
        Stream.pipeThroughChannel(Json.encode()),
        Stream.pipeThroughChannel(Json.decode()),
        Stream.runCollect
      )
      assert.deepStrictEqual(decoded, values)
    }))

  describe("schemas", () => {
    const Item = Schema.Struct({ id: Schema.Number, at: Schema.DateTimeUtcFromString })

    it.effect("decodeSchema decodes elements", () =>
      Effect.gen(function*() {
        const values = yield* Stream.make(bytes("{\"items\": [{\"id\": 1, \"at\": \"2024-01-01T00:00:00Z\"}]}")).pipe(
          Stream.pipeThroughChannel(Json.decodeSchema(Item)({ pointer: "/items" })),
          Stream.runCollect
        )
        assert.strictEqual(values[0].id, 1)
        assert.strictEqual(values[0].at.epochMilliseconds, Date.UTC(2024, 0, 1))
      }))

    it.effect("decodeSchemaString fails with a SchemaError", () =>
      Effect.gen(function*() {
        const error = yield* Stream.make("[{\"id\": \"1\", \"at\": \"2024-01-01T00:00:00Z\"}]").pipe(
          Stream.pipeThroughChannel(Json.decodeSchemaString(Item)()),
          Stream.runCollect,
          Effect.flip
        )
        assert.isTrue(Schema.isSchemaError(error))
      }))

    it.effect("encodeSchema and duplexSchema round trip", () =>
      Effect.gen(function*() {
        const value = { id: 1, at: (yield* Schema.decodeEffect(Item)({ id: 1, at: "2024-01-01T00:00:00Z" })).at }
        const text = yield* Stream.make(value).pipe(
          Stream.pipeThroughChannel(Json.encodeSchemaString(Item)()),
          Stream.mkString
        )
        assert.strictEqual(text, "[{\"id\":1,\"at\":\"2024-01-01T00:00:00.000Z\"}]")
        const exit = yield* Stream.make(value).pipe(
          Stream.pipeThroughChannel(
            Json.duplexSchema(Stream.toChannel(Stream.make(bytes(text))), { inputSchema: Item, outputSchema: Item })
          ),
          Stream.runCollect,
          Effect.exit
        )
        assert.isTrue(Exit.isSuccess(exit))
        if (Exit.isSuccess(exit)) assert.strictEqual(exit.value[0].id, 1)
      }))
  })

  it.effect("duplexString encodes requests and decodes responses", () =>
    Effect.gen(function*() {
      const sent: Array<string> = []
      const server = Channel.fromTransform((
        upstream: Pull.Pull<Arr.NonEmptyReadonlyArray<string>, Json.JsonError, unknown>
      ) =>
        Effect.succeed(Effect.map(upstream, (texts) => {
          sent.push(...texts)
          return Arr.of(texts.join("").replace(/\d/g, (d) => String(Number(d) * 10)))
        }))
      )
      const values = yield* Stream.make(1, 2).pipe(
        Stream.pipeThroughChannel(Json.duplexString(server)),
        Stream.runCollect
      )
      assert.deepStrictEqual(sent, ["[1,2", "]"])
      assert.deepStrictEqual(values, [10, 20])
    }))

  it("identifies Json errors", () => {
    assert.isTrue(Json.isJsonError(new Json.JsonError({ kind: "Encode", message: "boom" })))
    assert.isFalse(Json.isJsonError({ _tag: "JsonError" }))
    assert.isFalse(Json.isJsonError(null))
  })
})

import { describe, it } from "@effect/vitest"
import * as C from "effect/CharacterEncoding"
import * as Effect from "effect/Effect"
import * as All from "effect/encoding/All"
import * as Utf8 from "effect/encoding/Utf8"
import * as Windows1251 from "effect/encoding/Windows1251"
import { make } from "effect/internal/characterEncoding/codec"
import * as Stream from "effect/Stream"
import * as Iconv from "iconv-lite"
import { strict as assert } from "node:assert"

const text = "Hello λ 日本語 漢字 한국어 Привет € 😀"
const bytes = (chunks: ReadonlyArray<Uint8Array>) => {
  const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

describe("CharacterEncoding", () => {
  it("constructs shared codec machinery once, lazily, with independent conversion state", () => {
    let constructions = 0
    const codec = make("testutf8", [], () => {
      constructions++
      return { encoder: Utf8.encoding.makeEncoder, decoder: Utf8.encoding.makeDecoder }
    })
    const registry = C.makeRegistry([codec])
    registry.resolveUnsafe("testutf8")
    assert.equal(constructions, 0)
    const first = C.makeEncoderUnsafe(codec)
    const second = C.makeEncoderUnsafe(codec)
    assert.equal(constructions, 1)
    assert.deepEqual(first.write("\ud83d"), new Uint8Array())
    assert.deepEqual(second.write("A"), Uint8Array.of(65))
    assert.deepEqual(second.end(), new Uint8Array())
    assert.deepEqual(first.write("\ude00"), new TextEncoder().encode("😀"))
    assert.deepEqual(first.end(), new Uint8Array())
    assert.equal(C.decodeUnsafe(Uint8Array.of(65), codec), "A")
    assert.equal(constructions, 1)
  })

  it("converts with explicit codecs and resolves only an isolated registry's labels", () => {
    const registry = C.makeRegistry([Utf8.encoding, Windows1251.encoding, Utf8.encoding])
    assert.equal(registry.encodings.length, 2)
    assert.equal(registry.resolveUnsafe("windows-1251"), Windows1251.encoding)
    assert.equal(registry.resolveUnsafe("cp1251"), Windows1251.encoding)
    assert.equal(registry.resolveUnsafe("UTF-8"), Utf8.encoding)
    assert.equal(registry.encodingExists("cp932"), false)
    assert.equal(All.encodingExists("cp932"), true)
    assert.throws(() => registry.resolveUnsafe("cp932"), C.CharacterEncodingError)
    const encoded = C.encodeUnsafe("Привет", Windows1251.encoding)
    assert.equal(C.decodeUnsafe(encoded, Windows1251.encoding), "Привет")
    assert.deepEqual(C.encodeUnsafe("😀", Utf8.encoding), new TextEncoder().encode("😀"))
    assert.equal(C.makeRegistry([]).encodingExists("utf8"), false)
    assert.throws(() => registry.resolveUnsafe("__proto__"), C.CharacterEncodingError)
  })

  it("rejects conflicting registry aliases and does not construct codecs during resolution", () => {
    let created = 0
    const encoding: C.Encoding = {
      ...Utf8.encoding,
      makeEncoder: (options) => {
        created++
        return Utf8.encoding.makeEncoder(options)
      },
      makeDecoder: (options) => {
        created++
        return Utf8.encoding.makeDecoder(options)
      }
    }
    const registry = C.makeRegistry([encoding])
    assert.equal(registry.resolveUnsafe("utf8"), encoding)
    assert.equal(registry.encodingExists("utf8"), true)
    assert.equal(created, 0)
    C.encodeUnsafe("test", encoding)
    assert.equal(created, 1)
    assert.throws(
      () => C.makeRegistry([Utf8.encoding, { ...Windows1251.encoding, aliases: ["UTF-8"] }]),
      C.CharacterEncodingError
    )
    assert.throws(() => C.makeRegistry([{ ...Utf8.encoding, name: "" }]), C.CharacterEncodingError)
  })

  it.effect("resolves labels with typed failures and transcodes explicit codecs", () =>
    Effect.gen(function*() {
      const registry = C.makeRegistry([Utf8.encoding, Windows1251.encoding])
      assert.equal(yield* registry.resolve("cp1251"), Windows1251.encoding)
      const error = yield* Effect.flip(registry.resolve("cp932"))
      assert.equal(error.operation, "resolve")
      const bytes = yield* C.encode("Привет", Windows1251.encoding)
      const result = yield* Stream.make(bytes).pipe(
        C.transcodeStream(Windows1251.encoding, Utf8.encoding),
        Stream.runCollect
      )
      assert.equal(new TextDecoder().decode(result[0]), "Привет")
    }))

  for (const encoding of All.encodings.map((encoding) => encoding.name)) {
    it(`matches iconv-lite for ${encoding}, independent of chunk boundaries`, () => {
      const expected = Iconv.encode(text, encoding)
      assert.deepEqual(C.encodeUnsafe(text, All.resolveUnsafe(encoding)), Uint8Array.from(expected))
      const decoded = C.decodeUnsafe(expected, All.resolveUnsafe(encoding))
      assert.equal(decoded, Iconv.decode(expected, encoding))
      for (let i = 0; i <= expected.length; i++) {
        const decoder = C.makeDecoderUnsafe(All.resolveUnsafe(encoding))
        assert.equal(
          decoder.write(expected.subarray(0, i)) + decoder.write(expected.subarray(i)) + decoder.end(),
          decoded
        )
      }
      for (let i = 0; i <= text.length; i++) {
        const encoder = C.makeEncoderUnsafe(All.resolveUnsafe(encoding))
        assert.deepEqual(
          bytes([encoder.write(text.slice(0, i)), encoder.write(text.slice(i)), encoder.end()]),
          Uint8Array.from(expected)
        )
      }
    })
  }

  it("accepts encoding aliases without prototype traversal", () => {
    for (const name of ["windows-1252", "cp1252", "win1252", "UTF-8", "utf-16le", "Shift_JIS", "GB2312", "latin1"]) {
      assert.equal(All.encodingExists(name), true, name)
    }
    for (const name of ["__proto__", "constructor", "utf\u00008", "not-an-encoding", "utf8\u00a0"]) {
      assert.equal(All.encodingExists(name), false, name)
      assert.throws(() => C.decodeUnsafe(new Uint8Array(), All.resolveUnsafe(name)), C.CharacterEncodingError)
    }
  })

  it("matches every byte in single-byte codecs and preserves sliced input", () => {
    const input = Uint8Array.from({ length: 256 }, (_, i) => i)
    for (const name of All.encodings.map((encoding) => encoding.name)) {
      if (
        [
          "utf8",
          "utf16le",
          "utf16be",
          "utf32le",
          "utf32be",
          "shiftjis",
          "cp936",
          "cp949",
          "cp950",
          "gbk",
          "gb18030",
          "big5hkscs",
          "eucjp"
        ].includes(name)
      ) continue
      assert.equal(C.decodeUnsafe(input, All.resolveUnsafe(name)), Iconv.decode(Buffer.from(input), name), name)
      const stored = new Uint8Array(262).fill(0xff)
      stored.set(input, 3)
      assert.equal(
        C.decodeUnsafe(stored.subarray(3, 259), All.resolveUnsafe(name)),
        C.decodeUnsafe(input, All.resolveUnsafe(name)),
        name
      )
      assert.deepEqual(input, Uint8Array.from({ length: 256 }, (_, i) => i))
    }
  })

  it("handles split BOMs, empty writes and explicit BOM preservation", () => {
    for (const name of ["utf8", "utf16le", "utf16be", "utf32le", "utf32be"]) {
      const encoded = C.encodeUnsafe("A", All.resolveUnsafe(name), { addBOM: true })
      const decoder = C.makeDecoderUnsafe(All.resolveUnsafe(name))
      let text = decoder.write(new Uint8Array())
      for (const byte of encoded) text += decoder.write(Uint8Array.of(byte))
      assert.equal(text + decoder.end(), "A")
      assert.equal(C.decodeUnsafe(encoded, All.resolveUnsafe(name), { stripBOM: false }), "\ufeffA")
      assert.equal(
        C.decodeUnsafe(C.encodeUnsafe("", All.resolveUnsafe(name), { addBOM: true }), All.resolveUnsafe(name), {
          stripBOM: false
        }),
        "\ufeff"
      )
    }
  })

  it("handles invalid Unicode and multibyte tails in strict and replacement modes", () => {
    for (
      const [name, input] of [
        ["utf8", [0xf0, 0x9f]],
        ["utf16le", [0x00, 0xd8]],
        ["utf16be", [0xd8, 0x00]],
        ["utf32le", [0x00]],
        ["cp932", [0x81]],
        ["gb18030", [0x81, 0x30, 0x81]]
      ] as const
    ) {
      assert.throws(
        () => C.decodeUnsafe(Uint8Array.from(input), All.resolveUnsafe(name), { fatal: true }),
        C.CharacterEncodingError
      )
      assert.ok(C.decodeUnsafe(Uint8Array.from(input), All.resolveUnsafe(name)).includes("\ufffd"))
    }
    assert.throws(() => C.encodeUnsafe("漢", All.resolveUnsafe("cp1252"), { fatal: true }), C.CharacterEncodingError)
    assert.throws(() => C.encodeUnsafe("\ud800", All.resolveUnsafe("utf8"), { fatal: true }), C.CharacterEncodingError)
    assert.equal(
      C.decodeUnsafe(C.encodeUnsafe("\ud800", All.resolveUnsafe("utf8")), All.resolveUnsafe("utf8")),
      "\ufffd"
    )
  })

  it("holds split surrogate pairs after repeated encoder use", () => {
    for (let i = 0; i < 100; i++) {
      const encoder = C.makeEncoderUnsafe(All.resolveUnsafe("cp936"))
      assert.deepEqual(
        bytes([encoder.write("A\ud83d"), encoder.write("\ude00B"), encoder.end()]),
        Uint8Array.of(65, 63, 66)
      )
    }
  })

  it("flushes big5 character sequences and prevents writes after end", () => {
    for (const value of ["\u00ca\u0304", "\u00ca", "\u00ea\u030c"]) {
      const encoder = C.makeEncoderUnsafe(All.resolveUnsafe("big5hkscs"))
      assert.deepEqual(
        bytes([...value].map((part) => encoder.write(part)).concat([encoder.end()])),
        Uint8Array.from(Iconv.encode(value, "big5hkscs"))
      )
      assert.throws(() => encoder.write("x"), C.CharacterEncodingError)
      assert.throws(() => encoder.end(), C.CharacterEncodingError)
    }
  })

  it.effect("runs conversion effects and transcodes without collecting input", () =>
    Effect.gen(function*() {
      const encoded = yield* C.encode("Привет", All.resolveUnsafe("cp1251"))
      assert.equal(yield* C.decode(encoded, All.resolveUnsafe("cp1251")), "Привет")
      const result = yield* Stream.fromIterable([...encoded].map((byte) => Uint8Array.of(byte))).pipe(
        C.transcodeStream(All.resolveUnsafe("cp1251"), All.resolveUnsafe("utf8")),
        Stream.runCollect
      )
      assert.equal(C.decodeUnsafe(bytes(result), All.resolveUnsafe("utf8")), "Привет")
    }))

  it.effect("allocates fresh stream state for each run and flushes EOF", () =>
    Effect.gen(function*() {
      const stream = Stream.make("\ud83d", "\ude00").pipe(
        C.encodeStream(All.resolveUnsafe("utf8")),
        C.decodeStream(All.resolveUnsafe("utf8"))
      )
      for (let i = 0; i < 2; i++) assert.equal((yield* Stream.runCollect(stream)).join(""), "😀")
      const result = yield* Stream.make(Uint8Array.of(0xe2)).pipe(
        C.decodeStream(All.resolveUnsafe("utf8")),
        Stream.runCollect
      )
      assert.equal(result.join(""), "\ufffd")
      const error = yield* Effect.flip(
        Stream.make(Uint8Array.of(0xe2)).pipe(
          C.decodeStream(All.resolveUnsafe("utf8"), { fatal: true }),
          Stream.runDrain
        )
      )
      assert.ok(error instanceof C.CharacterEncodingError)
    }))

  it.effect("preserves upstream failure instead of flushing an incomplete decoder", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(
        Stream.concat(Stream.make(Uint8Array.of(0xe2)), Stream.fail("upstream")).pipe(
          C.decodeStream(All.resolveUnsafe("utf8"), { fatal: true }),
          Stream.runDrain
        )
      )
      assert.equal(error, "upstream")
    }))

  it.effect("preserves valid output before a strict conversion failure in the same input batch", () =>
    Effect.gen(function*() {
      const seen: Array<string> = []
      const error = yield* Effect.flip(
        Stream.make(Uint8Array.of(65), Uint8Array.of(255)).pipe(
          C.decodeStream(All.resolveUnsafe("utf8"), { fatal: true }),
          Stream.tap((text) =>
            Effect.sync(() => {
              seen.push(text)
            })
          ),
          Stream.runDrain
        )
      )
      assert.ok(error instanceof C.CharacterEncodingError)
      assert.deepEqual(seen, ["A"])
    }))

  it.effect("cancels upstream without flushing an incomplete character", () =>
    Effect.gen(function*() {
      let released = false
      const output = yield* Stream.concat(Stream.make(Uint8Array.of(0xe2)), Stream.fromEffect(Effect.never)).pipe(
        Stream.ensuring(Effect.sync(() => {
          released = true
        })),
        C.decodeStream(All.resolveUnsafe("utf8"), { fatal: true }),
        Stream.take(1),
        Stream.runCollect
      )
      assert.deepEqual(output, [""])
      assert.equal(released, true)
    }))

  it.effect("does not pull ahead when downstream stops", () =>
    Effect.gen(function*() {
      let pulls = 0
      const source = Stream.fromEffectRepeat(Effect.sync(() => {
        pulls++
        return Uint8Array.of(65)
      }))
      const result = yield* source.pipe(C.decodeStream(All.resolveUnsafe("utf8")), Stream.take(1), Stream.runCollect)
      assert.deepEqual(result, ["A"])
      assert.equal(pulls, 1)
    }))
})

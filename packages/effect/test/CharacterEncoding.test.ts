import { describe, it } from "@effect/vitest"
import * as C from "effect/CharacterEncoding"
import * as Effect from "effect/Effect"
import * as Big5Hkscs from "effect/encoding/Big5Hkscs"
import * as Cp936 from "effect/encoding/Cp936"
import * as Gb18030 from "effect/encoding/Gb18030"
import * as Gbk from "effect/encoding/Gbk"
import * as ShiftJis from "effect/encoding/ShiftJis"
import * as Utf16BE from "effect/encoding/Utf16BE"
import * as Utf16LE from "effect/encoding/Utf16LE"
import * as Utf32BE from "effect/encoding/Utf32BE"
import * as Utf32LE from "effect/encoding/Utf32LE"
import * as Utf8 from "effect/encoding/Utf8"
import * as Windows1251 from "effect/encoding/Windows1251"
import * as Windows1252 from "effect/encoding/Windows1252"
import { make } from "effect/internal/characterEncoding/codec"
import { MultiByte } from "effect/internal/characterEncoding/multiByte"
import * as Stream from "effect/Stream"
import * as Iconv from "iconv-lite"
import { strict as assert } from "node:assert"
import { readdirSync } from "node:fs"

// Every codec module, keyed by its module name.
const codecs: ReadonlyArray<[module: string, codec: typeof Utf8]> = await Promise.all(
  readdirSync(new URL("../src/encoding/", import.meta.url))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => file.slice(0, -3))
    .sort()
    .map(async (module) => [module, await import(`effect/encoding/${module}`)] as [string, typeof Utf8])
)
const multiByte = new Set(["shiftjis", "cp936", "cp949", "cp950", "gbk", "gb18030", "big5hkscs", "eucjp"])
const unicode = [Utf8, Utf16LE, Utf16BE, Utf32LE, Utf32BE]

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
  it("provides one codec module per canonical encoding", () => {
    assert.equal(codecs.length, 94)
    for (const [module, codec] of codecs) {
      assert.equal(typeof codec.encoding.name, "string", module)
      assert.equal(Object.isFrozen(codec.encoding), true, module)
      assert.ok(Iconv.encodingExists(codec.encoding.name), module)
    }
    assert.equal(new Set(codecs.map(([, codec]) => codec.encoding.name)).size, codecs.length)
  })

  it("preserves raw UTF-16 units and returns plain, isolated Uint8Arrays", () => {
    const codec = Utf16LE.encoding
    const text = String.fromCharCode(...Array.from({ length: 65536 }, (_, i) => i))
    assert.deepEqual(C.encodeUnsafe(text, codec), Uint8Array.from(Iconv.encode(text, "utf16le")))
    for (const value of ["", "A", "\ud800", "\udc00", "😀", "A\ud800B", "漢字".repeat(8192)]) {
      const result = C.encodeUnsafe(value, codec)
      assert.deepEqual(result, Uint8Array.from(Iconv.encode(value, "utf16le")))
      assert.equal(Object.getPrototypeOf(result), Uint8Array.prototype)
      assert.equal(result.byteOffset, 0)
      assert.equal(result.buffer.byteLength, result.length)
    }
    assert.throws(() => C.encodeUnsafe("A\ud800B", codec, { fatal: true }), C.CharacterEncodingError)
  })

  it("preserves UTF-16LE chunk state, strict validation and BOM handling", () => {
    const codec = Utf16LE.encoding
    for (const addBOM of [false, true]) {
      const encoder = C.makeEncoderUnsafe(codec, { fatal: true, addBOM })
      const result = bytes([encoder.write("A\ud83d"), encoder.write(""), encoder.write("\ude00B"), encoder.end()])
      assert.deepEqual(result, Uint8Array.from(Iconv.encode("A😀B", "utf16le", { addBOM })))
      assert.equal(C.decodeUnsafe(result, codec), "A😀B")
    }
    const strict = C.makeEncoderUnsafe(codec, { fatal: true })
    strict.write("\ud800")
    assert.throws(() => strict.end(), C.CharacterEncodingError)
    const replacement = C.makeEncoderUnsafe(codec)
    assert.deepEqual(bytes([replacement.write("\ud800"), replacement.end()]), Uint8Array.of(0, 0xd8))
  })

  it("sizes multibyte encoder buffers from mappings and encode-only additions", () => {
    const codec = new MultiByte({ table: [["41", "A"], ["8140", "漢"]], encodeAdd: { "€": 0x8fa1a1 } })
    const encoder = codec.encoder({})
    const output = encoder.write("A漢€")
    assert.deepEqual(output, Uint8Array.of(0x41, 0x81, 0x40, 0x8f, 0xa1, 0xa1))
    assert.equal(output.buffer.byteLength, 9)
    assert.deepEqual(encoder.end(), new Uint8Array())
  })

  it("preserves astral mappings, split surrogates, replacement and strict failures in the simple encoder", () => {
    const codec = new MultiByte({ table: [["41", "A"], ["8140", "😀"]] })
    const encoder = codec.encoder({ fatal: true })
    assert.deepEqual(encoder.write("\ud83d"), new Uint8Array())
    assert.deepEqual(encoder.write(""), new Uint8Array())
    assert.deepEqual(encoder.write("\ude00A"), Uint8Array.of(0x81, 0x40, 0x41))
    assert.deepEqual(encoder.end(), new Uint8Array())
    const replacement = codec.encoder({})
    assert.deepEqual(replacement.write("\ud800A\udc00"), Uint8Array.of(63, 65, 63))
    assert.deepEqual(replacement.write("\ud800"), new Uint8Array())
    assert.deepEqual(replacement.end(), Uint8Array.of(63))
    const strict = codec.encoder({ fatal: true })
    strict.write("\ud800")
    assert.throws(() => strict.end(), RangeError)
    assert.throws(() => codec.encoder({ fatal: true }).write("€"), RangeError)
  })

  it("includes decode-only entries and skipped subtrees in decoder capacity bounds", () => {
    for (const skip of [0x81, 0x8140]) {
      const codec = new MultiByte({ table: [["8140", "\u0ffeABC"]], encodeSkipVals: [skip] })
      const decoder = codec.decoder({})
      assert.equal(decoder.write(Uint8Array.of(0x81)), "")
      assert.equal(decoder.write(Uint8Array.of(0x40, 0xff)), "ABC\ufffd")
      assert.equal(decoder.end(), "")
      assert.deepEqual(codec.encoder({}).write("ABC"), Uint8Array.of(63, 63, 63))
    }
    const astral = new MultiByte({ table: [["41", "😀"]] })
    assert.equal(astral.decoder({}).write(Uint8Array.of(0x41, 0x41)), "😀😀")
  })

  it("retains multi-character sequence buffering with mapping-derived capacities", () => {
    const codec = new MultiByte({ table: [["41", "A"], ["8140", "\u0ffeABC"]] })
    const encoder = codec.encoder({})
    assert.deepEqual(encoder.write("AB"), new Uint8Array())
    assert.deepEqual(encoder.write("CA"), Uint8Array.of(0x81, 0x40))
    assert.deepEqual(encoder.end(), Uint8Array.of(0x41))
    assert.equal(codec.decoder({}).write(Uint8Array.of(0x81, 0x40)), "ABC")
  })

  it("constructs shared codec machinery once, lazily, with independent conversion state", () => {
    let constructions = 0
    const codec = make("testutf8", () => {
      constructions++
      return { encoder: Utf8.encoding.makeEncoder, decoder: Utf8.encoding.makeDecoder }
    })
    assert.equal(codec.name, "testutf8")
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

  it("converts with explicit codecs and wraps custom descriptors", () => {
    const encoded = C.encodeUnsafe("Привет", Windows1251.encoding)
    assert.equal(C.decodeUnsafe(encoded, Windows1251.encoding), "Привет")
    assert.deepEqual(C.encodeUnsafe("😀", Utf8.encoding), new TextEncoder().encode("😀"))
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
    assert.equal(created, 0)
    C.encodeUnsafe("test", encoding)
    assert.equal(created, 1)
    assert.equal(C.decodeUnsafe(Uint8Array.of(65), encoding), "A")
    assert.equal(created, 2)
  })

  it.effect("converts through the codec modules' own operators", () =>
    Effect.gen(function*() {
      const encoded = Windows1251.encodeUnsafe("Привет")
      assert.deepEqual(encoded, C.encodeUnsafe("Привет", Windows1251.encoding))
      assert.equal(Windows1251.decodeUnsafe(encoded), "Привет")
      assert.equal(yield* Windows1251.decode(yield* Windows1251.encode("Привет")), "Привет")
      const streamed = yield* Stream.make("При", "вет").pipe(
        Windows1251.encodeStream(),
        Windows1251.decodeStream(),
        Stream.runCollect
      )
      assert.equal(streamed.join(""), "Привет")
      const error = yield* Effect.flip(Windows1252.encode("漢", { fatal: true }))
      assert.equal(error._tag, "CharacterEncodingError")
      assert.equal(error.encoding, "windows1252")
      assert.equal(error.operation, "encode")
      assert.throws(() => Utf8.decodeUnsafe(Uint8Array.of(0xe2), { fatal: true }), { _tag: "CharacterEncodingError" })
      const streamError = yield* Effect.flip(
        Stream.make(Uint8Array.of(65), Uint8Array.of(0xff)).pipe(Utf8.decodeStream({ fatal: true }), Stream.runDrain)
      )
      assert.equal(streamError._tag, "CharacterEncodingError")
      assert.equal(streamError.operation, "decode")
      const tailError = yield* Effect.flip(
        Stream.make(Uint8Array.of(0xe2)).pipe(Utf8.decodeStream({ fatal: true }), Stream.runDrain)
      )
      assert.equal(tailError._tag, "CharacterEncodingError")
    }))

  for (const [module, codec] of codecs) {
    const encoding = codec.encoding.name
    it(`matches iconv-lite for ${module} (${encoding}), independent of chunk boundaries`, () => {
      const expected = Iconv.encode(text, encoding)
      assert.deepEqual(C.encodeUnsafe(text, codec.encoding), Uint8Array.from(expected))
      const decoded = C.decodeUnsafe(expected, codec.encoding)
      assert.equal(decoded, Iconv.decode(expected, encoding))
      for (let i = 0; i <= expected.length; i++) {
        const decoder = C.makeDecoderUnsafe(codec.encoding)
        assert.equal(
          decoder.write(expected.subarray(0, i)) + decoder.write(expected.subarray(i)) + decoder.end(),
          decoded
        )
      }
      for (let i = 0; i <= text.length; i++) {
        const encoder = C.makeEncoderUnsafe(codec.encoding)
        assert.deepEqual(
          bytes([encoder.write(text.slice(0, i)), encoder.write(text.slice(i)), encoder.end()]),
          Uint8Array.from(expected)
        )
      }
    })
  }

  it("matches installed iconv-lite GBK extension mappings", () => {
    for (const [name, codec] of [["gbk", Gbk.encoding], ["gb18030", Gb18030.encoding]] as const) {
      for (const lead of [0xa6, 0xfe]) {
        for (let trail = 0x40; trail <= 0xfe; trail++) {
          const input = Buffer.from([lead, trail])
          const expected = Iconv.decode(input, name)
          assert.equal(C.decodeUnsafe(input, codec), expected)
          assert.deepEqual(C.encodeUnsafe(expected, codec), Uint8Array.from(Iconv.encode(expected, name)))
          const decoder = C.makeDecoderUnsafe(codec)
          assert.equal(decoder.write(input.subarray(0, 1)) + decoder.write(input.subarray(1)) + decoder.end(), expected)
        }
      }
    }
  })

  it("matches every byte in single-byte codecs and preserves sliced input", () => {
    const input = Uint8Array.from({ length: 256 }, (_, i) => i)
    for (const [, codec] of codecs) {
      const name = codec.encoding.name
      if (unicode.includes(codec) || multiByte.has(name)) continue
      assert.equal(C.decodeUnsafe(input, codec.encoding), Iconv.decode(Buffer.from(input), name), name)
      const stored = new Uint8Array(262).fill(0xff)
      stored.set(input, 3)
      assert.equal(
        C.decodeUnsafe(stored.subarray(3, 259), codec.encoding),
        C.decodeUnsafe(input, codec.encoding),
        name
      )
      assert.deepEqual(input, Uint8Array.from({ length: 256 }, (_, i) => i))
    }
  })

  it("handles split BOMs, empty writes and explicit BOM preservation", () => {
    for (const { encoding } of unicode) {
      const encoded = C.encodeUnsafe("A", encoding, { addBOM: true })
      const decoder = C.makeDecoderUnsafe(encoding)
      let text = decoder.write(new Uint8Array())
      for (const byte of encoded) text += decoder.write(Uint8Array.of(byte))
      assert.equal(text + decoder.end(), "A")
      assert.equal(C.decodeUnsafe(encoded, encoding, { stripBOM: false }), "\ufeffA")
      assert.equal(
        C.decodeUnsafe(C.encodeUnsafe("", encoding, { addBOM: true }), encoding, { stripBOM: false }),
        "\ufeff"
      )
    }
  })

  it("handles invalid Unicode and multibyte tails in strict and replacement modes", () => {
    for (
      const [encoding, input] of [
        [Utf8.encoding, [0xf0, 0x9f]],
        [Utf16LE.encoding, [0x00, 0xd8]],
        [Utf16BE.encoding, [0xd8, 0x00]],
        [Utf32LE.encoding, [0x00]],
        [ShiftJis.encoding, [0x81]],
        [Gb18030.encoding, [0x81, 0x30, 0x81]]
      ] as const
    ) {
      assert.throws(
        () => C.decodeUnsafe(Uint8Array.from(input), encoding, { fatal: true }),
        C.CharacterEncodingError
      )
      assert.ok(C.decodeUnsafe(Uint8Array.from(input), encoding).includes("\ufffd"))
    }
    assert.throws(() => C.encodeUnsafe("漢", Windows1252.encoding, { fatal: true }), C.CharacterEncodingError)
    assert.throws(() => C.encodeUnsafe("\ud800", Utf8.encoding, { fatal: true }), C.CharacterEncodingError)
    assert.equal(C.decodeUnsafe(C.encodeUnsafe("\ud800", Utf8.encoding), Utf8.encoding), "\ufffd")
  })

  it("holds split surrogate pairs after repeated encoder use", () => {
    for (let i = 0; i < 100; i++) {
      const encoder = C.makeEncoderUnsafe(Cp936.encoding)
      assert.deepEqual(
        bytes([encoder.write("A\ud83d"), encoder.write("\ude00B"), encoder.end()]),
        Uint8Array.of(65, 63, 66)
      )
    }
  })

  it("flushes big5 character sequences and prevents writes after end", () => {
    for (const value of ["\u00ca\u0304", "\u00ca", "\u00ea\u030c"]) {
      const encoder = C.makeEncoderUnsafe(Big5Hkscs.encoding)
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
      const encoded = yield* C.encode("Привет", Windows1251.encoding)
      assert.equal(yield* C.decode(encoded, Windows1251.encoding), "Привет")
      const result = yield* Stream.fromIterable([...encoded].map((byte) => Uint8Array.of(byte))).pipe(
        C.transcodeStream(Windows1251.encoding, Utf8.encoding),
        Stream.runCollect
      )
      assert.equal(C.decodeUnsafe(bytes(result), Utf8.encoding), "Привет")
    }))

  it.effect("allocates fresh stream state for each run and flushes EOF", () =>
    Effect.gen(function*() {
      const stream = Stream.make("\ud83d", "\ude00").pipe(
        C.encodeStream(Utf8.encoding),
        C.decodeStream(Utf8.encoding)
      )
      for (let i = 0; i < 2; i++) assert.equal((yield* Stream.runCollect(stream)).join(""), "😀")
      const result = yield* Stream.make(Uint8Array.of(0xe2)).pipe(
        C.decodeStream(Utf8.encoding),
        Stream.runCollect
      )
      assert.equal(result.join(""), "\ufffd")
      const error = yield* Effect.flip(
        Stream.make(Uint8Array.of(0xe2)).pipe(
          C.decodeStream(Utf8.encoding, { fatal: true }),
          Stream.runDrain
        )
      )
      assert.ok(error instanceof C.CharacterEncodingError)
    }))

  it.effect("preserves upstream failure instead of flushing an incomplete decoder", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(
        Stream.concat(Stream.make(Uint8Array.of(0xe2)), Stream.fail("upstream")).pipe(
          C.decodeStream(Utf8.encoding, { fatal: true }),
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
          C.decodeStream(Utf8.encoding, { fatal: true }),
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
        C.decodeStream(Utf8.encoding, { fatal: true }),
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
      const result = yield* source.pipe(C.decodeStream(Utf8.encoding), Stream.take(1), Stream.runCollect)
      assert.deepEqual(result, ["A"])
      assert.equal(pulls, 1)
    }))
})

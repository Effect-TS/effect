import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import { type Cause, Effect, Exit, FileSystem, Path, Queue, Stream } from "effect"
import * as Zip from "effect/encoding/Zip"
import { runInNewContext } from "node:vm"
import { deflateRawSync } from "node:zlib"

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

// Fixtures were written by Info-ZIP Zip 3.0, 7-Zip and Python; see fixtures/zip/README.md
const fixture = (name: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    return yield* fs.readFile(yield* path.fromFileUrl(new URL(`../fixtures/zip/${name}.zip`, import.meta.url)))
  }).pipe(Effect.provide(NodeServices.layer))

const text = (bytes: Uint8Array) => textDecoder.decode(bytes)

const encode = <E>(entries: ReadonlyArray<Zip.Entry<E>>) =>
  Stream.fromIterable(entries).pipe(
    Stream.pipeThroughChannel(Zip.encode()),
    Stream.mkUint8Array
  )

const entries = (bytes: Uint8Array, chunkSize: number) => {
  const chunks: Array<Uint8Array> = []
  for (let i = 0; i < bytes.length; i += chunkSize) chunks.push(bytes.subarray(i, i + chunkSize))
  return Stream.fromIterable(chunks, { chunkSize: 1 }).pipe(Stream.pipeThroughChannel(Zip.decode()))
}

const decode = (bytes: Uint8Array, chunkSize = 4096) =>
  entries(bytes, chunkSize).pipe(
    Stream.mapEffect((entry) =>
      Effect.map(Stream.mkUint8Array(entry.body), (body) => ({ header: entry.header, body }))
    ),
    Stream.runCollect
  )

const failure = <A>(effect: Effect.Effect<A, unknown>) =>
  Effect.map(Effect.flip(effect), (error) => Zip.isZipError(error) ? error.kind : error)

// Hand-built archives, for fields that the fixture tools do not write

const crc32 = (bytes: Uint8Array) => {
  let c = ~0
  for (const byte of bytes) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return ~c >>> 0
}

const le = (value: number, length: number) => Array.from({ length }, (_, i) => Math.floor(value / 2 ** (8 * i)) % 256)

const concat = (...parts: ReadonlyArray<ArrayLike<number>>) => {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

const endRecord = concat(le(0x06054b50, 4), new Uint8Array(18))

const localHeader = (name: ArrayLike<number>, fields: {
  readonly flags?: number
  readonly method?: number
  readonly time?: number
  readonly date?: number
  readonly crc?: number
  readonly compressedSize?: number
  readonly size?: number
  readonly extra?: ArrayLike<number>
}) =>
  concat(
    le(0x04034b50, 4),
    le(20, 2),
    le(fields.flags ?? 0, 2),
    le(fields.method ?? 0, 2),
    le(fields.time ?? 0, 2),
    le(fields.date ?? 0x21, 2),
    le(fields.crc ?? 0, 4),
    le(fields.compressedSize ?? 0, 4),
    le(fields.size ?? 0, 4),
    le(name.length, 2),
    le(fields.extra?.length ?? 0, 2),
    name,
    fields.extra ?? []
  )

const storedEntry = (name: ArrayLike<number>, content: Uint8Array, fields: Parameters<typeof localHeader>[1] = {}) =>
  concat(
    localHeader(name, { crc: crc32(content), compressedSize: content.length, size: content.length, ...fields }),
    content
  )

// Fields of the central directory written by `encode`
const centralDirectory = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length)
  const end = bytes.length - 22
  let at = view.getUint32(end + 16, true)
  return Array.from({ length: view.getUint16(end + 10, true) }, () => {
    const nameLength = view.getUint16(at + 28, true)
    const record = {
      path: text(bytes.subarray(at + 46, at + 46 + nameLength)),
      host: view.getUint8(at + 5),
      flags: view.getUint16(at + 8, true),
      external: view.getUint32(at + 38, true)
    }
    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true)
    return record
  })
}

describe("Zip", () => {
  describe("encode", () => {
    it.effect("round trips entries in any chunk size", () =>
      Effect.gen(function*() {
        const mtime = new Date("2024-01-02T03:04:06Z")
        const big = Uint8Array.from({ length: 200_000 }, (_, i) => (i * i) % 251)
        const input = [
          Zip.directory("dir", { mtime }),
          Zip.file("dir/a.txt", "hello\n".repeat(100), { mtime }),
          Zip.file("stored.bin", big, { method: "Store" }),
          Zip.file("empty.txt", ""),
          Zip.file("ünïcødé/文件.txt", "unicode"),
          Zip.fileStream("stream.bin", Stream.make(big.subarray(0, 70_000), big.subarray(70_000)), {
            size: big.length
          }),
          Zip.fileStream("stream-stored.bin", Stream.make(big.subarray(0, 5), big.subarray(5)), {
            method: "Store",
            size: big.length
          })
        ]
        const bytes = yield* encode(input)
        for (const chunkSize of [7, bytes.length]) {
          const output = yield* decode(bytes, chunkSize)
          assert.deepStrictEqual(
            output.map(({ header }) => [header.path, header.type, header.method, header.mtime.getTime(), header.size]),
            [
              ["dir/", "Directory", "Store", mtime.getTime(), 0],
              ["dir/a.txt", "File", "Deflate", mtime.getTime(), 600],
              ["stored.bin", "File", "Store", Date.UTC(1980, 0, 1), big.length],
              ["empty.txt", "File", "Deflate", Date.UTC(1980, 0, 1), 0],
              ["ünïcødé/文件.txt", "File", "Deflate", Date.UTC(1980, 0, 1), 7],
              // Deflated sizes that follow the data are not known up front
              ["stream.bin", "File", "Deflate", Date.UTC(1980, 0, 1), undefined],
              ["stream-stored.bin", "File", "Store", Date.UTC(1980, 0, 1), big.length]
            ]
          )
          assert.deepStrictEqual(output.map(({ body }) => body), [
            new Uint8Array(0),
            textEncoder.encode("hello\n".repeat(100)),
            big,
            new Uint8Array(0),
            textEncoder.encode("unicode"),
            big,
            big
          ])
        }
      }))

    it.effect("writes Unix modes, directory attributes and UTF-8 flags", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([
          Zip.directory("dir"),
          Zip.file("dir/run.sh", "", { mode: 0o755 }),
          Zip.fileStream("文件", Stream.make(textEncoder.encode("x")))
        ])
        assert.deepStrictEqual(
          centralDirectory(bytes).map((
            { external, flags, host, path }
          ) => [path, host, flags, external >>> 16, external & 0xffff]),
          [
            // Unix file type and permission bits, then MS-DOS attributes
            ["dir/", 3, 0, 0o40755, 0x10],
            ["dir/run.sh", 3, 0, 0o100755, 0],
            ["文件", 3, 0x0808, 0o100644, 0]
          ]
        )
      }))

    it.effect("keeps times in whole seconds and clamps them to the DOS range", () =>
      Effect.gen(function*() {
        const times = [
          "1970-01-01T00:00:05Z",
          "2001-02-03T04:05:06.789Z",
          // Outside the extended timestamp range, only the DOS time is written
          "2050-06-07T08:09:11Z",
          "2200-01-01T00:00:00Z",
          "1969-12-31T23:59:59Z"
        ]
        const output = yield* decode(yield* encode(times.map((time) => Zip.file(time, "", { mtime: new Date(time) }))))
        assert.deepStrictEqual(output.map(({ header }) => header.mtime.toISOString()), [
          "1970-01-01T00:00:05.000Z",
          "2001-02-03T04:05:06.000Z",
          "2050-06-07T08:09:10.000Z",
          "2107-12-31T23:59:58.000Z",
          "1980-01-01T00:00:00.000Z"
        ])
      }))

    it.effect("accepts dates from another realm", () =>
      Effect.gen(function*() {
        const mtime: Date = runInNewContext(`new Date("2001-02-03T04:05:06Z")`)
        const [entry] = yield* decode(yield* encode([Zip.file("f", "", { mtime })]))
        assert.strictEqual(entry.header.mtime.toISOString(), "2001-02-03T04:05:06.000Z")
      }))

    it.effect("fails on entries that cannot be written", () =>
      Effect.gen(function*() {
        const directory = Zip.directory("d")
        const invalid: Array<Zip.Entry> = [
          Zip.directory(""),
          Zip.file("/etc/passwd", "x"),
          // libarchive and Windows tools read backslashes as separators, and drive letters as roots
          Zip.file("..\\x", "x"),
          Zip.file("C:x", "x"),
          Zip.file("a\0b", "x"),
          Zip.file("dir/", "x"),
          { ...directory, header: { ...directory.header, path: "d" } },
          Zip.fileStream("f", Stream.empty, { size: -1 }),
          Zip.fileStream("f", Stream.make(textEncoder.encode("x")), { method: "Store" }),
          Zip.file("f", "x", { mode: 0o10000 }),
          Zip.file("f", "x", { mtime: new Date(Number.NaN) })
        ]
        for (const entry of invalid) assert.strictEqual(yield* failure(encode([entry])), "InvalidHeader")
      }))

    it.effect("fails on body errors and bodies that do not match their size", () =>
      Effect.gen(function*() {
        const body = Stream.make(textEncoder.encode("abc"))
        for (const method of ["Store", "Deflate"] as const) {
          assert.strictEqual(yield* failure(encode([Zip.fileStream("f", body, { method, size: 5 })])), "SizeMismatch")
          assert.strictEqual(yield* failure(encode([Zip.fileStream("f", body, { method, size: 2 })])), "SizeMismatch")
          const failing = Stream.concat(body, Stream.fail("Boom"))
          assert.strictEqual(yield* failure(encode([Zip.fileStream("f", failing, { method, size: 4 })])), "Boom")
        }
        const file = Zip.file("f", "abc")
        assert.strictEqual(yield* failure(encode([{ ...file, header: { ...file.header, size: 5 } }])), "SizeMismatch")
        const directory = { ...Zip.directory("d"), body }
        assert.strictEqual(yield* failure(encode([directory])), "SizeMismatch")
        const inMemory = { ...Zip.file("f", "abc"), header: { ...Zip.directory("d").header, size: undefined } }
        assert.strictEqual(yield* failure(encode([inMemory])), "SizeMismatch")
      }))

    it.effect("gathers small output and passes large body chunks through", () =>
      Effect.gen(function*() {
        const large = new Uint8Array(100_000).fill(1)
        const output = yield* Stream.fromIterable([
          ...Array.from({ length: 2000 }, (_, i) => Zip.file(`${i}`, "x", { method: "Store" })),
          Zip.fileStream("large", Stream.make(large), { method: "Store", size: large.length })
        ]).pipe(Stream.pipeThroughChannel(Zip.encode()), Stream.runCollect)
        assert.isTrue(output.includes(large))
        assert.isBelow(output.length, 10)
      }))

    it.effect("writes ZIP64 end records for 65535 entries or more", () =>
      Effect.gen(function*() {
        const count = 65_535
        const bytes = yield* encode(Array.from({ length: count }, (_, i) => Zip.file(`${i}`, "", { method: "Store" })))
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length)
        const end = bytes.length - 22
        assert.strictEqual(view.getUint16(end + 10, true), 0xffff)
        const end64 = end - 20 - 56
        assert.strictEqual(view.getUint32(end64, true), 0x06064b50)
        assert.strictEqual(view.getUint32(end64 + 32, true), count)
        assert.strictEqual(view.getUint32(end - 20 + 8, true), end64)
      }))
  })

  describe("decode", () => {
    const expected = (methods: Record<string, Zip.Method>) =>
      [
        ["tree/", "Directory", ""],
        ["tree/dir/", "Directory", ""],
        ["tree/dir/hello.txt", "File", "Hello, zip!\n".repeat(50)],
        ["tree/empty.txt", "File", ""],
        ["tree/ünïcødé.txt", "File", "unicode\n"],
        ["tree/script.sh", "File", "#!/bin/sh\necho hi\n"]
      ].map(([path, type, body]) => [path, type, methods[path] ?? "Store", "2024-01-02T03:04:06.000Z", body])
    const deflated = {
      "tree/dir/hello.txt": "Deflate",
      "tree/ünïcødé.txt": "Deflate",
      "tree/script.sh": "Deflate"
    } as const
    const fixtures: Record<string, ReadonlyArray<ReadonlyArray<string>>> = {
      infozip: expected({ "tree/dir/hello.txt": "Deflate" }),
      // Info-ZIP streams empty files as stored entries without a size
      "infozip-stream": expected(deflated).filter(([path]) => path !== "tree/empty.txt"),
      "7zip": expected({ "tree/dir/hello.txt": "Deflate" }).sort((a, b) => a[0] < b[0] ? -1 : 1),
      "python-zip64": expected(deflated).filter(([path]) => path === "tree/dir/hello.txt" || path === "tree/script.sh")
    }

    for (const [name, files] of Object.entries(fixtures)) {
      it.effect(`reads ${name} archives in any chunk size`, () =>
        Effect.gen(function*() {
          const bytes = yield* fixture(name)
          for (const chunkSize of [1, bytes.length]) {
            const output = yield* decode(bytes, chunkSize)
            assert.deepStrictEqual(
              output.map(({ body, header }) => [
                header.path,
                header.type,
                header.method,
                header.mtime.toISOString(),
                text(body)
              ]),
              files
            )
          }
        }))
    }

    it.effect("reads ZIP64 sizes and data descriptors without a signature", () =>
      Effect.gen(function*() {
        const content = textEncoder.encode("descriptor ".repeat(40))
        const data = deflateRawSync(content)
        const name = textEncoder.encode("f")
        const zip64 = concat(le(0x0001, 2), le(16, 2), le(content.length, 8), le(data.length, 8))
        const variants = [
          [localHeader(name, {
            method: 8,
            crc: crc32(content),
            compressedSize: 0xffffffff,
            size: 0xffffffff,
            extra: zip64
          })],
          [
            localHeader(name, { flags: 8, method: 8 }),
            le(crc32(content), 4),
            le(data.length, 4),
            le(content.length, 4)
          ],
          [
            localHeader(name, { flags: 8, method: 8 }),
            le(0x08074b50, 4),
            le(crc32(content), 4),
            le(data.length, 8),
            le(content.length, 8)
          ]
        ]
        for (const [header, ...descriptor] of variants) {
          const output = yield* decode(concat(header, data, ...descriptor, endRecord), 5)
          assert.deepStrictEqual(output.map(({ body }) => text(body)), [text(content)])
        }
        // For an empty entry, both layouts of a ZIP64 descriptor match the data
        const empty = deflateRawSync(new Uint8Array(0))
        const ambiguous = concat(
          localHeader(name, { flags: 8, method: 8 }),
          empty,
          le(0x08074b50, 4),
          le(0, 4),
          le(empty.length, 8),
          le(0, 8),
          storedEntry(textEncoder.encode("g"), textEncoder.encode("next")),
          endRecord
        )
        assert.deepStrictEqual((yield* decode(ambiguous)).map(({ body, header }) => [header.path, text(body)]), [
          ["f", ""],
          ["g", "next"]
        ])
      }))

    it.effect("fails on stored entries whose sizes follow their data", () =>
      Effect.gen(function*() {
        // Searching for the descriptor would let this content forge an entry
        const forged = concat(
          textEncoder.encode("data"),
          le(0x08074b50, 4),
          le(crc32(textEncoder.encode("data")), 4),
          le(4, 4),
          le(4, 4),
          localHeader(textEncoder.encode("../evil.sh"), {})
        )
        const archive = concat(
          storedEntry(textEncoder.encode("ok"), textEncoder.encode("ok")),
          localHeader(textEncoder.encode("upload.bin"), { flags: 8 }),
          forged,
          le(0x08074b50, 4),
          le(crc32(forged), 4),
          le(forged.length, 4),
          le(forged.length, 4),
          endRecord
        )
        const output = yield* entries(archive, 4096).pipe(
          Stream.mapEffect((entry) => Effect.map(Stream.mkUint8Array(entry.body), () => entry.header.path)),
          Stream.catch((error) => Stream.succeed(Zip.isZipError(error) ? error.kind : "defect")),
          Stream.runCollect
        )
        assert.deepStrictEqual(output, ["ok", "Unsupported"])
      }))

    it.effect("decodes names as UTF-8 or CP437 and applies Unicode path fields", () =>
      Effect.gen(function*() {
        const unicodePath = (name: string, crc: number) =>
          concat(le(0x7075, 2), le(5 + textEncoder.encode(name).length, 2), [1], le(crc, 4), textEncoder.encode(name))
        const empty = new Uint8Array(0)
        // Other tools keep a leading byte order mark, which makes these paths relative
        const bom = textEncoder.encode("﻿/b")
        const archive = concat(
          storedEntry([0x81, 0x41], empty),
          storedEntry(textEncoder.encode("é"), empty),
          storedEntry(textEncoder.encode("x"), empty, { extra: unicodePath("ÿ.txt", crc32(textEncoder.encode("x"))) }),
          storedEntry(textEncoder.encode("y"), empty, { extra: unicodePath("ignored", 0) }),
          // As in Info-ZIP and 7-Zip, only the first field applies, and only without the UTF-8 flag
          storedEntry(textEncoder.encode("z"), empty, {
            extra: concat(unicodePath("ignored", 0), unicodePath("ignored", crc32(textEncoder.encode("z"))))
          }),
          storedEntry(textEncoder.encode("w"), empty, {
            flags: 0x800,
            extra: unicodePath("ignored", crc32(textEncoder.encode("w")))
          }),
          storedEntry(bom, empty),
          storedEntry(bom, empty, { flags: 0x800 }),
          endRecord
        )
        const output = yield* decode(archive)
        assert.deepStrictEqual(output.map(({ header }) => header.path), [
          "üA",
          "é",
          "ÿ.txt",
          "y",
          "z",
          "w",
          "﻿/b",
          "﻿/b"
        ])
      }))

    it.effect("reads extended timestamps before 1970 and after 2038", () =>
      Effect.gen(function*() {
        const timestamp = (seconds: number) => concat(le(0x5455, 2), le(5, 2), [1], le(seconds, 4))
        const archive = concat(
          // Info-ZIP writes times before 1970 as negative numbers; the DOS date tells them apart
          storedEntry(textEncoder.encode("1969"), new Uint8Array(0), { extra: timestamp(2 ** 32 - 86_400) }),
          storedEntry(textEncoder.encode("2038"), new Uint8Array(0), {
            date: ((2038 - 1980) << 9) | (1 << 5) | 20,
            extra: timestamp(2 ** 31 + 86_400)
          }),
          endRecord
        )
        const output = yield* decode(archive)
        assert.deepStrictEqual(output.map(({ header }) => header.mtime.toISOString()), [
          "1969-12-31T00:00:00.000Z",
          "2038-01-20T03:14:08.000Z"
        ])
      }))

    it.effect("inflates stored blocks and Huffman codes longer than the lookup table", () =>
      Effect.gen(function*() {
        // Noise, which deflate stores, then copies from it at distances that are
        // rarer the nearer they are, so that some codes are longer than the table
        let x = 1
        const random = () => {
          x ^= x << 13
          x ^= x >>> 17
          x ^= x << 5
          return x >>> 0
        }
        const bytes = Array.from({ length: 32_768 }, () => random() & 0xff)
        for (let i = 0; i < 4000; i++) {
          const bits = 14 - Math.min(Math.clz32(random()), 12)
          const distance = 2 ** bits + random() % 2 ** bits
          for (let j = 0; j < 8; j++) bytes.push(bytes[bytes.length - distance])
          bytes.push(random() & 0xff)
        }
        const content = Uint8Array.from(bytes)
        const data = deflateRawSync(content)
        const archive = concat(
          localHeader(textEncoder.encode("f"), {
            method: 8,
            crc: crc32(content),
            compressedSize: data.length,
            size: content.length
          }),
          data,
          endRecord
        )
        for (const chunkSize of [1, archive.length]) {
          assert.deepStrictEqual((yield* decode(archive, chunkSize)).map(({ body }) => body), [content])
        }
      }))

    it.effect("inflates output that ends at or crosses the output buffer boundary", () =>
      Effect.gen(function*() {
        let x = 7
        const random = () => {
          x ^= x << 13
          x ^= x >>> 17
          x ^= x << 5
          return x & 0xff
        }
        // Output is handed out in 64 KiB chunks. Noise is stored, noise in 64
        // symbols is mostly literals, and repeats of a block nearly as long as
        // the window copy across chunks.
        const block = Uint8Array.from({ length: 32_500 }, random)
        const contents = [65_535, 65_536, 65_537, 131_073].flatMap((size) => [
          Uint8Array.from({ length: size }, random),
          Uint8Array.from({ length: size }, () => random() & 63),
          Uint8Array.from({ length: size }, (_, i) => block[i % block.length])
        ])
        // A match that copies from before a chunk that stored blocks filled
        const noise = Uint8Array.from({ length: 90_000 }, random)
        contents.push(concat(noise, noise.subarray(60_000, 70_000)))
        const archive = concat(
          ...contents.map((content) => {
            const data = deflateRawSync(content)
            return concat(
              localHeader(textEncoder.encode("f"), {
                method: 8,
                crc: crc32(content),
                compressedSize: data.length,
                size: content.length
              }),
              data
            )
          }),
          endRecord
        )
        for (const chunkSize of [7, archive.length]) {
          assert.deepStrictEqual((yield* decode(archive, chunkSize)).map(({ body }) => body), contents)
        }
      }))

    it.effect("does not resolve matches against the output of earlier entries", () =>
      Effect.gen(function*() {
        // "b" refers to a preset dictionary holding the end of "a", so that a
        // decoder that kept the output of "a" would reproduce it
        const a = Uint8Array.from({ length: 65_536 }, (_, i) => (i * i) % 251)
        const b = a.subarray(-1000)
        const entry = (name: string, content: Uint8Array, data: Uint8Array) =>
          concat(
            localHeader(textEncoder.encode(name), {
              method: 8,
              crc: crc32(content),
              compressedSize: data.length,
              size: content.length
            }),
            data
          )
        const archive = concat(
          entry("a", a, deflateRawSync(a)),
          entry("b", b, deflateRawSync(b, { dictionary: a.subarray(-32_768) })),
          endRecord
        )
        for (const chunkSize of [7, archive.length]) {
          const output = yield* entries(archive, chunkSize).pipe(
            Stream.mapEffect((entry) => Effect.map(Stream.mkUint8Array(entry.body), (body) => body.length)),
            Stream.catch((error) => Stream.succeed(Zip.isZipError(error) ? error.kind : "defect")),
            Stream.runCollect
          )
          assert.deepStrictEqual(output, [a.length, "InvalidData"])
        }
      }))

    it.effect("re-encodes deflated directories as stored", () =>
      Effect.gen(function*() {
        // Java's ZipOutputStream deflates directories
        const empty = deflateRawSync(new Uint8Array(0))
        const archive = concat(
          localHeader(textEncoder.encode("d/"), { flags: 8, method: 8 }),
          empty,
          le(0x08074b50, 4),
          le(0, 4),
          le(empty.length, 4),
          le(0, 4),
          endRecord
        )
        const reencoded = yield* entries(archive, 4096).pipe(
          Stream.pipeThroughChannel(Zip.encode()),
          Stream.mkUint8Array
        )
        const output = yield* decode(reencoded)
        assert.deepStrictEqual(output.map(({ header }) => [header.path, header.type, header.method]), [
          ["d/", "Directory", "Store"]
        ])
      }))

    it.effect("continues after a checksum error and stops after corrupt data", () =>
      Effect.gen(function*() {
        const read = (bytes: Uint8Array) =>
          entries(bytes, 4096).pipe(
            Stream.mapEffect((entry) =>
              Effect.match(Stream.mkUint8Array(entry.body), {
                onFailure: (error) => Zip.isZipError(error) ? error.kind : "defect",
                onSuccess: text
              })
            ),
            Stream.runCollect
          )
        const bytes = yield* encode([
          Zip.fileStream("a", Stream.make(textEncoder.encode("aaaa")), { method: "Store", size: 4 }),
          Zip.file("b", "bbbb")
        ])
        // The data of "a" follows its 30-byte header, its name and a 9-byte timestamp field
        bytes[30 + 1 + 9] ^= 1
        assert.deepStrictEqual(yield* read(bytes), ["Checksum", "bbbb"])
        const corrupt = concat(
          localHeader(textEncoder.encode("a"), { method: 8, compressedSize: 1, size: 1 }),
          [0xff],
          storedEntry(textEncoder.encode("b"), textEncoder.encode("b")),
          endRecord
        )
        assert.strictEqual(yield* failure(read(corrupt)), "InvalidData")
      }))

    it.effect("stops a body that grows past its size and the archive with it", () =>
      Effect.gen(function*() {
        const content = new Uint8Array(1_000_000)
        const data = deflateRawSync(content)
        const archive = concat(
          localHeader(textEncoder.encode("a"), {
            method: 8,
            crc: crc32(content),
            compressedSize: data.length,
            size: 10
          }),
          data,
          storedEntry(textEncoder.encode("b"), textEncoder.encode("b")),
          endRecord
        )
        let read = 0
        const output = entries(archive, 4096).pipe(
          Stream.mapEffect((entry) =>
            Effect.match(Stream.runForEach(entry.body, (chunk) => Effect.sync(() => read += chunk.length)), {
              onFailure: (error) => Zip.isZipError(error) ? error.kind : "defect",
              onSuccess: () => "read"
            })
          ),
          Stream.runCollect
        )
        assert.strictEqual(yield* failure(output), "SizeMismatch")
        assert.isAtMost(read, 10)
      }))

    it.effect("emits body bytes before the rest of the archive arrives", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Zip.file("f", "z".repeat(2000), { method: "Store" })])
        // Local header: 30 bytes, the name and an extended timestamp field
        const header = 30 + 1 + 9
        const input = yield* Queue.unbounded<Uint8Array, Cause.Done>()
        yield* Queue.offer(input, bytes.subarray(0, header + 100))
        const pullEntry = yield* Stream.toPull(Stream.fromQueue(input).pipe(Stream.pipeThroughChannel(Zip.decode())))
        const [entry] = yield* pullEntry
        const pullBody = yield* Stream.toPull(entry.body)
        assert.strictEqual(text((yield* pullBody)[0]), "z".repeat(100))

        yield* Queue.offer(input, bytes.subarray(header + 100))
        yield* Queue.end(input)
        let rest = 0
        while (true) {
          const exit = yield* Effect.exit(pullBody)
          if (Exit.isFailure(exit)) break
          for (const chunk of exit.value) rest += chunk.length
        }
        assert.strictEqual(rest, 1900)
      }))

    it.effect("reads archives that arrive as many small chunks in one pull", () =>
      Effect.gen(function*() {
        const contents = Array.from({ length: 30 }, (_, i) => "abc".repeat(i * 20) + i)
        const last = textEncoder.encode(contents[29])
        const bytes = yield* encode([
          ...contents.map((content, i) => Zip.file(`${i}`, content)),
          Zip.fileStream("s", Stream.make(last), { method: "Store", size: last.length })
        ])
        for (const chunkSize of [1, 7]) {
          const chunks: Array<Uint8Array> = []
          for (let i = 0; i < bytes.length; i += chunkSize) chunks.push(bytes.subarray(i, i + chunkSize))
          const output = yield* Stream.fromArray(chunks).pipe(
            Stream.pipeThroughChannel(Zip.decode()),
            Stream.mapEffect((entry) => Effect.map(Stream.mkUint8Array(entry.body), text)),
            Stream.runCollect
          )
          assert.deepStrictEqual(output, [...contents, contents[29]])
        }
      }))

    it.effect("skips unread bodies when moving to the next entry", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([
          Zip.file("a", "a".repeat(100_000)),
          Zip.fileStream("b", Stream.make(textEncoder.encode("b".repeat(700))), { method: "Store", size: 700 }),
          Zip.file("c", "c")
        ])
        for (const chunkSize of [1, bytes.length]) {
          const output = yield* entries(bytes, chunkSize).pipe(
            Stream.mapEffect((entry) => Effect.map(Stream.mkUint8Array(Stream.take(entry.body, 1)), (body) => body[0])),
            Stream.runCollect
          )
          assert.deepStrictEqual(output, ["a", "b", "c"].map((c) => c.charCodeAt(0)))
        }
      }))

    it.effect("fails body reads after the next entry is pulled or the entries end", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Zip.file("a", "a"), Zip.file("b", "b")])
        const pull = yield* Stream.toPull(entries(bytes, 512))
        const [a] = yield* pull
        yield* pull
        assert.strictEqual(yield* failure(Stream.runDrain(a.body)), "BodyConsumed")
        const [first] = yield* Stream.runCollect(Stream.take(entries(bytes, 512), 1))
        assert.strictEqual(yield* failure(Stream.runDrain(first.body)), "BodyConsumed")
      }))

    it.effect("reads empty archives and ignores input after the central directory", () =>
      Effect.gen(function*() {
        assert.deepStrictEqual(yield* decode(endRecord), [])
        const bytes = concat(yield* encode([Zip.file("a", "a")]), textEncoder.encode("trailing comment"))
        assert.deepStrictEqual((yield* decode(bytes)).map(({ body }) => text(body)), ["a"])
      }))

    it.effect("fails on truncated or corrupt archives", () =>
      Effect.gen(function*() {
        const streamed = yield* encode([
          Zip.fileStream("a", Stream.make(textEncoder.encode("a".repeat(300)))),
          Zip.fileStream("b", Stream.make(textEncoder.encode("b")), { method: "Store", size: 1 })
        ])
        const centralOffset = new DataView(streamed.buffer).getUint32(streamed.length - 6, true)
        for (let length = 0; length < centralOffset + 4; length++) {
          assert.strictEqual(yield* failure(decode(streamed.subarray(0, length), 16)), "Truncated")
        }
        const bytes = yield* encode([Zip.file("a", "a".repeat(600), { method: "Store" })])
        assert.strictEqual(yield* failure(decode(concat([0], bytes))), "InvalidHeader")
        const corrupt = bytes.slice()
        corrupt[100] ^= 1
        assert.strictEqual(yield* failure(decode(corrupt)), "Checksum")

        const content = textEncoder.encode("deflated")
        const data = deflateRawSync(content)
        const deflated = (fields: Parameters<typeof localHeader>[1]) =>
          concat(
            localHeader(textEncoder.encode("f"), {
              method: 8,
              crc: crc32(content),
              compressedSize: data.length,
              size: content.length,
              ...fields
            }),
            data,
            endRecord
          )
        assert.strictEqual(yield* failure(decode(deflated({ size: content.length + 1 }))), "SizeMismatch")
        assert.strictEqual(yield* failure(decode(deflated({ flags: 1 }))), "Unsupported")
        assert.strictEqual(yield* failure(decode(deflated({ method: 12 }))), "Unsupported")
        // Stored entries need equal sizes
        assert.strictEqual(yield* failure(decode(deflated({ method: 0 }))), "InvalidHeader")
        // Other tools end names at a NUL character, or reject them
        const nul = concat(storedEntry(textEncoder.encode("a.txt\0../b"), new Uint8Array(0)), endRecord)
        assert.strictEqual(yield* failure(decode(nul)), "InvalidHeader")
      }))
  })
})

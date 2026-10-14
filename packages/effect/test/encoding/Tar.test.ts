import { assert, describe, it } from "@effect/vitest"
import type { Cause } from "effect"
import { Effect, Exit, Queue, Stream } from "effect"
import * as Tar from "effect/encoding/Tar"
import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

// Fixtures were written by GNU tar 1.35; see fixtures/tar/README.md
const fixture = (name: string): Uint8Array =>
  gunzipSync(readFileSync(new URL(`../fixtures/tar/${name}.tar.gz`, import.meta.url)))

const concat = (chunks: Iterable<Uint8Array>): Uint8Array => {
  const list = Array.from(chunks)
  const out = new Uint8Array(list.reduce((n, chunk) => n + chunk.length, 0))
  let offset = 0
  for (const chunk of list) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

const text = (bytes: Uint8Array) => textDecoder.decode(bytes)

const encode = <E>(entries: ReadonlyArray<Tar.Entry<E>>) =>
  Stream.fromIterable(entries).pipe(
    Stream.pipeThroughChannel(Tar.encode()),
    Stream.runCollect,
    Effect.map(concat)
  )

const entries = (bytes: Uint8Array, chunkSize: number) => {
  const chunks: Array<Uint8Array> = []
  for (let i = 0; i < bytes.length; i += chunkSize) chunks.push(bytes.subarray(i, i + chunkSize))
  return Stream.fromIterable(chunks).pipe(
    Stream.rechunk(1),
    Stream.pipeThroughChannel(Tar.decode())
  )
}

const decode = (bytes: Uint8Array, chunkSize = 4096) =>
  entries(bytes, chunkSize).pipe(
    Stream.mapEffect((entry) =>
      Effect.map(Stream.runCollect(entry.body), (chunks) => ({ header: entry.header, body: concat(chunks) }))
    ),
    Stream.runCollect
  )

const failure = <A>(effect: Effect.Effect<A, unknown>) =>
  Effect.map(Effect.flip(effect), (error) => Tar.isTarError(error) ? error.kind : error)

describe("Tar", () => {
  describe("encode", () => {
    it.effect("round trips entries with reproducible USTAR defaults", () =>
      Effect.gen(function*() {
        const input: Array<Tar.Entry> = [
          Tar.directory("dir"),
          Tar.file("dir/a.txt", "hello\n"),
          Tar.fileStream("dir/b.bin", 3, Stream.make(new Uint8Array([0, 1]), new Uint8Array([255]))),
          Tar.symlink("dir/link", "a.txt", { uid: 1000, uname: "user", mtime: new Date("2024-01-02T03:04:05Z") }),
          Tar.hardlink("dir/hard", "dir/a.txt"),
          {
            header: { ...Tar.file("dir/null", "").header, type: "CharDevice", typeflag: "3", devMajor: 1, devMinor: 3 },
            body: Stream.empty
          }
        ]
        const bytes = yield* encode(input)
        assert.deepStrictEqual(bytes, yield* encode(input))
        assert.strictEqual(text(bytes.subarray(257, 265)), "ustar\x0000")

        const output = yield* decode(bytes)
        assert.deepStrictEqual(output.map((entry) => entry.header), input.map((entry) => entry.header))
        assert.deepStrictEqual(output[1].header, {
          path: "dir/a.txt",
          type: "File",
          typeflag: "0",
          size: 6,
          mode: 0o644,
          uid: 0,
          gid: 0,
          uname: "",
          gname: "",
          mtime: new Date(0),
          pax: {}
        })
        assert.strictEqual(output[0].header.mode, 0o755)
        assert.strictEqual(output[3].header.mode, 0o777)
        assert.strictEqual(text(output[1].body), "hello\n")
        assert.deepStrictEqual(Array.from(output[2].body), [0, 1, 255])

        input[1].header.mtime.setTime(1000)
        assert.deepStrictEqual([input[0].header.mtime, Tar.file("f", "").header.mtime], [new Date(0), new Date(0)])
      }))

    it.effect("splits long paths into the USTAR prefix and adds PAX only for fields that don't fit", () =>
      Effect.gen(function*() {
        const input = [
          Tar.file(`${"a".repeat(120)}/${"b".repeat(90)}.txt`, "x"),
          Tar.file(`${"c".repeat(300)}.txt`, "y"),
          Tar.file("ids", "", { uid: 3_000_000, gname: "grüppe", pax: { "SCHILY.xattr.user.k": "v" } })
        ]
        const bytes = yield* encode(input)
        // Typeflag of the first header, and of the header after the first entry's data block
        assert.strictEqual(String.fromCharCode(bytes[156]), "0")
        assert.strictEqual(String.fromCharCode(bytes[1024 + 156]), "x")

        const output = yield* decode(bytes)
        assert.deepStrictEqual(output.map((entry) => entry.header), input.map((entry) => entry.header))
        assert.deepStrictEqual(output.map((entry) => text(entry.body)), ["x", "y", ""])
      }))

    it.effect("fails on entries that cannot be written", () =>
      Effect.gen(function*() {
        const short = Tar.fileStream("f", 5, Stream.make(textEncoder.encode("abc")))
        assert.strictEqual(yield* failure(encode([short])), "SizeMismatch")
        assert.strictEqual(yield* failure(encode([Tar.file("", "")])), "InvalidHeader")
        assert.strictEqual(yield* failure(encode([Tar.file("f", "abc", { pax: { size: "10" } })])), "InvalidHeader")
        assert.strictEqual(
          yield* failure(encode([Tar.file("f", "abc", { pax: { "GNU.sparse.size": "10" } })])),
          "InvalidHeader"
        )
      }))
  })

  describe("decode", () => {
    const tree = [
      ["tree/", "Directory", 3_000_000, ""],
      [`tree/${"a".repeat(80)}/`, "Directory", 3_000_000, ""],
      [`tree/${"a".repeat(80)}/${"b".repeat(60)}/`, "Directory", 3_000_000, ""],
      [`tree/${"a".repeat(80)}/${"b".repeat(60)}/${"c".repeat(90)}.txt`, "File", 3_000_000, "split\n"],
      [`tree/${"d".repeat(120)}/`, "Directory", 3_000_000, ""],
      [`tree/${"d".repeat(120)}/${"e".repeat(120)}/`, "Directory", 3_000_000, ""],
      [`tree/${"d".repeat(120)}/${"e".repeat(120)}/${"f".repeat(30)}.txt`, "File", 3_000_000, "long\n"],
      ["tree/dir/", "Directory", 3_000_000, ""],
      ["tree/dir/hello.txt", "File", 3_000_000, "hello\n"],
      ["tree/fifo", "Fifo", 3_000_000, ""],
      ["tree/hardlink.txt", "Hardlink", 3_000_000, "tree/dir/hello.txt"],
      ["tree/héllo-wörld-日本.txt", "File", 3_000_000, "unicode\n"],
      ["tree/longlink", "Symlink", 3_000_000, `${"x".repeat(150)}/target`],
      ["tree/shortlink", "Symlink", 3_000_000, "dir/hello.txt"]
    ]
    const fixtures = {
      gnu: tree,
      pax: tree,
      ustar: [
        ["small/", "Directory", 0, ""],
        [`small/${"a".repeat(80)}/`, "Directory", 0, ""],
        [`small/${"a".repeat(80)}/${"b".repeat(60)}/`, "Directory", 0, ""],
        [`small/${"a".repeat(80)}/${"b".repeat(60)}/${"c".repeat(90)}.txt`, "File", 0, "split\n"],
        ["small/dir/", "Directory", 0, ""],
        ["small/dir/hello.txt", "File", 0, "hello\n"],
        ["small/dir/link", "Symlink", 0, "hello.txt"]
      ],
      v7: [
        ["small/dir/", "Directory", 0, ""],
        ["small/dir/hello.txt", "File", 0, "hello\n"],
        ["small/dir/link", "Symlink", 0, "hello.txt"]
      ]
    }

    for (const [name, expected] of Object.entries(fixtures)) {
      it.effect(`reads GNU tar --format=${name} archives in any chunk size`, () =>
        Effect.gen(function*() {
          const bytes = fixture(name)
          for (const chunkSize of [1, bytes.length]) {
            const output = yield* decode(bytes, chunkSize)
            assert.deepStrictEqual(
              output.map(({ body, header }) => [header.path, header.type, header.uid, header.linkTarget ?? text(body)]),
              expected
            )
          }
        }))
    }

    it.effect("fails on GNU sparse files", () =>
      Effect.gen(function*() {
        assert.strictEqual(yield* failure(decode(fixture("sparse-gnu"))), "Unsupported")
        assert.strictEqual(yield* failure(decode(fixture("sparse-pax"))), "Unsupported")
      }))

    it.effect("fails on corrupt or truncated archives", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("a", "a".repeat(600))])
        assert.strictEqual(yield* failure(decode(bytes.subarray(0, 512 + 300))), "Truncated")
        bytes[0] = "b".charCodeAt(0)
        assert.strictEqual(yield* failure(decode(bytes)), "InvalidHeader")
      }))

    it.effect("reads an empty PAX header that ends an input chunk", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("f", "", { pax: { comment: "x" } })])
        // Drop the PAX data block and set the PAX header size to 0, then fix its checksum
        const archive = concat([bytes.subarray(0, 512), bytes.subarray(1024)])
        archive.set(textEncoder.encode("00000000000"), 124)
        archive.fill(0x20, 148, 156)
        const checksum = archive.subarray(0, 512).reduce((sum, byte) => sum + byte, 0)
        archive.set(textEncoder.encode(`${checksum.toString(8).padStart(6, "0")}\0`), 148)
        const output = yield* decode(archive, 512)
        assert.deepStrictEqual(output.map((entry) => entry.header.path), ["f"])
      }))

    it.effect("skips unread bodies when moving to the next entry", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("a", "a".repeat(1000)), Tar.file("b", "b".repeat(700))])
        for (const chunkSize of [1, 512, bytes.length]) {
          const output = yield* entries(bytes, chunkSize).pipe(
            Stream.mapEffect((entry) =>
              Effect.map(Stream.runCollect(Stream.take(entry.body, 1)), (chunks) => concat(chunks)[0])
            ),
            Stream.runCollect
          )
          assert.deepStrictEqual(output, ["a".charCodeAt(0), "b".charCodeAt(0)])
        }
      }))

    it.effect("emits body bytes before the rest of the archive arrives", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("f", "z".repeat(2000))])
        const input = yield* Queue.unbounded<Uint8Array, Cause.Done>()
        yield* Queue.offer(input, bytes.subarray(0, 512 + 100))
        const pullEntry = yield* Stream.toPull(Stream.fromQueue(input).pipe(Stream.pipeThroughChannel(Tar.decode())))
        const [entry] = yield* pullEntry
        const pullBody = yield* Stream.toPull(entry.body)
        assert.strictEqual(text((yield* pullBody)[0]), "z".repeat(100))

        yield* Queue.offer(input, bytes.subarray(512 + 100))
        yield* Queue.end(input)
        let rest = 0
        while (true) {
          const exit = yield* Effect.exit(pullBody)
          if (Exit.isFailure(exit)) break
          for (const chunk of exit.value) rest += chunk.length
        }
        assert.strictEqual(rest, 1900)
      }))
  })
})

import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import { Array as Arr, Cause, Channel, Effect, Exit, Fiber, FileSystem, Option, Path, Queue, Stream } from "effect"
import * as Tar from "effect/encoding/Tar"
import { gunzipSync } from "node:zlib"

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

// Fixtures were written by GNU tar 1.35; see fixtures/tar/README.md
const fixture = (name: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const file = yield* path.fromFileUrl(new URL(`../fixtures/tar/${name}.tar.gz`, import.meta.url))
    return gunzipSync(yield* fs.readFile(file))
  }).pipe(Effect.provide(NodeServices.layer))

const text = (bytes: Uint8Array) => textDecoder.decode(bytes)

const encode = <E>(entries: ReadonlyArray<Tar.Entry<E>>) =>
  Stream.fromIterable(entries).pipe(
    Stream.pipeThroughChannel(Tar.encode()),
    Stream.mkUint8Array
  )

const entries = (bytes: Uint8Array, chunkSize: number) => {
  const chunks: Array<Uint8Array> = []
  for (let i = 0; i < bytes.length; i += chunkSize) chunks.push(bytes.subarray(i, i + chunkSize))
  return Stream.fromIterable(chunks, { chunkSize: 1 }).pipe(Stream.pipeThroughChannel(Tar.decode()))
}

const decode = (bytes: Uint8Array, chunkSize = 4096) =>
  entries(bytes, chunkSize).pipe(
    Stream.mapEffect((entry) =>
      Effect.map(Stream.mkUint8Array(entry.body), (body) => ({ header: entry.header, body }))
    ),
    Stream.runCollect
  )

// Overwrites bytes of the first header block and fixes its checksum
const patchHeader = (archive: Uint8Array, offset: number, bytes: string | ArrayLike<number>) => {
  archive.set(typeof bytes === "string" ? textEncoder.encode(bytes) : bytes, offset)
  archive.fill(0x20, 148, 156)
  const checksum = archive.subarray(0, 512).reduce((sum, byte) => sum + byte, 0)
  archive.set(textEncoder.encode(`${checksum.toString(8).padStart(6, "0")}\0`), 148)
}

const failure = <A>(effect: Effect.Effect<A, unknown>) =>
  Effect.map(Effect.flip(effect), (error) => Tar.isTarError(error) ? error.kind : error)

// An archive of the empty file "f" whose PAX header holds `records`
const withPax = (records: string) =>
  Effect.gen(function*() {
    const bytes = yield* encode([Tar.file("f", "", { pax: { comment: "x" } })])
    bytes.fill(0, 512, 1024)
    bytes.set(textEncoder.encode(records), 512)
    patchHeader(bytes, 124, records.length.toString(8).padStart(11, "0"))
    return bytes
  })

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
          Tar.symlink("dir/empty", ""),
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

    it.effect("round trips bodies streamed in small and large chunks", () =>
      Effect.gen(function*() {
        const large = new Uint8Array(40_000).map((_, i) => i % 251)
        const chunks = [large.subarray(0, 20_000), large.subarray(0, 10), large.subarray(20_000)]
        const input = [Tar.file("a", "a"), Tar.fileStream("b", 40_010, Stream.make(...chunks)), Tar.file("c", large)]
        const output = yield* decode(yield* encode(input))
        assert.deepStrictEqual(output.map((entry) => entry.body), [
          textEncoder.encode("a"),
          new Uint8Array(chunks.flatMap((chunk) => [...chunk])),
          large
        ])
      }))

    it.effect("round trips more small entries than fit in one output chunk", () =>
      Effect.gen(function*() {
        // Bodies of varying size, so that output chunks end inside a body
        const bodies = Array.from({ length: 300 }, (_, i) => String(i % 10).repeat((i * 37) % 1500))
        const output = yield* decode(yield* encode(bodies.map((body, i) => Tar.file(`f${i}`, body))))
        assert.deepStrictEqual(output.map((entry) => text(entry.body)), bodies)
      }))

    it.effect("keeps only the permission bits of mode", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("f", "", { mode: 0o100755 })])
        assert.strictEqual(text(bytes.subarray(100, 107)), "0000755")
        // GNU tar --format=oldgnu writes file type bits into mode
        patchHeader(bytes, 100, "0100644")
        const [entry] = yield* decode(bytes)
        assert.strictEqual(entry.header.mode, 0o644)
      }))

    it.effect("round trips custom PAX records", () =>
      Effect.gen(function*() {
        const pax = JSON.parse(`{"__proto__":"p","comment":"multi\\nline"}`)
        const [entry] = yield* decode(yield* encode([Tar.file("f", "", { pax })]))
        assert.deepStrictEqual(Object.entries(entry.header.pax), [["__proto__", "p"], ["comment", "multi\nline"]])
      }))

    it.effect("closes each body before starting the next", () =>
      Effect.gen(function*() {
        const log: Array<string> = []
        const body = (name: string) =>
          Stream.make(textEncoder.encode(name)).pipe(
            Stream.onStart(Effect.sync(() => log.push(`open ${name}`))),
            Stream.ensuring(Effect.sync(() => log.push(`close ${name}`)))
          )
        yield* encode([Tar.fileStream("a", 1, body("a")), Tar.fileStream("b", 1, body("b"))])
        assert.deepStrictEqual(log, ["open a", "close a", "open b", "close b"])
      }))

    it.effect("passes the done value, upstream errors and body errors through", () =>
      Effect.gen(function*() {
        const done = yield* Channel.succeed(Arr.of(Tar.file("f", "f"))).pipe(
          Channel.concat(Channel.end("done")),
          Channel.pipeTo(Tar.encode()),
          Channel.runDrain
        )
        assert.strictEqual(done, "done")
        const upstream = Stream.fail("upstream").pipe(Stream.pipeThroughChannel(Tar.encode()), Stream.runDrain)
        assert.strictEqual(yield* failure(upstream), "upstream")
        assert.strictEqual(yield* failure(encode([Tar.fileStream("f", 1, Stream.fail("body"))])), "body")
        // A defect stays a defect, even when it is a TarError
        const defect = new Tar.TarError({ kind: "Truncated", message: "defect" })
        const exit = yield* Effect.exit(encode([Tar.fileStream("f", 1, Stream.die(defect))]))
        assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause) && !Cause.hasFails(exit.cause))
      }))

    it.effect("fails on entries that cannot be written", () =>
      Effect.gen(function*() {
        const short = Tar.fileStream("f", 5, Stream.make(textEncoder.encode("abc")))
        assert.strictEqual(yield* failure(encode([short])), "SizeMismatch")
        const long = Tar.fileStream("f", 2, Stream.make(textEncoder.encode("abc")))
        assert.strictEqual(yield* failure(encode([long])), "SizeMismatch")
        assert.strictEqual(yield* failure(encode([Tar.file("", "")])), "InvalidHeader")
        assert.strictEqual(yield* failure(encode([Tar.directory("")])), "InvalidHeader")
        assert.strictEqual(yield* failure(encode([Tar.file("dir/", "")])), "InvalidHeader")
        assert.strictEqual(
          yield* failure(encode([Tar.file("f", "", { mtime: new Date(Number.NaN) })])),
          "InvalidHeader"
        )
        const directory = Tar.directory("d")
        const sized = { header: { ...directory.header, size: 1 }, body: Stream.make(textEncoder.encode("x")) }
        assert.strictEqual(yield* failure(encode([sized])), "InvalidHeader")
        const device = { header: { ...Tar.file("dev", "").header, type: "CharDevice", devMajor: 0o10000000 } } as const
        assert.strictEqual(yield* failure(encode([{ ...device, body: Stream.empty }])), "InvalidHeader")
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
          const bytes = yield* fixture(name)
          for (const chunkSize of [1, bytes.length]) {
            const output = yield* decode(bytes, chunkSize)
            assert.deepStrictEqual(
              output.map(({ body, header }) => [header.path, header.type, header.uid, header.linkTarget ?? text(body)]),
              expected
            )
          }
        }))
    }

    it.effect("ignores input after the end of the archive and passes the upstream done value through", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("f", "f")])
        const input = Channel.succeed(Arr.of(bytes)).pipe(
          Channel.concat(Channel.succeed(Arr.of(textEncoder.encode("trailing data")))),
          Channel.concat(Channel.end("done"))
        )
        const paths: Array<string> = []
        const done = yield* input.pipe(
          Channel.pipeTo(Tar.decode()),
          Channel.runForEach((entries) => Effect.sync(() => paths.push(...entries.map((entry) => entry.header.path))))
        )
        assert.deepStrictEqual([paths, done], [["f"], "done"])
      }))

    it.effect("reads star prefixes, legacy directories and signed checksums", () =>
      Effect.gen(function*() {
        const star = yield* encode([Tar.file("name", "")])
        patchHeader(star, 345, "some/prefix")
        patchHeader(star, 508, "tar\0")
        const legacy = yield* encode([Tar.file("dir", "")])
        patchHeader(legacy, 0, "dir/")
        patchHeader(legacy, 156, [0])
        const signed = yield* encode([Tar.file("f", "")])
        patchHeader(signed, 1, [0xc3, 0xa9])
        // Old tar writers summed the bytes as signed values
        signed.fill(0x20, 148, 156)
        const sum = signed.subarray(0, 512).reduce((sum, byte) => sum + (byte > 0x7f ? byte - 0x100 : byte), 0)
        signed.set(textEncoder.encode(`${sum.toString(8).padStart(6, "0")}\0`), 148)
        const output = [...yield* decode(star), ...yield* decode(legacy), ...yield* decode(signed)]
        assert.deepStrictEqual(output.map(({ header }) => [header.path, header.type]), [
          ["some/prefix/name", "File"],
          ["dir/", "Directory"],
          ["fé", "File"]
        ])
      }))

    it.effect("applies PAX global headers to the entries that follow", () =>
      Effect.gen(function*() {
        // A global header and an entry, as the first 3 blocks of an archive
        const global = (records: string) =>
          Effect.map(withPax(records), (bytes) => {
            patchHeader(bytes, 156, "g")
            return bytes.subarray(0, 1536)
          })
        const archive = new Uint8Array([
          // `path` describes a single entry, so a global one is ignored
          ...yield* global("15 comment=one\n12 uname=gu\n10 path=p\n"),
          // An entry's own records override global ones
          ...(yield* withPax("15 comment=two\n")).subarray(0, 1536),
          // An empty value removes a global record
          ...yield* global("10 uname=\n"),
          ...yield* encode([Tar.file("last", "")])
        ])
        const output = yield* decode(archive)
        assert.deepStrictEqual(output.map(({ header }) => [header.path, header.uname, header.pax]), [
          ["f", "gu", { comment: "one" }],
          ["f", "gu", { comment: "two" }],
          ["f", "", { comment: "one" }],
          ["last", "", { comment: "one" }]
        ])
      }))

    it.effect("ignores empty GNU long names", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("f", "")])
        const longName = bytes.slice(0, 512)
        patchHeader(longName, 156, "L")
        const output = yield* decode(new Uint8Array([...longName, ...bytes]))
        assert.deepStrictEqual(output.map(({ header }) => header.path), ["f"])
      }))

    it.effect("reads PAX mtimes to the millisecond", () =>
      Effect.gen(function*() {
        const [positive] = yield* decode(yield* withPax("15 mtime=1.001\n"))
        const [negative] = yield* decode(yield* withPax("17 mtime=-1.0005\n"))
        assert.deepStrictEqual([positive.header.mtime.getTime(), negative.header.mtime.getTime()], [1001, -1001])
      }))

    it.effect("fails on GNU sparse files", () =>
      Effect.gen(function*() {
        assert.strictEqual(yield* failure(decode(yield* fixture("sparse-gnu"))), "Unsupported")
        assert.strictEqual(yield* failure(decode(yield* fixture("sparse-pax"))), "Unsupported")
      }))

    it.effect("fails on corrupt or truncated archives", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("a", "a".repeat(600))])
        assert.strictEqual(yield* failure(decode(bytes.subarray(0, 512 + 300))), "Truncated")
        bytes[0] = "b".charCodeAt(0)
        assert.strictEqual(yield* failure(decode(bytes)), "InvalidHeader")
      }))

    it.effect("fails on malformed extended headers and numbers", () =>
      Effect.gen(function*() {
        assert.strictEqual(yield* failure(decode(yield* withPax("3 x=1\n"))), "InvalidHeader")
        assert.strictEqual(yield* failure(decode(yield* withPax("10 uid=-1\n"))), "InvalidHeader")
        const oversized = yield* withPax("")
        patchHeader(oversized, 124, (1024 * 1024 + 1).toString(8).padStart(11, "0"))
        assert.strictEqual(yield* failure(decode(oversized)), "InvalidHeader")
        const negative = yield* encode([Tar.file("f", "")])
        // A base-256 uid of -1
        patchHeader(negative, 108, new Array(8).fill(0xff))
        assert.strictEqual(yield* failure(decode(negative)), "InvalidHeader")
        const bytes = yield* encode([Tar.file("f", "")])
        assert.strictEqual(yield* failure(decode(new Uint8Array([...new Uint8Array(512), ...bytes]))), "InvalidHeader")
      }))

    it.effect("fails on archives that end inside a header or before the entry of an extended header", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("f", "", { pax: { comment: "x" } })])
        assert.strictEqual(yield* failure(decode(bytes.subarray(0, 300))), "Truncated")
        assert.strictEqual(yield* failure(decode(bytes.subarray(0, 600))), "Truncated")
        assert.strictEqual(yield* failure(decode(bytes.subarray(0, 1024))), "Truncated")
        const ended = new Uint8Array([...bytes.subarray(0, 1024), ...new Uint8Array(1024)])
        assert.strictEqual(yield* failure(decode(ended)), "Truncated")
      }))

    it.effect("reports the archive offset of decoding errors", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("a", "a"), Tar.file("b", "b")])
        const message = (bytes: Uint8Array) =>
          Effect.map(Effect.flip(decode(bytes)), (error) => Tar.isTarError(error) ? error.message : error)
        assert.strictEqual(yield* message(bytes.subarray(0, 1300)), "unexpected end of tar archive at byte 1300")
        bytes[1024] = "c".charCodeAt(0)
        assert.strictEqual(yield* message(bytes), "header checksum mismatch (header at byte 1024)")
      }))

    it.effect("fails on an mtime outside the Date range", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("f", "")])
        // A base-256 mtime of 2^52 seconds
        patchHeader(bytes, 136, [0x80, 0, 0, 0, 0, 0x10, 0, 0, 0, 0, 0, 0])
        assert.strictEqual(yield* failure(decode(bytes)), "InvalidHeader")
      }))

    it.effect("reads an empty PAX header that ends an input chunk", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("f", "", { pax: { comment: "x" } })])
        // Drop the PAX data block and set the PAX header size to 0
        const archive = new Uint8Array([...bytes.subarray(0, 512), ...bytes.subarray(1024)])
        patchHeader(archive, 124, "00000000000")
        const output = yield* decode(archive, 512)
        assert.deepStrictEqual(output.map((entry) => entry.header.path), ["f"])
      }))

    it.effect("skips unread bodies when moving to the next entry", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("a", "a".repeat(1000)), Tar.file("b", "b".repeat(700))])
        for (const chunkSize of [1, 512, bytes.length]) {
          const output = yield* entries(bytes, chunkSize).pipe(
            Stream.mapEffect((entry) => Effect.map(Stream.mkUint8Array(Stream.take(entry.body, 1)), (body) => body[0])),
            Stream.runCollect
          )
          assert.deepStrictEqual(output, ["a".charCodeAt(0), "b".charCodeAt(0)])
        }
      }))

    it.effect("applies only the last of consecutive PAX headers", () =>
      Effect.gen(function*() {
        const first = yield* encode([Tar.file("f", "", { pax: { "a.first": "1" } })])
        const second = yield* encode([Tar.file("f", "", { pax: { "b.second": "2" } })])
        // The PAX header and data block of the first entry, then the whole second archive
        const output = yield* decode(new Uint8Array([...first.subarray(0, 1024), ...second]))
        assert.deepStrictEqual(output.map((entry) => entry.header.pax), [{ "b.second": "2" }])
      }))

    it.effect("resumes after an interrupted pull for the next entry", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("a", "a".repeat(2000)), Tar.file("b", "b")])
        const input = yield* Queue.unbounded<Uint8Array, Cause.Done>()
        yield* Queue.offer(input, bytes.subarray(0, 512 + 100))
        const pull = yield* Stream.toPull(Stream.fromQueue(input).pipe(Stream.pipeThroughChannel(Tar.decode())))
        yield* pull
        // Interrupted while skipping the unread body of "a"
        const fiber = yield* Effect.forkChild(pull)
        yield* Effect.yieldNow
        yield* Fiber.interrupt(fiber)
        yield* Queue.offer(input, bytes.subarray(512 + 100))
        yield* Queue.end(input)
        const [entry] = yield* pull
        assert.strictEqual(entry.header.path, "b")
      }))

    it.effect("serves the next entry when a body read races it for input", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("a", "a".repeat(2000)), Tar.file("b", "b")])
        const input = yield* Queue.unbounded<Uint8Array, Cause.Done>()
        yield* Queue.offer(input, bytes.subarray(0, 512 + 100))
        const pull = yield* Stream.toPull(Stream.fromQueue(input).pipe(Stream.pipeThroughChannel(Tar.decode())))
        const [entry] = yield* pull
        // Both wait for the same input, which arrives in one chunk while the input stays open
        const body = yield* Effect.forkChild(Stream.runDrain(entry.body))
        yield* Effect.yieldNow
        const next = yield* Effect.forkChild(pull)
        yield* Effect.yieldNow
        yield* Queue.offer(input, bytes.subarray(512 + 100))
        const [b] = yield* Fiber.join(next)
        assert.strictEqual(b.header.path, "b")
        assert.strictEqual(yield* failure(Fiber.join(body)), "BodyConsumed")
      }))

    it.effect("fails body reads after the next entry or the end of the entry stream", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("a", "a"), Tar.file("b", "b")])
        const pull = yield* Stream.toPull(entries(bytes, 512))
        const [a] = yield* pull
        yield* pull
        assert.strictEqual(yield* failure(Stream.runDrain(a.body)), "BodyConsumed")
        const head = yield* Stream.runHead(entries(bytes, 512))
        assert.strictEqual(yield* failure(Stream.runDrain(Option.getOrThrow(head).body)), "BodyConsumed")
      }))

    it.effect("continues a body that is run again where the previous run stopped", () =>
      Effect.gen(function*() {
        const content = "0123456789".repeat(200)
        const bytes = yield* encode([Tar.file("f", content)])
        const [entry] = yield* Stream.toPull(entries(bytes, 512)).pipe(Effect.flatten)
        const first = yield* Stream.mkUint8Array(Stream.take(entry.body, 1))
        const rest = yield* Stream.mkUint8Array(entry.body)
        assert.isBelow(first.length, content.length)
        assert.strictEqual(text(first) + text(rest), content)
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

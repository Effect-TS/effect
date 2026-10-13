import { assert, describe, it } from "@effect/vitest"
import type { Cause } from "effect"
import { Effect, Exit, Queue, Stream } from "effect"
import * as Tar from "effect/encoding/Tar"
import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

// Fixtures were written by GNU tar 1.35 and Go's archive/tar; see fixtures/tar/README.md
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

const split = (bytes: Uint8Array, size: number): Array<Uint8Array> => {
  const out: Array<Uint8Array> = []
  for (let i = 0; i < bytes.length; i += size) out.push(bytes.subarray(i, i + size))
  return out
}

const encode = <E>(entries: ReadonlyArray<Tar.Entry<E>>) =>
  Stream.fromIterable(entries).pipe(
    Stream.pipeThroughChannel(Tar.encode()),
    Stream.runCollect,
    Effect.map(concat)
  )

const entries = (bytes: Uint8Array, chunkSize = 4096) =>
  Stream.fromIterable(split(bytes, chunkSize)).pipe(
    Stream.rechunk(1),
    Stream.pipeThroughChannel(Tar.decode())
  )

const decode = (bytes: Uint8Array, chunkSize?: number) =>
  entries(bytes, chunkSize).pipe(
    Stream.mapEffect((entry) =>
      Effect.map(Stream.runCollect(entry.body), (chunks) => ({ header: entry.header, body: concat(chunks) }))
    ),
    Stream.runCollect
  )

const text = (bytes: Uint8Array) => textDecoder.decode(bytes)

const header = (overrides: Partial<Tar.Header> & Pick<Tar.Header, "path" | "type">): Tar.Header => ({
  typeflag: "0",
  size: 0,
  mode: 0o644,
  uid: 0,
  gid: 0,
  uname: "",
  gname: "",
  mtime: new Date(0),
  pax: {},
  ...overrides
})

const field = (block: Uint8Array, offset: number, length: number) => {
  const bytes = block.subarray(offset, offset + length)
  const end = bytes.indexOf(0)
  return text(end === -1 ? bytes : bytes.subarray(0, end))
}

const repeat = (char: string, n: number) => char.repeat(n)

describe("Tar", () => {
  describe("encode", () => {
    it.effect("writes reproducible USTAR headers with defaults", () =>
      Effect.gen(function*() {
        const archive = () => encode([Tar.directory("dir"), Tar.file("dir/a.txt", "hello\n")])
        const bytes = yield* archive()
        assert.deepStrictEqual(bytes, yield* archive())
        // dir header, file header, one data block, two zero blocks
        assert.strictEqual(bytes.length, 512 * 5)
        assert.strictEqual(field(bytes, 0, 100), "dir/")
        assert.strictEqual(field(bytes, 257, 6), "ustar")
        assert.strictEqual(field(bytes, 263, 2), "00")
        assert.strictEqual(String.fromCharCode(bytes[156]), "5")
        assert.strictEqual(field(bytes, 100, 8), "0000755")
        assert.strictEqual(field(bytes, 512 + 100, 8), "0000644")
        assert.strictEqual(field(bytes, 512 + 108, 8), "0000000")
        assert.strictEqual(field(bytes, 512 + 136, 12), "00000000000")
        assert.strictEqual(field(bytes, 512 + 124, 12), "00000000006")
        assert.strictEqual(text(bytes.subarray(1024, 1030)), "hello\n")
        assert.isTrue(bytes.subarray(1536).every((b) => b === 0))

        const [dir, file] = yield* decode(bytes)
        assert.deepStrictEqual(dir.header, {
          path: "dir/",
          type: "Directory",
          typeflag: "5",
          size: 0,
          mode: 0o755,
          uid: 0,
          gid: 0,
          uname: "",
          gname: "",
          mtime: new Date(0),
          pax: {}
        })
        assert.deepStrictEqual(file.header, Tar.file("dir/a.txt", "hello\n").header)
      }))

    it.effect("round trips every entry type", () =>
      Effect.gen(function*() {
        const options = { uid: 1000, gid: 1001, uname: "user", gname: "group", mtime: new Date("2024-01-02T03:04:05Z") }
        const input: Array<Tar.Entry> = [
          Tar.directory("root/", { ...options, mode: 0o750 }),
          Tar.file("root/file.bin", new Uint8Array([0, 1, 2, 255]), { ...options, mode: 0o4755 }),
          Tar.file("root/empty", ""),
          Tar.symlink("root/link", "file.bin", options),
          Tar.hardlink("root/hard", "root/file.bin", options),
          {
            header: header({ path: "root/null", type: "CharDevice", typeflag: "3", devMajor: 1, devMinor: 3 }),
            body: Stream.empty
          },
          {
            header: header({ path: "root/sda", type: "BlockDevice", typeflag: "4", devMajor: 8, devMinor: 1 }),
            body: Stream.empty
          },
          { header: header({ path: "root/fifo", type: "Fifo", typeflag: "6" }), body: Stream.empty },
          {
            header: header({ path: "root/volume", type: "Other", typeflag: "V", size: 3 }),
            body: Stream.make(textEncoder.encode("abc"))
          }
        ]
        const output = yield* decode(yield* encode(input))
        assert.deepStrictEqual(output.map((entry) => entry.header), input.map((entry) => entry.header))
        assert.deepStrictEqual(Array.from(output[1].body), [0, 1, 2, 255])
        assert.strictEqual(text(output[8].body), "abc")
      }))

    it.effect("splits long paths into the USTAR prefix without PAX", () =>
      Effect.gen(function*() {
        const path = `${repeat("a", 120)}/${repeat("b", 90)}.txt`
        const bytes = yield* encode([Tar.file(path, "x")])
        assert.strictEqual(bytes.length, 512 * 4)
        assert.strictEqual(String.fromCharCode(bytes[156]), "0")
        assert.strictEqual(field(bytes, 0, 100), `${repeat("b", 90)}.txt`)
        assert.strictEqual(field(bytes, 345, 155), repeat("a", 120))
        const [entry] = yield* decode(bytes)
        assert.strictEqual(entry.header.path, path)
        assert.deepStrictEqual(entry.header.pax, {})
      }))

    it.effect("adds a PAX header only for fields that don't fit USTAR", () =>
      Effect.gen(function*() {
        const longPath = `${repeat("d", 300)}.txt`
        const longTarget = `/${repeat("t", 150)}`
        const input: Array<Tar.Entry> = [
          Tar.file(longPath, "long"),
          Tar.file("héllo-wörld-日本.txt", "unicode"),
          Tar.symlink("link", longTarget),
          Tar.file("ids", "", { uid: 3_000_000, gid: 2_097_152, uname: repeat("u", 40), gname: "grüppe" }),
          Tar.file("xattr", "", { pax: { "SCHILY.xattr.user.k": "v", "comment": "ü" } })
        ]
        const bytes = yield* encode(input)
        assert.strictEqual(String.fromCharCode(bytes[156]), "x")
        assert.strictEqual(field(bytes, 0, 100), `PaxHeaders.0/${repeat("d", 300)}`.slice(0, 100))

        const output = yield* decode(bytes)
        assert.deepStrictEqual(output.map((entry) => entry.header), input.map((entry) => entry.header))
        assert.strictEqual(text(output[0].body), "long")
        assert.strictEqual(text(output[1].body), "unicode")
      }))

    it.effect("writes PAX size for bodies of 8 GiB or more", () =>
      Effect.gen(function*() {
        const size = 9 * 1024 ** 3
        const chunk = new Uint8Array(65536).fill(7)
        const body = Stream.unfold(0, (n) => Effect.succeed(n < size ? [chunk, n + chunk.length] as const : undefined))
        // The header blocks and the first body chunk
        const head = yield* Stream.make({ header: header({ path: "big", type: "File", size }), body }).pipe(
          Stream.pipeThroughChannel(Tar.encode()),
          Stream.take(2),
          Stream.runCollect,
          Effect.map(concat)
        )
        assert.strictEqual(String.fromCharCode(head[156]), "x")
        assert.include(text(head.subarray(512, 1024)), `size=${size}\n`)
        assert.strictEqual(field(head, 1024 + 124, 12), "00000000000")

        const firstChunk = yield* entries(head).pipe(
          Stream.mapEffect((entry) =>
            Effect.map(Stream.runHead(entry.body), (chunk) => ({ header: entry.header, chunk }))
          ),
          Stream.runHead
        )
        assert.isTrue(firstChunk._tag === "Some")
        if (firstChunk._tag === "Some") {
          assert.strictEqual(firstChunk.value.header.size, size)
          assert.deepStrictEqual(firstChunk.value.header.pax, {})
          assert.strictEqual(firstChunk.value.chunk._tag, "Some")
        }
      }))

    it.effect("fails with SizeMismatch when a body is shorter or longer than its size", () =>
      Effect.gen(function*() {
        for (const body of ["abc", "abcdefghijk"]) {
          const error = yield* encode([{
            header: header({ path: "f", type: "File", size: 5 }),
            body: Stream.make(textEncoder.encode(body))
          }]).pipe(Effect.flip)
          assert.isTrue(Tar.isTarError(error))
          if (Tar.isTarError(error)) assert.strictEqual(error.kind, "SizeMismatch")
        }
      }))

    it.effect("fails with InvalidHeader for values that cannot be written", () =>
      Effect.gen(function*() {
        const invalid: Array<Tar.Header> = [
          header({ path: "", type: "File" }),
          header({ path: "a\0b", type: "File" }),
          header({ path: "f", type: "File", mode: -1 }),
          header({ path: "f", type: "File", mode: 0o10000000 }),
          header({ path: "f", type: "File", mtime: new Date(Number.NaN) }),
          header({ path: "d/", type: "Directory", size: 1 }),
          header({ path: "o", type: "Other", typeflag: "x" }),
          header({ path: "f", type: "File", pax: { "a=b": "c" } })
        ]
        for (const h of invalid) {
          const error = yield* encode([{ header: h, body: Stream.empty }]).pipe(Effect.flip)
          assert.isTrue(Tar.isTarError(error) && error.kind === "InvalidHeader", h.path)
        }
      }))

    it.effect("propagates body failures", () =>
      Effect.gen(function*() {
        const error = yield* encode([{
          header: header({ path: "f", type: "File", size: 1 }),
          body: Stream.fail("boom")
        }])
          .pipe(Effect.flip)
        assert.strictEqual(error, "boom")
      }))
  })

  describe("decode", () => {
    const expectedTree = [
      ["tree/", "Directory", ""],
      [`tree/${repeat("a", 80)}/`, "Directory", ""],
      [`tree/${repeat("a", 80)}/${repeat("b", 60)}/`, "Directory", ""],
      [`tree/${repeat("a", 80)}/${repeat("b", 60)}/${repeat("c", 90)}.txt`, "File", "split\n"],
      [`tree/${repeat("d", 120)}/`, "Directory", ""],
      [`tree/${repeat("d", 120)}/${repeat("e", 120)}/`, "Directory", ""],
      [`tree/${repeat("d", 120)}/${repeat("e", 120)}/${repeat("f", 30)}.txt`, "File", "long\n"],
      ["tree/dir/", "Directory", ""],
      ["tree/dir/hello.txt", "File", "hello\n"],
      ["tree/fifo", "Fifo", ""],
      ["tree/hardlink.txt", "Hardlink", ""],
      ["tree/héllo-wörld-日本.txt", "File", "unicode\n"],
      ["tree/longlink", "Symlink", ""],
      ["tree/shortlink", "Symlink", ""]
    ]

    for (const format of ["gnu", "pax"]) {
      it.effect(`reads GNU tar --format=${format} archives`, () =>
        Effect.gen(function*() {
          const output = yield* decode(fixture(format))
          assert.deepStrictEqual(
            output.map((entry) => [entry.header.path, entry.header.type, text(entry.body)]),
            expectedTree
          )
          for (const { header } of output) {
            assert.strictEqual(header.uid, 3_000_000)
            assert.strictEqual(header.gid, 1000)
            assert.strictEqual(header.uname, "user")
            assert.strictEqual(header.gname, "grp")
            assert.strictEqual(header.mtime.toISOString(), "2024-01-02T03:04:05.000Z")
            assert.strictEqual(
              header.mode,
              header.type === "Directory" ? 0o755 : header.type === "Symlink" ? 0o777 : 0o644
            )
            if (format === "gnu") {
              assert.deepStrictEqual(header.pax, {})
            } else {
              assert.deepStrictEqual(Object.keys(header.pax).sort(), ["atime", "ctime"])
            }
          }
          const byPath = new Map(output.map((entry) => [entry.header.path, entry.header]))
          assert.strictEqual(byPath.get("tree/hardlink.txt")?.linkTarget, "tree/dir/hello.txt")
          assert.strictEqual(byPath.get("tree/longlink")?.linkTarget, `${repeat("x", 150)}/target`)
          assert.strictEqual(byPath.get("tree/shortlink")?.linkTarget, "dir/hello.txt")
          assert.strictEqual(byPath.get("tree/dir/hello.txt")?.size, 6)
        }))
    }

    it.effect("reads GNU tar --format=ustar archives with prefixed paths", () =>
      Effect.gen(function*() {
        const output = yield* decode(fixture("ustar"))
        assert.deepStrictEqual(output.map((entry) => [entry.header.path, entry.header.type, text(entry.body)]), [
          ["small/", "Directory", ""],
          [`small/${repeat("a", 80)}/`, "Directory", ""],
          [`small/${repeat("a", 80)}/${repeat("b", 60)}/`, "Directory", ""],
          [`small/${repeat("a", 80)}/${repeat("b", 60)}/${repeat("c", 90)}.txt`, "File", "split\n"],
          ["small/dir/", "Directory", ""],
          ["small/dir/hello.txt", "File", "hello\n"],
          ["small/dir/link", "Symlink", ""]
        ])
      }))

    it.effect("reads GNU tar --format=v7 archives", () =>
      Effect.gen(function*() {
        const output = yield* decode(fixture("v7"))
        assert.deepStrictEqual(
          output.map((entry) => [entry.header.path, entry.header.type, entry.header.typeflag, text(entry.body)]),
          [
            ["small/dir/", "Directory", "5", ""],
            ["small/dir/hello.txt", "File", "\0", "hello\n"],
            ["small/dir/link", "Symlink", "2", ""]
          ]
        )
        assert.strictEqual(output[2].header.linkTarget, "hello.txt")
        assert.strictEqual(output[1].header.uname, "")
      }))

    it.effect("reads Go archive/tar output", () =>
      Effect.gen(function*() {
        const output = yield* decode(fixture("go"))
        const mtime = new Date(1_700_000_000_000)
        const base = { uid: 0, gid: 0, uname: "", gname: "", mtime, pax: {} }
        assert.deepStrictEqual(output.map((entry) => entry.header), [
          { ...base, path: "data/", type: "Directory", typeflag: "5", size: 0, mode: 0o755 },
          { ...base, path: "data/short.txt", type: "File", typeflag: "0", size: 6, mode: 0o644 },
          {
            ...base,
            path: `data/${repeat("p", 120)}/${repeat("q", 90)}.txt`,
            type: "File",
            typeflag: "0",
            size: 6,
            mode: 0o600
          },
          { ...base, path: `data/${repeat("r", 300)}.txt`, type: "File", typeflag: "0", size: 5, mode: 0o644 },
          { ...base, path: "data/héllo-wörld-日本.txt", type: "File", typeflag: "0", size: 8, mode: 0o644 },
          {
            ...base,
            path: "data/longlink",
            type: "Symlink",
            typeflag: "2",
            size: 0,
            mode: 0o777,
            linkTarget: `/${repeat("t", 150)}`
          },
          {
            ...base,
            path: "data/hardlink",
            type: "Hardlink",
            typeflag: "1",
            size: 0,
            mode: 0o644,
            linkTarget: "data/short.txt"
          },
          {
            ...base,
            path: "data/bigids",
            type: "File",
            typeflag: "0",
            size: 0,
            mode: 0o4755,
            uid: 3_000_000,
            gid: 3_000_001
          },
          {
            ...base,
            path: "data/cap",
            type: "File",
            typeflag: "0",
            size: 3,
            mode: 0o755,
            pax: { "SCHILY.xattr.security.capability": "\x01\x00\x00\x02" }
          },
          { ...base, path: "data/fifo", type: "Fifo", typeflag: "6", size: 0, mode: 0o644 },
          {
            ...base,
            path: "data/null",
            type: "CharDevice",
            typeflag: "3",
            size: 0,
            mode: 0o666,
            devMajor: 1,
            devMinor: 3
          },
          {
            ...base,
            path: "data/sda",
            type: "BlockDevice",
            typeflag: "4",
            size: 0,
            mode: 0o660,
            devMajor: 8,
            devMinor: 0
          }
        ])
        assert.deepStrictEqual(output.map((entry) => text(entry.body)).filter((body) => body !== ""), [
          "short\n",
          "split\n",
          "long\n",
          "unicode\n",
          "cap"
        ])
      }))

    it.effect("decodes the same entries from 1-byte chunks", () =>
      Effect.gen(function*() {
        for (const name of ["gnu", "pax", "go"]) {
          const bytes = fixture(name)
          assert.deepStrictEqual(yield* decode(bytes, 1), yield* decode(bytes), name)
        }
      }))

    it.effect("applies PAX mtime with sub-second precision", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("f", "", { pax: { mtime: "1700000000.123456789" } })])
        const [entry] = yield* decode(bytes)
        assert.strictEqual(entry.header.mtime.getTime(), 1_700_000_000_123)
        assert.deepStrictEqual(entry.header.pax, {})
      }))

    it.effect("skips unread bodies when moving to the next entry", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([
          Tar.file("a", repeat("a", 1000)),
          Tar.file("b", repeat("b", 700)),
          Tar.file("c", "c")
        ])
        for (const chunkSize of [1, 7, 512, 100_000]) {
          const output = yield* entries(bytes, chunkSize).pipe(
            Stream.mapEffect((entry, i) =>
              i === 1 ?
                Effect.map(Stream.runCollect(entry.body), (chunks) => text(concat(chunks))) :
                i === 0 ?
                Effect.map(Stream.runCollect(Stream.take(entry.body, 1)), () => entry.header.path) :
                Effect.succeed(entry.header.path)
            ),
            Stream.runCollect
          )
          assert.deepStrictEqual(output, ["a", repeat("b", 700), "c"])
        }
      }))

    it.effect("fails with BodyConsumed when a body is read after moving on", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("a", "aaa"), Tar.file("b", "bbb")])
        const collected = yield* Stream.runCollect(entries(bytes))
        assert.strictEqual(collected.length, 2)
        for (const entry of collected) {
          const error = yield* Stream.runCollect(entry.body).pipe(Effect.flip)
          assert.isTrue(Tar.isTarError(error) && error.kind === "BodyConsumed")
        }
      }))

    it.effect("streams a large body without buffering it", () =>
      Effect.gen(function*() {
        const chunkSize = 65536
        const count = 1024
        const size = chunkSize * count
        const body = Stream.unfold(0, (i) =>
          Effect.succeed(i < count ? [new Uint8Array(chunkSize).fill(i % 256), i + 1] as const : undefined))
        const result = yield* Stream.make({ header: header({ path: "big", type: "File", size }), body }).pipe(
          Stream.pipeThroughChannel(Tar.encode()),
          Stream.pipeThroughChannel(Tar.decode()),
          Stream.mapEffect((entry) =>
            Stream.runFold(entry.body, () => ({ bytes: 0, largest: 0, ordered: true }), (acc, chunk) => {
              const expected = Math.floor(acc.bytes / chunkSize) % 256
              return {
                bytes: acc.bytes + chunk.length,
                largest: Math.max(acc.largest, chunk.length),
                ordered: acc.ordered && chunk[0] === expected
              }
            })
          ),
          Stream.runCollect
        )
        assert.deepStrictEqual(result, [{ bytes: size, largest: chunkSize, ordered: true }])
      }))

    it.effect("emits body bytes before the rest of the archive arrives", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("f", repeat("z", 2000))])
        const input = yield* Queue.unbounded<Uint8Array, Cause.Done>()
        yield* Queue.offer(input, bytes.subarray(0, 512 + 100))
        const pullEntry = yield* Stream.toPull(Stream.fromQueue(input).pipe(Stream.pipeThroughChannel(Tar.decode())))
        const [entry] = yield* pullEntry
        assert.strictEqual(entry.header.size, 2000)
        const pullBody = yield* Stream.toPull(entry.body)
        const [first] = yield* pullBody
        assert.strictEqual(text(first), repeat("z", 100))
        yield* Queue.offer(input, bytes.subarray(612))
        yield* Queue.end(input)
        let rest = 0
        while (true) {
          const exit = yield* Effect.exit(pullBody)
          if (Exit.isFailure(exit)) break
          for (const chunk of exit.value) rest += chunk.length
        }
        assert.strictEqual(rest, 1900)
      }))

    it.effect("ignores data after the end-of-archive blocks and tolerates a missing trailer", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("a", "a")])
        const garbage = concat([bytes, textEncoder.encode("garbage after the end")])
        assert.deepStrictEqual((yield* decode(garbage)).map((entry) => entry.header.path), ["a"])
        // No end-of-archive blocks at all, or only one
        for (const end of [1024, 1536]) {
          assert.deepStrictEqual((yield* decode(bytes.subarray(0, end))).map((entry) => entry.header.path), ["a"])
        }
      }))

    it.effect("fails with InvalidHeader on a bad checksum", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("a", "a")])
        bytes[0] = "b".charCodeAt(0)
        const error = yield* Effect.flip(decode(bytes))
        assert.isTrue(Tar.isTarError(error) && error.kind === "InvalidHeader")
      }))

    it.effect("fails with InvalidHeader on a non-zero block after an end-of-archive block", () =>
      Effect.gen(function*() {
        const file = yield* encode([Tar.file("a", "a")])
        const bytes = concat([new Uint8Array(512), file])
        const error = yield* Effect.flip(decode(bytes))
        assert.isTrue(Tar.isTarError(error) && error.kind === "InvalidHeader")
      }))

    it.effect("fails with Truncated when the input ends inside a header or body", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("a", repeat("a", 600)), Tar.file("b", "b")])
        // Inside a header, inside a body, and inside the padding after a body
        for (const end of [100, 512 + 300, 512 + 1000]) {
          const error = yield* Effect.flip(decode(bytes.subarray(0, end)))
          assert.isTrue(Tar.isTarError(error) && error.kind === "Truncated", String(end))
        }
      }))

    it.effect("fails with InvalidHeader on a malformed PAX record", () =>
      Effect.gen(function*() {
        const bytes = yield* encode([Tar.file("f", "", { pax: { comment: "x" } })])
        assert.strictEqual(text(bytes.subarray(512, 524)), "13 comment=x")
        bytes[512] = "9".charCodeAt(0)
        const error = yield* Effect.flip(decode(bytes))
        assert.isTrue(Tar.isTarError(error) && error.kind === "InvalidHeader")
      }))

    it.effect("fails with Unsupported on GNU sparse files", () =>
      Effect.gen(function*() {
        for (const name of ["sparse-gnu", "sparse-pax"]) {
          const error = yield* Effect.flip(decode(fixture(name)))
          assert.isTrue(Tar.isTarError(error) && error.kind === "Unsupported", name)
        }
      }))
  })

  it("identifies tar errors", () => {
    assert.isTrue(Tar.isTarError(new Tar.TarError({ kind: "Truncated", message: "boom" })))
    assert.isFalse(Tar.isTarError({ _tag: "TarError" }))
    assert.isFalse(Tar.isTarError(null))
  })
})

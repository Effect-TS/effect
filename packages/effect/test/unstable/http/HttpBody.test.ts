import { assert, describe, it } from "@effect/vitest"
import { ByteSize, Effect, FileSystem, Stream } from "effect"
import { HttpBody } from "effect/unstable/http"

const maxSafe = BigInt(Number.MAX_SAFE_INTEGER)
const oversized = 9007199254740993n
const fileInfo = (size: bigint): FileSystem.File.Info => ({ size: ByteSize.bytes(size) }) as FileSystem.File.Info
const fileSystem = (info: FileSystem.File.Info) =>
  FileSystem.makeNoop({
    stat: () => Effect.succeed(info),
    stream: () => Stream.empty
  })

for (const constructor of ["file", "fileFromInfo"] as const) {
  describe(constructor, () => {
    const make = (info: FileSystem.File.Info, options?: Parameters<typeof HttpBody.file>[1]) =>
      constructor === "file" ? HttpBody.file("x", options) : HttpBody.fileFromInfo("x", info, options)

    it.each([
      { name: "maximum safe length", size: maxSafe, options: {}, expected: Number.MAX_SAFE_INTEGER },
      { name: "oversized file capped by a safe byte count", size: oversized, options: { bytesToRead: 2 }, expected: 2 },
      {
        name: "safe offset leaving the maximum safe length",
        size: oversized,
        options: { offset: 2 },
        expected: Number.MAX_SAFE_INTEGER
      },
      { name: "safe offset leaving two bytes", size: oversized, options: { offset: maxSafe }, expected: 2 },
      {
        name: "unsafe bigint offset leaving one byte",
        size: oversized,
        options: { offset: maxSafe + 1n },
        expected: 1
      },
      {
        name: "unsafe bigint size and offset leaving three bytes",
        size: oversized + 3n,
        options: { offset: oversized },
        expected: 3
      },
      {
        name: "unsafe string offset leaving three bytes",
        size: oversized + 3n,
        options: { offset: "9007199254740993 B" },
        expected: 3
      },
      {
        name: "byte count clamped after exact subtraction",
        size: oversized + 3n,
        options: { offset: oversized, bytesToRead: 4 },
        expected: 3
      },
      {
        name: "unsafe bigint byte count clamped to a small file",
        size: 6n,
        options: { bytesToRead: oversized },
        expected: 6
      },
      {
        name: "unsafe string byte count clamped to a small file",
        size: 6n,
        options: { bytesToRead: "9007199254740993 B" },
        expected: 6
      },
      {
        name: "unsafe byte count clamped to the maximum safe length",
        size: maxSafe,
        options: { bytesToRead: oversized },
        expected: Number.MAX_SAFE_INTEGER
      },
      { name: "unsafe offset at EOF", size: oversized, options: { offset: oversized }, expected: 0 },
      {
        name: "unsafe offset past EOF",
        size: oversized,
        options: { offset: oversized + 1n, bytesToRead: oversized },
        expected: 0
      },
      { name: "zero byte count on an oversized file", size: oversized, options: { bytesToRead: 0 }, expected: 0 },
      {
        name: "bigints beyond the finite number range",
        size: 10n ** 400n + 3n,
        options: { offset: 10n ** 400n },
        expected: 3
      }
    ])("calculates $name exactly", async ({ expected, options, size }) => {
      const info = fileInfo(size)
      const body = await Effect.runPromise(
        make(info, options).pipe(
          Effect.provideService(FileSystem.FileSystem, fileSystem(info))
        )
      )
      assert.strictEqual(body.contentLength, expected)
    })

    it.each([
      { name: "first unsafe length", size: maxSafe + 1n, options: {} },
      { name: "length that would round down", size: oversized, options: {} },
      { name: "length that would round up", size: oversized + 2n, options: {} },
      { name: "unsafe length after applying an offset", size: oversized, options: { offset: 1 } },
      {
        name: "unsafe length after applying both bounds",
        size: oversized + 3n,
        options: { offset: 1, bytesToRead: oversized }
      },
      { name: "length beyond the finite number range", size: 10n ** 400n, options: {} }
    ])("rejects $name with typed BadArgument", async ({ options, size }) => {
      const info = fileInfo(size)
      const error = await Effect.runPromise(
        make(info, options).pipe(
          Effect.flip,
          Effect.provideService(FileSystem.FileSystem, fileSystem(info))
        )
      )
      assert.strictEqual(error._tag, "PlatformError")
      assert.strictEqual(error.reason._tag, "BadArgument")
    })

    for (const field of ["offset", "bytesToRead"] as const) {
      it.each([
        { name: "malformed string", value: "garbage" },
        { name: "fractional byte string", value: "1.5 B" },
        { name: "negative string", value: "-1 B" },
        { name: "negative bigint", value: -1n },
        { name: "negative number", value: -1 },
        { name: "fractional number", value: 1.5 },
        { name: "NaN", value: NaN },
        { name: "positive infinity", value: Infinity },
        { name: "negative infinity", value: -Infinity },
        { name: "unsafe integer number", value: Number.MAX_SAFE_INTEGER + 1 }
      ])(`rejects ${field} containing $name with typed BadArgument`, async ({ value }) => {
        const info = fileInfo(6n)
        // Construction outside Effect.gen must not throw, even for invalid inputs.
        const body = make(info, { [field]: value })
        const error = await Effect.runPromise(body.pipe(
          Effect.flip,
          Effect.provideService(FileSystem.FileSystem, fileSystem(info))
        ))
        assert.strictEqual(error._tag, "PlatformError")
        assert.strictEqual(error.reason._tag, "BadArgument")
      })
    }

    it.each([
      { name: "invalid offset with zero bytes requested", options: { offset: -1, bytesToRead: 0 } },
      { name: "invalid byte count at EOF", options: { offset: 6, bytesToRead: -1 } },
      { name: "unsafe numeric byte count past EOF", options: { offset: 7, bytesToRead: Number.MAX_SAFE_INTEGER + 1 } }
    ])("validates $name before accepting an empty body", async ({ options }) => {
      const info = fileInfo(6n)
      const error = await Effect.runPromise(
        make(info, options).pipe(
          Effect.flip,
          Effect.provideService(FileSystem.FileSystem, fileSystem(info))
        )
      )
      assert.strictEqual(error.reason._tag, "BadArgument")
    })

    it("defers reading range inputs and accessing the filesystem until evaluation", async () => {
      const info = fileInfo(6n)
      let reads = 0
      let statCalls = 0
      let streamCalls = 0
      const body = make(info, {
        get offset() {
          reads++
          return 2
        }
      }).pipe(Effect.provideService(
        FileSystem.FileSystem,
        FileSystem.makeNoop({
          stat: () => {
            statCalls++
            return Effect.succeed(info)
          },
          stream: () => {
            streamCalls++
            return Stream.empty
          }
        })
      ))
      assert.strictEqual(reads, 0)
      assert.strictEqual(statCalls, 0)
      assert.strictEqual(streamCalls, 0)
      assert.strictEqual((await Effect.runPromise(body)).contentLength, 4)
      assert.isAbove(reads, 0)
      assert.strictEqual(statCalls, constructor === "file" ? 1 : 0)
      assert.strictEqual(streamCalls, 1)
    })

    it.each([
      { name: "whole file", options: {}, expected: [1, 2, 3, 4, 5, 6] },
      { name: "offset only", options: { offset: 2 }, expected: [3, 4, 5, 6] },
      {
        name: "selected ByteSize range",
        options: { offset: ByteSize.bytes(2), bytesToRead: ByteSize.bytes(2) },
        expected: [3, 4]
      },
      { name: "selected string range", options: { offset: "2 B", bytesToRead: "2 B" }, expected: [3, 4] },
      { name: "byte count past EOF", options: { offset: 2, bytesToRead: 10 }, expected: [3, 4, 5, 6] },
      { name: "offset at EOF", options: { offset: 6 }, expected: [] },
      { name: "offset past EOF", options: { offset: 7, bytesToRead: 2 }, expected: [] },
      { name: "zero byte count", options: { bytesToRead: 0 }, expected: [] }
    ])("preserves the bytes and content length for $name", async ({ expected, options }) => {
      const info = fileInfo(6n)
      const body = await Effect.runPromise(
        make(info, { ...options, contentType: "text/plain", chunkSize: 2 }).pipe(
          Effect.provideService(
            FileSystem.FileSystem,
            FileSystem.makeNoop({
              stat: () => Effect.succeed(info),
              stream: (path, range) => {
                assert.strictEqual(path, "x")
                assert.strictEqual(range?.chunkSize, 2)
                const offset = Number(ByteSize.fromInputUnsafe(range?.offset ?? 0))
                const count = Number(ByteSize.fromInputUnsafe(range?.bytesToRead ?? 6))
                return Stream.succeed(new Uint8Array([1, 2, 3, 4, 5, 6]).slice(offset, offset + count))
              }
            })
          )
        )
      )
      const bytes = await Effect.runPromise(Stream.mkUint8Array(body.stream))
      assert.deepStrictEqual(Array.from(bytes), expected)
      assert.strictEqual(body.contentLength, bytes.length)
      assert.strictEqual(body.contentType, "text/plain")
    })
  })
}

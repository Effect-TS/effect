import { assert, describe, it } from "@effect/vitest"
import { DateTime, Effect, type Layer, Option, Ref, Result, Stream } from "effect"
import * as FileSystem from "effect/FileSystem"
import * as PlatformError from "effect/PlatformError"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const makeTestContext = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const root = yield* fs.makeTempDirectoryScoped({ prefix: "effect-filesystem-test-" })
  return {
    fs,
    path: (...segments: ReadonlyArray<string>) => [root, ...segments].join("/")
  }
})

const fillBuffer = Effect.fnUntraced(function*(file: FileSystem.File, buffer: Uint8Array) {
  let offset = 0
  while (offset < buffer.length) {
    const bytesRead = Number(yield* file.read(buffer.subarray(offset)))
    assert.isTrue(bytesRead >= 0)
    assert.isTrue(bytesRead <= buffer.length - offset)
    if (bytesRead === 0) {
      break
    }
    offset += bytesRead
  }
  return FileSystem.Size(offset)
})

const readAllocUpTo = Effect.fnUntraced(function*(file: FileSystem.File, size: number) {
  const bytes = new Uint8Array(size)
  let offset = 0
  while (offset < size) {
    const chunk = yield* file.readAlloc(size - offset)
    if (Option.isNone(chunk)) {
      break
    }
    assert.isTrue(chunk.value.length > 0)
    assert.isTrue(chunk.value.length <= size - offset)
    bytes.set(chunk.value, offset)
    offset += chunk.value.length
  }
  return bytes.subarray(0, offset)
})

const writeUsingWrite = Effect.fnUntraced(function*(file: FileSystem.File, bytes: Uint8Array) {
  let offset = 0
  while (offset < bytes.length) {
    const bytesWritten = Number(yield* file.write(bytes.subarray(offset)))
    assert.isTrue(bytesWritten > 0)
    assert.isTrue(bytesWritten <= bytes.length - offset)
    offset += bytesWritten
  }
})

const assertSystemError = (
  error: PlatformError.PlatformError,
  expected: {
    readonly tag?: PlatformError.SystemErrorTag | undefined
    readonly method?: string | undefined
    readonly pathOrDescriptor?: string | number | undefined
  }
): PlatformError.SystemError => {
  assert.strictEqual(error._tag, "PlatformError")
  if (!(error.reason instanceof PlatformError.SystemError)) {
    return assert.fail("Expected a SystemError")
  }
  assert.strictEqual(error.reason.module, "FileSystem")
  if (expected.method !== undefined) {
    assert.strictEqual(error.reason.method, expected.method)
  }
  if (expected.pathOrDescriptor !== undefined) {
    assert.strictEqual(error.reason.pathOrDescriptor, expected.pathOrDescriptor)
  }
  if (expected.tag !== undefined) {
    assert.strictEqual(error.reason._tag, expected.tag)
  }
  return error.reason
}

export const suite = (name: string, layer: Layer.Layer<FileSystem.FileSystem, unknown>) =>
  it.layer(layer, { timeout: { seconds: 30 } })(`FileSystem (${name})`, (it) => {
    describe("path operations", () => {
      it.effect("should resolve relative paths when the adapter working directory is defined", () =>
        Effect.gen(function*() {
          const fs = yield* FileSystem.FileSystem
          const workingDirectory = yield* fs.realPath(".")
          const directory = yield* fs.makeTempDirectoryScoped({
            directory: workingDirectory,
            prefix: "effect-filesystem-relative-"
          })
          const directoryName = directory.replaceAll("\\", "/").split("/").at(-1)!
          const relativePath = `./${directoryName}/file.txt`
          const absolutePath = `${directory}/file.txt`

          yield* fs.writeFileString(relativePath, "relative")

          assert.strictEqual(yield* fs.readFileString(absolutePath), "relative")
          assert.strictEqual(yield* fs.realPath(relativePath), yield* fs.realPath(absolutePath))

          yield* fs.writeFileString(absolutePath, "absolute")

          assert.strictEqual(yield* fs.readFileString(relativePath), "absolute")
        }))

      it.effect("should preserve binary bytes when reading and writing files", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const file = path("binary.dat")
          const expected = new Uint8Array([0, 42, 128, 255])
          const input = expected.slice()

          yield* fs.writeFile(file, input)
          input[1] = 0

          const firstRead = yield* fs.readFile(file)
          assert.deepStrictEqual(firstRead, expected)
          firstRead[2] = 0
          assert.deepStrictEqual(yield* fs.readFile(file), expected)
        }))

      it.effect("should preserve UTF-8 text when reading and writing files", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const file = path("utf8.txt")
          const text = "héllo 👋"

          yield* fs.writeFileString(file, text)

          assert.strictEqual(yield* fs.readFileString(file), text)
        }))

      it.effect("should list directory entries and metadata when creating nested directories", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          yield* fs.makeDirectory(path("src", "features"), { recursive: true })
          yield* fs.writeFileString(path("src", "index.ts"), "export {}")
          yield* fs.writeFileString(path("src", "features", "chat.ts"), "export {}")

          assert.deepStrictEqual((yield* fs.readDirectory(path("src"))).sort(), ["features", "index.ts"])
          assert.strictEqual((yield* fs.stat(path("src"))).type, "Directory")
          assert.strictEqual((yield* fs.stat(path("src", "index.ts"))).type, "File")
          assert.strictEqual((yield* fs.stat(path("src", "index.ts"))).size, FileSystem.Size(9))
        }))

      it.effect("should include nested files when listing directories recursively", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          yield* fs.makeDirectory(path("src", "features"), { recursive: true })
          yield* fs.writeFileString(path("src", "index.ts"), "export {}")
          yield* fs.writeFileString(path("src", "features", "chat.ts"), "export {}")

          const entries = (yield* fs.readDirectory(path("src"), { recursive: true }))
            .map((path) => path.replaceAll("\\", "/"))
            .sort()

          assert.isTrue(entries.includes("features/chat.ts"))
          assert.isTrue(entries.includes("index.ts"))
        }))

      it.effect("should require parent directories when creation is not recursive", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const directory = path("missing", "nested")
          const file = path("missing", "file.txt")

          const directoryError = yield* Effect.flip(fs.makeDirectory(directory))
          assertSystemError(directoryError, {
            tag: "NotFound",
            method: "makeDirectory",
            pathOrDescriptor: directory
          })

          const fileError = yield* Effect.flip(fs.writeFile(file, encoder.encode("content")))
          assertSystemError(fileError, { tag: "NotFound", method: "writeFile", pathOrDescriptor: file })

          yield* fs.makeDirectory(directory, { recursive: true })
          assert.strictEqual((yield* fs.stat(directory)).type, "Directory")
        }))

      it.effect("should keep recursive directory creation idempotent when the path is a directory", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const directory = path("nested", "directory")
          const file = path("file.txt")

          yield* fs.makeDirectory(directory, { recursive: true })
          yield* fs.makeDirectory(directory, { recursive: true })
          assert.strictEqual((yield* fs.stat(directory)).type, "Directory")

          yield* fs.writeFileString(file, "content")
          const error = yield* Effect.flip(fs.makeDirectory(file, { recursive: true }))
          assertSystemError(error, { tag: "AlreadyExists", method: "makeDirectory", pathOrDescriptor: file })
          assert.strictEqual(yield* fs.readFileString(file), "content")
        }))

      it.effect("should report existence when a path is created and removed", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const file = path("exists.txt")

          assert.isFalse(yield* fs.exists(file))
          yield* fs.writeFileString(file, "exists")
          assert.isTrue(yield* fs.exists(file))
          yield* fs.remove(file)
          assert.isFalse(yield* fs.exists(file))
        }))

      it.effect("should access existing paths and reject missing paths when checking access", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const existing = path("existing.txt")
          const missing = path("missing.txt")

          yield* fs.writeFileString(existing, "content")
          yield* fs.access(existing)

          const error = yield* Effect.flip(fs.access(missing))
          assertSystemError(error, { tag: "NotFound", method: "access", pathOrDescriptor: missing })
        }))

      it.effect("should remove directories addressed with a trailing separator", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const directory = path("directory")
          yield* fs.makeDirectory(directory)

          yield* fs.remove(`${directory}/`, { recursive: true })

          assert.isFalse(yield* fs.exists(directory))
        }))

      it.effect("should rename directories addressed with trailing separators", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const source = path("source")
          const destination = path("destination")
          yield* fs.makeDirectory(source)
          yield* fs.writeFileString(`${source}/file.txt`, "content")

          yield* fs.rename(`${source}/`, `${destination}/`)

          assert.isFalse(yield* fs.exists(source))
          assert.strictEqual(yield* fs.readFileString(`${destination}/file.txt`), "content")
        }))

      it.effect("should copy directories to a destination with a trailing separator", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const source = path("source")
          const destination = path("destination")
          yield* fs.makeDirectory(source)
          yield* fs.writeFileString(`${source}/file.txt`, "content")

          yield* fs.copy(source, `${destination}/`)

          assert.strictEqual(yield* fs.readFileString(`${source}/file.txt`), "content")
          assert.strictEqual(yield* fs.readFileString(`${destination}/file.txt`), "content")
        }))

      it.effect("should reject removing a file addressed as a directory", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const file = path("file.txt")
          yield* fs.writeFileString(file, "content")

          assert.isTrue(Result.isFailure(yield* Effect.result(fs.remove(`${file}/`))))

          assert.strictEqual(yield* fs.readFileString(file), "content")
        }))

      it.effect("should remove non-empty directories when removal is recursive", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const directory = path("nested")
          yield* fs.makeDirectory(path("nested", "child"), { recursive: true })
          yield* fs.writeFileString(path("nested", "child", "file.txt"), "content")

          yield* fs.remove(directory, { recursive: true })

          assert.isFalse(yield* fs.exists(directory))
        }))

      it.effect("should reject non-empty directories when removal is not recursive", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const directory = path("non-empty")
          const file = path("non-empty", "file.txt")
          yield* fs.makeDirectory(directory)
          yield* fs.writeFileString(file, "content")

          const error = yield* Effect.flip(fs.remove(directory))
          assertSystemError(error, { method: "remove", pathOrDescriptor: directory })

          assert.strictEqual(yield* fs.readFileString(file), "content")
        }))

      it.effect("should ignore missing paths only when removal is forced", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const missing = path("missing")

          const error = yield* Effect.flip(fs.remove(missing))
          assertSystemError(error, { tag: "NotFound", method: "remove", pathOrDescriptor: missing })

          yield* fs.remove(missing, { force: true })
        }))

      it.effect("should apply truncating, appending, and exclusive flags when writing files", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const file = path("write-flags.txt")
          yield* fs.writeFileString(file, "original")

          yield* fs.writeFileString(file, "replacement")
          yield* fs.writeFileString(file, " appended", { flag: "a" })
          assert.strictEqual(yield* fs.readFileString(file), "replacement appended")

          const error = yield* Effect.flip(fs.writeFile(file, encoder.encode("exclusive"), { flag: "wx" }))
          assertSystemError(error, { tag: "AlreadyExists", method: "writeFile", pathOrDescriptor: file })
          assert.strictEqual(yield* fs.readFileString(file), "replacement appended")
        }))

      it.effect("should honor write flags when writing empty data", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const file = path("empty-write-flags.txt")

          yield* fs.writeFileString(file, "content")
          yield* fs.writeFileString(file, "")
          assert.strictEqual(yield* fs.readFileString(file), "")

          yield* fs.writeFileString(file, "content")
          yield* fs.writeFileString(file, "", { flag: "r+" })
          assert.strictEqual(yield* fs.readFileString(file), "content")
        }))

      it.effect("should copy independent file and directory-tree contents when copying paths", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          yield* fs.makeDirectory(path("source", "nested"), { recursive: true })
          yield* fs.writeFileString(path("source", "file.txt"), "file")
          yield* fs.writeFileString(path("source", "nested", "child.txt"), "child")

          yield* fs.copyFile(path("source", "file.txt"), path("copy.txt"))
          yield* fs.copy(path("source"), path("copy"))

          yield* fs.writeFileString(path("source", "file.txt"), "changed file")
          yield* fs.writeFileString(path("source", "nested", "child.txt"), "changed child")

          assert.strictEqual(yield* fs.readFileString(path("copy.txt")), "file")
          assert.strictEqual(yield* fs.readFileString(path("copy", "file.txt")), "file")
          assert.strictEqual(yield* fs.readFileString(path("copy", "nested", "child.txt")), "child")
        }))

      it.effect("should replace an existing copy destination when overwrite is requested", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const source = path("source.txt")
          const destination = path("copy.txt")
          yield* fs.writeFileString(source, "source")
          yield* fs.writeFileString(destination, "old copy")

          yield* fs.copy(source, destination, { overwrite: true })

          assert.strictEqual(yield* fs.readFileString(destination), "source")
        }))

      it.effect("should move files and directories when renaming paths", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          yield* fs.makeDirectory(path("before", "nested"), { recursive: true })
          yield* fs.writeFileString(path("before", "nested", "file.txt"), "content")

          yield* fs.rename(path("before"), path("after"))
          yield* fs.rename(path("after", "nested", "file.txt"), path("after", "nested", "renamed.txt"))

          assert.isFalse(yield* fs.exists(path("before")))
          assert.isFalse(yield* fs.exists(path("after", "nested", "file.txt")))
          assert.strictEqual(yield* fs.readFileString(path("after", "nested", "renamed.txt")), "content")
        }))

      it.effect("should truncate and zero-extend files when changing their size", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const file = path("truncate.txt")
          yield* fs.writeFileString(file, "hello world")

          yield* fs.truncate(file, 5)
          assert.strictEqual(yield* fs.readFileString(file), "hello")

          yield* fs.truncate(file, 8)
          assert.deepStrictEqual(yield* fs.readFile(file), encoder.encode("hello\0\0\0"))

          yield* fs.truncate(file)
          assert.deepStrictEqual(yield* fs.readFile(file), new Uint8Array(0))
        }))

      it.effect("should normalize stable filesystem errors when path operations fail", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const missingPath = path("missing.txt")
          const missing = yield* Effect.flip(fs.readFile(missingPath))
          assertSystemError(missing, { tag: "NotFound", method: "readFile", pathOrDescriptor: missingPath })

          const directory = path("existing")
          yield* fs.makeDirectory(directory)
          const existing = yield* Effect.flip(fs.makeDirectory(directory))
          assertSystemError(existing, { tag: "AlreadyExists", method: "makeDirectory", pathOrDescriptor: directory })

          const file = path("file.txt")
          yield* fs.writeFileString(file, "content")
          const badResource = yield* Effect.flip(fs.readDirectory(file))
          assertSystemError(badResource, { tag: "BadResource", method: "readDirectory", pathOrDescriptor: file })
        }))
    })

    describe("temporary resources", () => {
      it.effect("should clean up scoped temporary resources when their scope closes", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const directory = yield* Effect.scoped(
            Effect.gen(function*() {
              const directory = yield* fs.makeTempDirectory({ directory: path() })
              assert.strictEqual((yield* fs.stat(directory)).type, "Directory")
              return directory
            })
          )
          assert.strictEqual((yield* fs.stat(directory)).type, "Directory")
          yield* fs.remove(directory, { recursive: true })

          const file = yield* fs.makeTempFile({ directory: path() })
          assert.strictEqual((yield* fs.stat(file)).type, "File")
          yield* fs.remove(file)

          const suffixedFile = yield* fs.makeTempFile({ directory: path(), prefix: "plain-", suffix: ".txt" })
          assert.strictEqual((yield* fs.stat(suffixedFile)).type, "File")
          assert.isTrue(suffixedFile.endsWith(".txt"))

          const scopedDirectory = yield* Effect.scoped(
            Effect.gen(function*() {
              const directory = yield* fs.makeTempDirectoryScoped({ directory: path(), prefix: "scoped-" })
              yield* fs.makeDirectory(`${directory}/nested`)
              yield* fs.writeFileString(`${directory}/nested/file.txt`, "content")
              assert.strictEqual((yield* fs.stat(directory)).type, "Directory")
              return directory
            })
          )
          const scopedDirectoryError = yield* Effect.flip(fs.stat(scopedDirectory))
          assertSystemError(scopedDirectoryError, {
            tag: "NotFound",
            method: "stat",
            pathOrDescriptor: scopedDirectory
          })

          const scopedFile = yield* Effect.scoped(
            Effect.gen(function*() {
              const file = yield* fs.makeTempFileScoped({
                directory: path(),
                prefix: "scoped-",
                suffix: ".txt"
              })
              assert.strictEqual((yield* fs.stat(file)).type, "File")
              assert.isTrue(file.endsWith(".txt"))
              return file
            })
          )
          const scopedFileError = yield* Effect.flip(fs.stat(scopedFile))
          assertSystemError(scopedFileError, { tag: "NotFound", method: "stat", pathOrDescriptor: scopedFile })
        }))
    })

    describe("streaming", () => {
      it.effect("should stream bounded file ranges when offsets and chunk sizes are configured", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const file = path("stream.txt")
          yield* fs.writeFileString(file, "0123456789")

          const defaultChunks = yield* fs.stream(file, {
            offset: 6,
            bytesToRead: 3
          }).pipe(Stream.runCollect)
          const chunks = yield* fs.stream(file, {
            offset: 2,
            bytesToRead: 5,
            chunkSize: 2
          }).pipe(Stream.runCollect)

          assert.strictEqual(defaultChunks.map((d) => decoder.decode(d)).join(""), "678")
          assert.isTrue(chunks.every((chunk) => chunk.length > 0 && chunk.length <= 2))
          assert.strictEqual(chunks.map((d) => decoder.decode(d)).join(""), "23456")
        }))

      it.effect("should write stream chunks when using a file sink", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const file = path("sink.txt")
          yield* fs.writeFileString(file, "old content")

          yield* Stream.run(
            Stream.make(encoder.encode("new "), encoder.encode("content")),
            fs.sink(file)
          )

          assert.strictEqual(yield* fs.readFileString(file), "new content")
        }))

      it.effect("should append stream chunks when a file sink uses the append flag", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const file = path("append-sink.txt")
          yield* fs.writeFileString(file, "seed")

          yield* Stream.run(
            Stream.make(encoder.encode(" appended")),
            fs.sink(file, { flag: "a" })
          )

          assert.strictEqual(yield* fs.readFileString(file), "seed appended")
        }))
    })

    describe("file handles and open modes", () => {
      // TODO: Add shared closed-handle failure coverage separately from error-tag normalization.
      // Node maps EBADF to Unknown; Deno maps BadResource. A common tag needs an adapter fix and regression coverage.
      it.effect("should keep read cursors independent when a file has multiple handles", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const file = path("cursors.txt")
          yield* fs.writeFileString(file, "0123456789")

          const first = yield* fs.open(file)
          const second = yield* fs.open(file)

          const buffer = new Uint8Array(2)
          assert.strictEqual(yield* fillBuffer(first, buffer), FileSystem.Size(2))
          assert.strictEqual(decoder.decode(buffer), "01")
          assert.strictEqual(decoder.decode(yield* readAllocUpTo(second, 2)), "01")
          yield* first.seek(3, "current")
          assert.strictEqual(decoder.decode(yield* readAllocUpTo(first, 2)), "56")
          yield* first.seek(0, "start")
          assert.strictEqual(decoder.decode(yield* readAllocUpTo(first, 2)), "01")
        }))

      it.effect("should advance and seek the write cursor when writing through a file handle", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const filePath = path("write-cursor.txt")
          const file = yield* fs.open(filePath, { flag: "w+" })

          yield* writeUsingWrite(file, encoder.encode("abc"))
          yield* writeUsingWrite(file, encoder.encode("def"))
          assert.strictEqual(yield* fs.readFileString(filePath), "abcdef")

          yield* file.seek(-2, "current")
          yield* writeUsingWrite(file, encoder.encode("WXYZ"))
          assert.strictEqual(yield* fs.readFileString(filePath), "abcdWXYZ")

          yield* file.seek(2, "start")
          yield* writeUsingWrite(file, encoder.encode("!!"))
          yield* file.sync

          assert.strictEqual((yield* file.stat).size, FileSystem.Size(8))
          assert.strictEqual(yield* fs.readFileString(filePath), "ab!!WXYZ")
        }))

      it.effect("should append primitive writes when a handle uses the append flag", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const filePath = path("append-write.txt")
          yield* fs.writeFileString(filePath, "seed")
          const file = yield* fs.open(filePath, { flag: "a+" })

          yield* file.seek(0, "start")
          yield* writeUsingWrite(file, encoder.encode("xy"))

          assert.strictEqual(yield* fs.readFileString(filePath), "seedxy")
        }))

      it.effect("should truncate and extend files when using a file handle", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const filePath = path("handle-truncate.txt")
          yield* fs.writeFileString(filePath, "abcdef")
          const file = yield* fs.open(filePath, { flag: "r+" })

          yield* file.truncate(3)
          assert.strictEqual((yield* file.stat).size, FileSystem.Size(3))
          assert.strictEqual(yield* fs.readFileString(filePath), "abc")

          yield* file.truncate(5)
          assert.strictEqual((yield* file.stat).size, FileSystem.Size(5))
          assert.deepStrictEqual(yield* fs.readFile(filePath), encoder.encode("abc\0\0"))
        }))

      it.effect("should return partial reads and EOF when reading beyond file contents", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const filePath = path("eof.txt")
          yield* fs.writeFileString(filePath, "abc")
          const file = yield* fs.open(filePath)

          const contents = yield* readAllocUpTo(file, 10)
          assert.strictEqual(decoder.decode(contents), "abc")
          assert.isTrue(Option.isNone(yield* file.readAlloc(1)))
        }))

      const openFlags = [
        { flag: "r", access: "read", existing: "seed", missing: "rejects", expectedContent: "seed" },
        { flag: "r+", access: "read-write", existing: "seed", missing: "rejects", expectedContent: "xeed" },
        { flag: "w", access: "write", existing: "", missing: "creates", expectedContent: "x" },
        { flag: "wx", access: "write", existing: "rejects", missing: "creates", expectedContent: "x" },
        { flag: "w+", access: "read-write", existing: "", missing: "creates", expectedContent: "x" },
        { flag: "wx+", access: "read-write", existing: "rejects", missing: "creates", expectedContent: "x" },
        { flag: "a", access: "write", existing: "seed", missing: "creates", expectedContent: "seedx" },
        { flag: "ax", access: "write", existing: "rejects", missing: "creates", expectedContent: "x" },
        { flag: "a+", access: "read-write", existing: "seed", missing: "creates", expectedContent: "seedx" },
        { flag: "ax+", access: "read-write", existing: "rejects", missing: "creates", expectedContent: "x" }
      ] as const

      it.effect.each(openFlags)(
        "supports the $flag open flag",
        ({ access, existing: existingBehavior, expectedContent, flag, missing }) =>
          Effect.gen(function*() {
            const { fs, path } = yield* makeTestContext
            const existing = path("existing.txt")
            const created = path("created.txt")
            yield* fs.writeFileString(existing, "seed")

            if (existingBehavior === "rejects") {
              const error = yield* Effect.flip(fs.open(existing, { flag }))
              assertSystemError(error, { tag: "AlreadyExists", method: "open", pathOrDescriptor: existing })
              assert.strictEqual(yield* fs.readFileString(existing), "seed")
            }

            if (missing === "rejects") {
              const error = yield* Effect.flip(fs.open(created, { flag }))
              assertSystemError(error, { tag: "NotFound", method: "open", pathOrDescriptor: created })
            }

            const filePath = existingBehavior === "rejects" ? created : existing
            const file = yield* fs.open(filePath, { flag })

            assert.strictEqual(
              yield* fs.readFileString(filePath),
              existingBehavior === "rejects" ? "" : existingBehavior
            )

            if (access !== "read") {
              yield* file.writeAll(encoder.encode("x"))
            } else {
              const error = yield* Effect.flip(file.writeAll(encoder.encode("x")))
              assertSystemError(error, { method: "writeAll" })
            }

            assert.strictEqual(yield* fs.readFileString(filePath), expectedContent)

            if (access !== "write") {
              yield* file.seek(0, "start")
              assert.strictEqual(decoder.decode(yield* readAllocUpTo(file, 1)), expectedContent.slice(0, 1))
            } else {
              const error = yield* Effect.flip(file.readAlloc(1))
              assertSystemError(error, { method: "readAlloc" })
            }

            if (existingBehavior !== "rejects" && missing === "creates") {
              yield* fs.open(created, { flag })
              assert.isTrue(yield* fs.exists(created))
            }
          })
      )

      it.effect("should reject traversal through a file when a child path targets it", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const parent = path("file.txt")
          const child = path("file.txt", "child.txt")
          yield* fs.writeFileString(parent, "content")

          const writeError = yield* Effect.flip(fs.writeFileString(child, "child"))
          assertSystemError(writeError, { tag: "BadResource", method: "writeFile", pathOrDescriptor: child })

          const statError = yield* Effect.flip(fs.stat(child))
          assertSystemError(statError, { tag: "BadResource", method: "stat", pathOrDescriptor: child })
          assert.strictEqual(yield* fs.readFileString(parent), "content")
        }))

      it.effect("should apply open flags consistently when high-level writes target existing and missing paths", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const cases = [
            { flag: "r", existing: "rejects", missing: "rejects" },
            { flag: "r+", existing: "xeed", missing: "rejects" },
            { flag: "w", existing: "x", missing: "x" },
            { flag: "wx", existing: "rejects", missing: "x" },
            { flag: "w+", existing: "x", missing: "x" },
            { flag: "wx+", existing: "rejects", missing: "x" },
            { flag: "a", existing: "seedx", missing: "x" },
            { flag: "ax", existing: "rejects", missing: "x" },
            { flag: "a+", existing: "seedx", missing: "x" },
            { flag: "ax+", existing: "rejects", missing: "x" }
          ] as const

          for (const { existing: expectedExisting, flag, missing: expectedMissing } of cases) {
            const existing = path(`${flag.replace("+", "plus")}-existing.txt`)
            const missing = path(`${flag.replace("+", "plus")}-missing.txt`)
            yield* fs.writeFileString(existing, "seed")

            const existingResult = yield* Effect.result(fs.writeFileString(existing, "x", { flag }))
            if (expectedExisting === "rejects") {
              assert.isTrue(Result.isFailure(existingResult))
              if (Result.isFailure(existingResult)) {
                assertSystemError(existingResult.failure, { method: "writeFile", pathOrDescriptor: existing })
              }
              assert.strictEqual(yield* fs.readFileString(existing), "seed")
            } else {
              assert.isTrue(Result.isSuccess(existingResult))
              assert.strictEqual(yield* fs.readFileString(existing), expectedExisting)
            }

            const missingResult = yield* Effect.result(fs.writeFileString(missing, "x", { flag }))
            if (expectedMissing === "rejects") {
              assert.isTrue(Result.isFailure(missingResult))
              if (Result.isFailure(missingResult)) {
                assertSystemError(missingResult.failure, {
                  tag: "NotFound",
                  method: "writeFile",
                  pathOrDescriptor: missing
                })
              }
            } else {
              assert.isTrue(Result.isSuccess(missingResult))
              assert.strictEqual(yield* fs.readFileString(missing), expectedMissing)
            }
          }
        }))
    })

    describe("open file state", () => {
      it.effect("should zero-fill gaps when sparse writes extend a file", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const filePath = path("sparse.bin")
          const file = yield* fs.open(filePath, { flag: "w+" })

          yield* file.seek(4, "start")
          yield* file.writeAll(new Uint8Array([42, 255]))

          assert.deepStrictEqual(yield* fs.readFile(filePath), new Uint8Array([0, 0, 0, 0, 42, 255]))
        }))

      it.effect("should keep open handles attached when their file is renamed", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const before = path("before.txt")
          const after = path("after.txt")
          yield* fs.writeFileString(before, "content")
          const file = yield* fs.open(before, { flag: "r+" })

          yield* fs.rename(before, after)
          yield* file.seek(0, "start")
          yield* file.writeAll(encoder.encode("renamed"))

          assert.isFalse(yield* fs.exists(before))
          assert.strictEqual(yield* fs.readFileString(after), "renamed")
        }))

      it.effect("should preserve both open handles when renaming over an existing destination", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const source = path("rename-source.txt")
          const destination = path("rename-destination.txt")
          yield* fs.writeFileString(source, "source")
          yield* fs.writeFileString(destination, "destination")
          const sourceHandle = yield* fs.open(source)
          const destinationHandle = yield* fs.open(destination)

          yield* fs.rename(source, destination)

          assert.isFalse(yield* fs.exists(source))
          assert.strictEqual(yield* fs.readFileString(destination), "source")
          assert.strictEqual(decoder.decode(yield* readAllocUpTo(sourceHandle, 6)), "source")
          assert.strictEqual(decoder.decode(yield* readAllocUpTo(destinationHandle, 11)), "destination")
        }))

      it.effect("should keep unlinked contents accessible when a file handle remains open", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const filePath = path("unlinked.txt")
          yield* fs.writeFileString(filePath, "content")
          const file = yield* fs.open(filePath, { flag: "r+" })

          yield* fs.remove(filePath)
          assert.isFalse(yield* fs.exists(filePath))
          assert.strictEqual(decoder.decode(yield* readAllocUpTo(file, 7)), "content")
          assert.strictEqual((yield* file.stat).size, FileSystem.Size(7))
        }))

      it.effect("should preserve the read cursor when appending through a handle", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const filePath = path("append-cursor.txt")
          const file = yield* fs.open(filePath, { flag: "a+" })

          yield* file.writeAll(encoder.encode("foo"))
          yield* file.seek(0, "start")
          yield* file.writeAll(encoder.encode("bar"))
          assert.strictEqual(decoder.decode(yield* readAllocUpTo(file, 3)), "foo")

          yield* file.writeAll(encoder.encode("baz"))
          assert.strictEqual(decoder.decode(yield* readAllocUpTo(file, 6)), "barbaz")
          assert.strictEqual(yield* fs.readFileString(filePath), "foobarbaz")
        }))

      it.effect("should return the resulting cursor when seeking", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const file = yield* fs.open(path("seek-cursor.txt"), { flag: "w+" })

          assert.strictEqual(yield* file.seek(6, "start"), FileSystem.Size(6))
          assert.strictEqual(yield* file.seek(-2, "current"), FileSystem.Size(4))
        }))

      it.effect("should preserve or clamp a file-handle cursor based on the truncated length", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const filePath = path("truncate-cursor.txt")
          const file = yield* fs.open(filePath, { flag: "w+" })
          yield* file.writeAll(encoder.encode("lorem ipsum dolor sit amet"))

          yield* file.seek(6, "start")
          yield* file.truncate(11)
          yield* file.writeAll(encoder.encode("!"))
          assert.strictEqual(yield* fs.readFileString(filePath), "lorem !psum")

          yield* file.truncate(5)
          yield* file.writeAll(encoder.encode("?"))
          assert.strictEqual(yield* fs.readFileString(filePath), "lorem?")
        }))

      it.effect("should read appended bytes from a cursor clamped by truncation", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const filePath = path("truncate-append-cursor.txt")
          const file = yield* fs.open(filePath, { flag: "w+" })

          yield* file.writeAll(encoder.encode("abcdefghij"))
          yield* file.truncate(5)
          yield* fs.writeFile(filePath, encoder.encode("xyz"), { flag: "a" })

          assert.strictEqual(decoder.decode(yield* readAllocUpTo(file, 3)), "xyz")
        }))
    })

    describe("copy and rename", () => {
      it.effect("should preserve existing destinations when source-based mutations fail", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const missing = path("missing")
          const copyDestination = path("copy-destination.txt")
          const renameDestination = path("rename-destination.txt")
          yield* fs.writeFileString(copyDestination, "copy destination")
          yield* fs.writeFileString(renameDestination, "rename destination")

          const copyError = yield* Effect.flip(fs.copy(missing, copyDestination, { overwrite: true }))
          assertSystemError(copyError, { tag: "NotFound", method: "copy", pathOrDescriptor: missing })
          const renameError = yield* Effect.flip(fs.rename(missing, renameDestination))
          assertSystemError(renameError, { tag: "NotFound", method: "rename", pathOrDescriptor: missing })

          assert.strictEqual(yield* fs.readFileString(copyDestination), "copy destination")
          assert.strictEqual(yield* fs.readFileString(renameDestination), "rename destination")
        }))

      it.effect("should replace existing file destinations when copying or renaming files", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const copySource = path("copy-source.txt")
          const copyDestination = path("copy-destination.txt")
          const renameSource = path("rename-source.txt")
          const renameDestination = path("rename-destination.txt")
          yield* fs.writeFileString(copySource, "copied")
          yield* fs.writeFileString(copyDestination, "old copy")
          yield* fs.writeFileString(renameSource, "renamed")
          yield* fs.writeFileString(renameDestination, "old rename")

          yield* fs.copyFile(copySource, copyDestination)
          yield* fs.rename(renameSource, renameDestination)

          assert.strictEqual(yield* fs.readFileString(copySource), "copied")
          assert.strictEqual(yield* fs.readFileString(copyDestination), "copied")
          assert.isFalse(yield* fs.exists(renameSource))
          assert.strictEqual(yield* fs.readFileString(renameDestination), "renamed")
        }))

      it.effect("should preserve existing destination links and handles when copying file contents", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const source = path("copy-source.txt")
          const destination = path("copy-destination.txt")
          const alias = path("copy-destination-alias.txt")
          yield* fs.writeFileString(source, "source")
          yield* fs.writeFileString(destination, "destination")
          yield* fs.link(destination, alias)
          const destinationHandle = yield* fs.open(destination)

          yield* fs.copyFile(source, destination)

          assert.strictEqual(yield* fs.readFileString(destination), "source")
          assert.strictEqual(yield* fs.readFileString(alias), "source")
          assert.strictEqual(decoder.decode(yield* readAllocUpTo(destinationHandle, 6)), "source")
        }))

      // TODO: Decide whether overwrite: false must succeed or fail with AlreadyExists across adapters.
      // Node skips an existing destination; Deno rejects it. Until aligned, require only that its contents are preserved.
      it.effect("should preserve an existing copy destination when overwrite is false", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const source = path("copy-source.txt")
          const destination = path("copy-existing.txt")
          yield* fs.writeFileString(source, "source")
          yield* fs.writeFileString(destination, "destination")

          const result = yield* Effect.result(fs.copy(source, destination, { overwrite: false }))
          if (Result.isFailure(result)) {
            assertSystemError(result.failure, {
              tag: "AlreadyExists",
              method: "copy",
              pathOrDescriptor: source
            })
          }

          assert.strictEqual(yield* fs.readFileString(source), "source")
          assert.strictEqual(yield* fs.readFileString(destination), "destination")
        }))
    })

    describe("temporary resource lifecycle", () => {
      it.effect("should create uniquely named temporary resources when prefixes and suffixes are requested", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const firstDirectory = yield* fs.makeTempDirectory({ directory: path(), prefix: "directory-" })
          const secondDirectory = yield* fs.makeTempDirectory({ directory: path(), prefix: "directory-" })
          const firstFile = yield* fs.makeTempFile({ directory: path(), prefix: "file-", suffix: ".txt" })
          const secondFile = yield* fs.makeTempFile({ directory: path(), prefix: "file-", suffix: ".txt" })

          assert.notStrictEqual(firstDirectory, secondDirectory)
          assert.notStrictEqual(firstFile, secondFile)
          assert.isTrue(firstDirectory.startsWith(path("directory-")))
          assert.isTrue(secondDirectory.startsWith(path("directory-")))
          assert.isTrue(firstFile.startsWith(path("file-")) && firstFile.endsWith(".txt"))
          assert.isTrue(secondFile.startsWith(path("file-")) && secondFile.endsWith(".txt"))
        }))

      it.effect("should clean up scoped temporary resources when their scope fails", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const result = yield* Effect.scoped(
            Effect.gen(function*() {
              const directory = yield* fs.makeTempDirectoryScoped({ directory: path(), prefix: "failed-" })
              yield* fs.writeFileString(`${directory}/file.txt`, "content")
              return yield* Effect.fail({ _tag: "ExpectedScopeFailure" as const, directory })
            })
          ).pipe(Effect.result)
          if (Result.isSuccess(result)) {
            return assert.fail("Expected the scoped operation to fail")
          }
          if (result.failure._tag === "PlatformError") {
            return yield* Effect.fail(result.failure)
          }
          const directory = result.failure.directory

          const error = yield* Effect.flip(fs.stat(directory))
          assertSystemError(error, { tag: "NotFound", method: "stat", pathOrDescriptor: directory })
        }))
    })

    describe("stream lifecycle", () => {
      it.effect("should stream no chunks when files are empty or offsets are beyond EOF", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const populated = path("populated.txt")
          const empty = path("empty.txt")
          yield* fs.writeFileString(populated, "content")
          yield* fs.writeFile(empty, new Uint8Array(0))

          const whole = yield* fs.stream(populated, { chunkSize: 2 }).pipe(Stream.runCollect)
          const emptyChunks = yield* fs.stream(empty).pipe(Stream.runCollect)
          const pastEnd = yield* fs.stream(populated, { offset: 20 }).pipe(Stream.runCollect)

          assert.strictEqual(whole.map((d) => decoder.decode(d)).join(""), "content")
          assert.strictEqual(emptyChunks.length, 0)
          assert.strictEqual(pastEnd.length, 0)
        }))

      it.effect("should preserve the original path when opening a file stream fails", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const missing = path("missing-stream.txt")

          const error = yield* fs.stream(missing).pipe(Stream.runDrain, Effect.flip)

          assertSystemError(error, { tag: "NotFound", method: "open", pathOrDescriptor: missing })
        }))

      // TODO: Signal handle acquisition with a Deferred in trackedFs.open, interrupt the blocked stream or sink,
      // and assert finalization. This is test work; no public synchronization hook is needed.
      it.effect("should finalize derived stream and sink handles when their operations succeed or fail", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const streamed = path("finalized-stream.txt")
          const sunk = path("finalized-sink.txt")
          const failed = path("failed-sink.txt")
          const finalized = yield* Ref.make<Array<string>>([])
          const trackedFs = FileSystem.make({
            ...fs,
            open: (path, options) =>
              Effect.acquireRelease(
                fs.open(path, options),
                () => Ref.update(finalized, (paths) => [...paths, path])
              )
          })
          yield* fs.writeFileString(streamed, "content")

          yield* trackedFs.stream(streamed).pipe(Stream.runDrain)
          yield* Stream.run(Stream.make(encoder.encode("content")), trackedFs.sink(sunk))
          const failedResult = yield* Stream.make(encoder.encode("content")).pipe(
            Stream.concat(Stream.fail("expected failure")),
            Stream.run(trackedFs.sink(failed)),
            Effect.result
          )

          assert.isTrue(Result.isFailure(failedResult))
          if (Result.isFailure(failedResult)) {
            assert.strictEqual(failedResult.failure, "expected failure")
          }
          assert.deepStrictEqual(yield* Ref.get(finalized), [streamed, sunk, failed])
        }))
    })

    describe("adapter capabilities", () => {
      it.effect("should normalize missing-path errors when primitive path operations fail", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const missing = path("missing-primitive")
          const destination = path("destination")
          const operations = [
            ["chmod", fs.chmod(missing, 0o600)],
            ["chown", fs.chown(missing, 0, 0)],
            ["copy", fs.copy(missing, destination)],
            ["copyFile", fs.copyFile(missing, destination)],
            ["link", fs.link(missing, destination)],
            ["readDirectory", fs.readDirectory(missing)],
            ["readLink", fs.readLink(missing)],
            ["realPath", fs.realPath(missing)],
            ["rename", fs.rename(missing, destination)],
            ["stat", fs.stat(missing)],
            ["truncate", fs.truncate(missing)],
            // TODO: Normalize Node's "utime" error method to "utimes" with a regression test and changeset,
            // then assert the method here. Deno and FileSystem.makeNoop already use "utimes".
            [undefined, fs.utimes(missing, 0, 0)]
          ] as const

          for (const [method, operation] of operations) {
            const error = yield* Effect.flip(operation)
            assertSystemError(error, { tag: "NotFound", method, pathOrDescriptor: missing })
          }
        }))

      // This covers accessible files and missing paths. Permission denial and virtual identity are adapter-specific.
      it.effect("should check readable and writable access when no virtual identity is available", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const existing = path("accessible.txt")
          const missing = path("inaccessible.txt")
          yield* fs.writeFileString(existing, "content")

          yield* fs.access(existing, { ok: true, readable: true, writable: true })
          const error = yield* Effect.flip(fs.access(missing, { ok: true, readable: true, writable: true }))

          assertSystemError(error, { tag: "NotFound", method: "access", pathOrDescriptor: missing })
        }))

      it.effect("should share contents and metadata when creating hard links", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const source = path("hard-link-source.txt")
          const linked = path("hard-link.txt")
          yield* fs.writeFileString(source, "source")

          yield* fs.link(source, linked)
          yield* fs.writeFileString(linked, "linked")

          assert.strictEqual(yield* fs.readFileString(source), "linked")
          const sourceInfo = yield* fs.stat(source)
          const linkedInfo = yield* fs.stat(linked)
          if (Option.isSome(sourceInfo.ino) && Option.isSome(linkedInfo.ino)) {
            assert.strictEqual(sourceInfo.ino.value, linkedInfo.ino.value)
          }
          if (Option.isSome(sourceInfo.nlink)) {
            assert.strictEqual(sourceInfo.nlink.value, 2)
          }
          if (Option.isSome(linkedInfo.nlink)) {
            assert.strictEqual(linkedInfo.nlink.value, 2)
          }
        }))

      it.effect("should preserve contents through remaining links and handles when hard links are removed", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const source = path("hard-link-lifecycle-source.txt")
          const alias = path("hard-link-lifecycle-alias.txt")
          yield* fs.writeFileString(source, "original")
          yield* fs.link(source, alias)
          const handle = yield* fs.open(source, { flag: "r+" })

          yield* fs.remove(source)

          assert.isFalse(yield* fs.exists(source))
          assert.strictEqual(yield* fs.readFileString(alias), "original")
          const linkedInfo = yield* fs.stat(alias)
          if (Option.isSome(linkedInfo.nlink)) {
            assert.strictEqual(linkedInfo.nlink.value, 1)
          }

          yield* fs.remove(alias)
          yield* fs.writeFileString(source, "replacement")
          yield* handle.seek(0, "start")
          yield* handle.writeAll(encoder.encode("retained"))

          assert.strictEqual(yield* fs.readFileString(source), "replacement")
          yield* handle.seek(0, "start")
          assert.strictEqual(decoder.decode(yield* readAllocUpTo(handle, 8)), "retained")
        }))

      it.effect("should resolve symbolic links when targets are relative or absolute", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const target = path("target.txt")
          const relativeLink = path("relative-link.txt")
          const absoluteLink = path("absolute-link.txt")
          yield* fs.writeFileString(target, "content")

          yield* fs.symlink("target.txt", relativeLink)
          yield* fs.symlink(target, absoluteLink)

          assert.strictEqual(yield* fs.readLink(relativeLink), "target.txt")
          assert.strictEqual(yield* fs.readLink(absoluteLink), target)
          assert.strictEqual(yield* fs.realPath(relativeLink), yield* fs.realPath(target))
          assert.strictEqual(yield* fs.realPath(absoluteLink), yield* fs.realPath(target))
          assert.strictEqual(yield* fs.readFileString(relativeLink), "content")
          assert.strictEqual(yield* fs.readFileString(absoluteLink), "content")
        }))

      it.effect("should preserve error context when symbolic links form a loop", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const first = path("first-link")
          const second = path("second-link")
          yield* fs.symlink("second-link", first)
          yield* fs.symlink("first-link", second)

          const error = yield* Effect.flip(fs.realPath(first))

          assertSystemError(error, { method: "realPath", pathOrDescriptor: first })
        }))

      // TODO: Add positive chmod/chown coverage gated by adapter and host support, including ownership privileges.
      // Deno already covers chmod through writeFile mode preservation; shared ownership-change coverage is still missing.

      it.effect("should report updated access and modification timestamps when metadata is available", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const file = path("times.txt")
          const atime = DateTime.toDateUtc(DateTime.makeUnsafe("2001-02-03T04:05:06.000Z"))
          const mtime = DateTime.toDateUtc(DateTime.makeUnsafe("2002-03-04T05:06:07.000Z"))
          yield* fs.writeFileString(file, "content")

          yield* fs.utimes(file, atime, mtime)
          const info = yield* fs.stat(file)

          if (Option.isSome(info.atime)) {
            assert.strictEqual(info.atime.value.getTime(), atime.getTime())
          }
          if (Option.isSome(info.mtime)) {
            assert.strictEqual(info.mtime.value.getTime(), mtime.getTime())
          }
        }))

      // TODO: Decide whether preserveTimestamps also guarantees atime. Keep mtime as the shared minimum until then.
      it.effect("should preserve the modification timestamp when copying with metadata preservation", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const source = path("timestamp-source.txt")
          const destination = path("timestamp-copy.txt")
          const atime = DateTime.toDateUtc(DateTime.makeUnsafe("2001-02-03T04:05:06.000Z"))
          const mtime = DateTime.toDateUtc(DateTime.makeUnsafe("2002-03-04T05:06:07.000Z"))
          yield* fs.writeFileString(source, "content")
          yield* fs.utimes(source, atime, mtime)

          yield* fs.copy(source, destination, { preserveTimestamps: true })
          const info = yield* fs.stat(destination)

          if (Option.isSome(info.mtime)) {
            assert.strictEqual(info.mtime.value.getTime(), mtime.getTime())
          }
        }))

      it.effect("should exclude matching entries when globbing from a root", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const root = path("glob")
          yield* fs.makeDirectory(`${root}/src`, { recursive: true })
          yield* fs.writeFileString(`${root}/src/index.ts`, "export {}")
          yield* fs.writeFileString(`${root}/src/index.test.ts`, "export {}")
          yield* fs.writeFileString(`${root}/src/readme.md`, "readme")

          const matches = (yield* fs.glob("**/*.ts", {
            root,
            exclude: ["**/*.test.ts"]
          })).map((entry) => entry.replaceAll("\\", "/")).sort()

          assert.strictEqual(matches.length, 1)
          assert.isTrue(matches[0].endsWith("src/index.ts"))
        }))

      // TODO: Add watcher readiness and cleanup coverage per adapter; Node's startWatch helper uses a sentinel event.
      // Specify portable event paths separately: Node emits filenames, while Deno forwards native event paths.
      // Do not require identical native event ordering to test cleanup.

      it.effect("should preserve error context when watching a missing path", () =>
        Effect.gen(function*() {
          const { fs, path } = yield* makeTestContext
          const missing = path("missing-watch")

          const error = yield* fs.watch(missing).pipe(Stream.runDrain, Effect.flip)

          assertSystemError(error, { tag: "NotFound", method: "stat", pathOrDescriptor: missing })
        }))
    })
  })

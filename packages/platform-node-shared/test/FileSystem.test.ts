import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as Fs from "@effect/platform/FileSystem"
import { assert, describe, expect, it } from "@effect/vitest"
import { pipe } from "effect"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Stream from "effect/Stream"

const runPromise = <E, A>(self: Effect.Effect<A, E, Fs.FileSystem>) =>
  Effect.runPromise(
    Effect.provide(self, NodeFileSystem.layer)
  )

describe("FileSystem", () => {
  it("readFile", () =>
    runPromise(Effect.gen(function*() {
      const fs = yield* Fs.FileSystem
      const data = yield* fs.readFile(`${__dirname}/fixtures/text.txt`)
      const text = new TextDecoder().decode(data)
      expect(text.trim()).toEqual("lorem ipsum dolar sit amet")
    })))

  it("makeTempDirectory", () =>
    runPromise(Effect.gen(function*() {
      const fs = yield* (Fs.FileSystem)
      let dir = ""
      yield* pipe(
        Effect.gen(function*() {
          dir = yield* fs.makeTempDirectory()
          const stat = yield* fs.stat(dir)
          expect(stat.type).toEqual("Directory")
        }),
        Effect.scoped
      )
      const stat = yield* fs.stat(dir)
      expect(stat.type).toEqual("Directory")
    })))

  it("makeTempDirectoryScoped", () =>
    runPromise(Effect.gen(function*() {
      const fs = yield* Fs.FileSystem
      let dir = ""
      yield* pipe(
        Effect.gen(function*() {
          dir = yield* fs.makeTempDirectoryScoped()
          const stat = yield* fs.stat(dir)
          expect(stat.type).toEqual("Directory")
        }),
        Effect.scoped
      )
      const error = yield* Effect.flip(fs.stat(dir))
      assert(error._tag === "SystemError" && error.reason === "NotFound")
    })))

  it("makeTempFile", () =>
    runPromise(Effect.gen(function*() {
      const fs = yield* (Fs.FileSystem)
      let file = ""
      yield* pipe(
        Effect.gen(function*() {
          file = yield* fs.makeTempFile({
            "suffix": ".txt"
          })
          expect(file.endsWith(".txt")).toBe(true)
          const stat = yield* fs.stat(file)
          expect(stat.type).toEqual("File")
        }),
        Effect.scoped
      )
      const stat = yield* fs.stat(file)
      expect(stat.type).toEqual("File")
    })))

  it("makeTempFileScoped", () =>
    runPromise(Effect.gen(function*() {
      const fs = yield* (Fs.FileSystem)
      let file = ""
      yield* pipe(
        Effect.gen(function*() {
          file = yield* fs.makeTempFileScoped({
            "suffix": ".txt"
          })
          expect(file.endsWith(".txt")).toBe(true)
          const stat = yield* fs.stat(file)
          expect(stat.type).toEqual("File")
        }),
        Effect.scoped
      )
      const error = yield* Effect.flip(fs.stat(file))
      assert(error._tag === "SystemError" && error.reason === "NotFound")
    })))

  it("truncate", () =>
    runPromise(Effect.gen(function*() {
      const fs = yield* Fs.FileSystem
      const file = yield* fs.makeTempFile()

      const text = "hello world"
      yield* fs.writeFile(file, new TextEncoder().encode(text))

      const before = yield* pipe(fs.readFile(file), Effect.map((_) => new TextDecoder().decode(_)))
      expect(before).toEqual(text)

      yield* fs.truncate(file)

      const after = yield* pipe(fs.readFile(file), Effect.map((_) => new TextDecoder().decode(_)))
      expect(after).toEqual("")
    })))

  it("should track the cursor position when reading", () =>
    runPromise(Effect.gen(function*() {
      const fs = yield* Fs.FileSystem

      yield* pipe(
        Effect.gen(function*() {
          let text: string
          const file = yield* fs.open(`${__dirname}/fixtures/text.txt`)

          text = yield* pipe(Effect.flatten(file.readAlloc(Fs.Size(5))), Effect.map((_) => new TextDecoder().decode(_)))
          expect(text).toBe("lorem")

          yield* file.seek(Fs.Size(7), "current")
          text = yield* pipe(Effect.flatten(file.readAlloc(Fs.Size(5))), Effect.map((_) => new TextDecoder().decode(_)))
          expect(text).toBe("dolar")

          yield* file.seek(Fs.Size(1), "current")
          text = yield* pipe(Effect.flatten(file.readAlloc(Fs.Size(8))), Effect.map((_) => new TextDecoder().decode(_)))
          expect(text).toBe("sit amet")

          yield* file.seek(Fs.Size(0), "start")
          text = yield* pipe(
            Effect.flatten(file.readAlloc(Fs.Size(11))),
            Effect.map((_) => new TextDecoder().decode(_))
          )
          expect(text).toBe("lorem ipsum")

          text = yield* pipe(
            fs.stream(`${__dirname}/fixtures/text.txt`, { offset: Fs.Size(6), bytesToRead: Fs.Size(5) }),
            Stream.map((_) => new TextDecoder().decode(_)),
            Stream.runCollect,
            Effect.map(Chunk.join(""))
          )
          expect(text).toBe("ipsum")
        }),
        Effect.scoped
      )
    })))

  it("should track the cursor position when writing", () =>
    runPromise(Effect.gen(function*() {
      const fs = yield* Fs.FileSystem

      yield* pipe(
        Effect.gen(function*() {
          let text: string
          const path = yield* fs.makeTempFileScoped()
          const file = yield* fs.open(path, { flag: "w+" })

          yield* file.write(new TextEncoder().encode("lorem ipsum"))
          yield* file.write(new TextEncoder().encode(" "))
          yield* file.write(new TextEncoder().encode("dolor sit amet"))
          text = yield* fs.readFileString(path)
          expect(text).toBe("lorem ipsum dolor sit amet")

          yield* file.seek(Fs.Size(-4), "current")
          yield* file.write(new TextEncoder().encode("hello world"))
          text = yield* fs.readFileString(path)
          expect(text).toBe("lorem ipsum dolor sit hello world")

          yield* file.seek(Fs.Size(6), "start")
          yield* file.write(new TextEncoder().encode("blabl"))
          text = yield* fs.readFileString(path)
          expect(text).toBe("lorem blabl dolor sit hello world")
        }),
        Effect.scoped
      )
    })))

  it("should maintain a read cursor in append mode", () =>
    runPromise(Effect.gen(function*() {
      const fs = yield* Fs.FileSystem

      yield* pipe(
        Effect.gen(function*() {
          let text: string
          const path = yield* fs.makeTempFileScoped()
          const file = yield* fs.open(path, { flag: "a+" })

          yield* file.write(new TextEncoder().encode("foo"))
          yield* file.seek(Fs.Size(0), "start")

          yield* file.write(new TextEncoder().encode("bar"))
          text = yield* fs.readFileString(path)
          expect(text).toBe("foobar")

          text = yield* pipe(Effect.flatten(file.readAlloc(Fs.Size(3))), Effect.map((_) => new TextDecoder().decode(_)))
          expect(text).toBe("foo")

          yield* file.write(new TextEncoder().encode("baz"))
          text = yield* fs.readFileString(path)
          expect(text).toBe("foobarbaz")

          text = yield* pipe(Effect.flatten(file.readAlloc(Fs.Size(6))), Effect.map((_) => new TextDecoder().decode(_)))
          expect(text).toBe("barbaz")
        }),
        Effect.scoped
      )
    })))

  it("should keep the current cursor if truncating doesn't affect it", () =>
    runPromise(Effect.gen(function*() {
      const fs = yield* Fs.FileSystem

      yield* pipe(
        Effect.gen(function*() {
          const path = yield* fs.makeTempFileScoped()
          const file = yield* fs.open(path, { flag: "w+" })

          yield* file.write(new TextEncoder().encode("lorem ipsum dolor sit amet"))
          yield* file.seek(Fs.Size(6), "start")
          yield* file.truncate(Fs.Size(11))

          const cursor = yield* file.seek(Fs.Size(0), "current")
          expect(cursor).toBe(Fs.Size(6))
        }),
        Effect.scoped
      )
    })))

  it("should update the current cursor if truncating affects it", () =>
    runPromise(Effect.gen(function*() {
      const fs = yield* Fs.FileSystem

      yield* pipe(
        Effect.gen(function*() {
          const path = yield* fs.makeTempFileScoped()
          const file = yield* fs.open(path, { flag: "w+" })

          yield* file.write(new TextEncoder().encode("lorem ipsum dolor sit amet"))
          yield* file.truncate(Fs.Size(11))

          const cursor = yield* file.seek(Fs.Size(0), "current")
          expect(cursor).toBe(Fs.Size(11))
        }),
        Effect.scoped
      )
    })))

  describe("watch", () => {
    // Simple test to verify watch API accepts recursive option
    it("should accept recursive option", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem

        yield* Effect.scoped(Effect.gen(function*() {
          const dir = yield* fs.makeTempDirectoryScoped()

          // Test that watch accepts no options
          const fiber1 = yield* fs.watch(dir).pipe(
            Stream.runDrain,
            Effect.fork
          )
          yield* Fiber.interrupt(fiber1)

          // Test that watch accepts recursive: true
          const fiber2 = yield* fs.watch(dir, { recursive: true }).pipe(
            Stream.runDrain,
            Effect.fork
          )
          yield* Fiber.interrupt(fiber2)

          // Test that watch accepts recursive: false
          const fiber3 = yield* fs.watch(dir, { recursive: false }).pipe(
            Stream.runDrain,
            Effect.fork
          )
          yield* Fiber.interrupt(fiber3)
        }))
      })))

    it("should watch file changes in a directory", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem

        yield* Effect.scoped(Effect.gen(function*() {
          const dir = yield* fs.makeTempDirectoryScoped()
          let eventCount = 0

          // Start watching the directory
          const fiber = yield* fs.watch(dir).pipe(
            Stream.tap((_event) =>
              Effect.sync(() => {
                eventCount++
              })
            ),
            Stream.runDrain,
            Effect.fork
          )

          // Wait for the watcher to initialize
          yield* Effect.sleep("500 millis")

          // Create a file - this should trigger an event
          const testFile = `${dir}/test.txt`
          yield* fs.writeFileString(testFile, "hello")

          // Wait for event to be processed
          yield* Effect.sleep("1000 millis")

          // We should have received at least one event
          expect(eventCount).toBeGreaterThan(0)

          yield* Fiber.interrupt(fiber)
        }))
      })))

    it("should watch file changes recursively in subdirectories", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem

        yield* Effect.scoped(Effect.gen(function*() {
          const dir = yield* fs.makeTempDirectoryScoped()
          let eventCount = 0

          // Create a subdirectory
          const subdir = `${dir}/subdir`
          yield* fs.makeDirectory(subdir)

          // Start watching with recursive option
          const fiber = yield* fs.watch(dir, { recursive: true }).pipe(
            Stream.tap((_event) =>
              Effect.sync(() => {
                eventCount++
              })
            ),
            Stream.runDrain,
            Effect.fork
          )

          // Wait for the watcher to initialize
          yield* Effect.sleep("500 millis")

          // Create a file in subdirectory - this should trigger an event
          const testFile = `${subdir}/test.txt`
          yield* fs.writeFileString(testFile, "hello from subdir")

          // Wait for event to be processed
          yield* Effect.sleep("1000 millis")

          // We should have received at least one event
          expect(eventCount).toBeGreaterThan(0)

          yield* Fiber.interrupt(fiber)
        }))
      })))

    it("should not watch subdirectories when recursive is false", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem

        yield* Effect.scoped(Effect.gen(function*() {
          const dir = yield* fs.makeTempDirectoryScoped()
          let rootEventCount = 0
          let subEventCount = 0

          // Create a subdirectory
          const subdir = `${dir}/subdir`
          yield* fs.makeDirectory(subdir)

          // Start watching WITHOUT recursive option (default is false)
          const fiber = yield* fs.watch(dir, { recursive: false }).pipe(
            Stream.tap((event) =>
              Effect.sync(() => {
                if (event.path.includes("root.txt")) {
                  rootEventCount++
                }
                if (event.path.includes("sub.txt")) {
                  subEventCount++
                }
              })
            ),
            Stream.runDrain,
            Effect.fork
          )

          // Wait for the watcher to initialize
          yield* Effect.sleep("500 millis")

          // Create a file in root directory - this SHOULD trigger an event
          const rootFile = `${dir}/root.txt`
          yield* fs.writeFileString(rootFile, "root file")

          // Create a file in subdirectory - this should NOT trigger an event
          const subFile = `${subdir}/sub.txt`
          yield* fs.writeFileString(subFile, "sub file")

          // Wait for events to be processed
          yield* Effect.sleep("1000 millis")

          // We should have received events for root file but not subdirectory file
          expect(rootEventCount).toBeGreaterThan(0)
          expect(subEventCount).toBe(0)

          yield* Fiber.interrupt(fiber)
        }))
      })))
  })
})

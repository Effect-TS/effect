import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as Fs from "@effect/platform/FileSystem"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import { assert, describe, expect, it } from "vitest"

const runPromise = <E, A>(self: Effect.Effect<A, E, Fs.FileSystem>) =>
  Effect.runPromise(
    Effect.provide(self, NodeFileSystem.layer)
  )

describe("FileSystem", () => {
  it("readFile", () =>
    runPromise(Effect.gen(function*(_) {
      const fs = yield* _(Fs.FileSystem)
      const data = yield* _(fs.readFile(`${__dirname}/fixtures/text.txt`))
      const text = new TextDecoder().decode(data)
      expect(text.trim()).toEqual("lorem ipsum dolar sit amet")
    })))

  it("makeTempDirectory", () =>
    runPromise(Effect.gen(function*(_) {
      const fs = yield* _(Fs.FileSystem)
      let dir = ""
      yield* _(
        Effect.gen(function*(_) {
          dir = yield* _(fs.makeTempDirectory())
          const stat = yield* _(fs.stat(dir))
          expect(stat.type).toEqual("Directory")
        }),
        Effect.scoped
      )
      const stat = yield* _(fs.stat(dir))
      expect(stat.type).toEqual("Directory")
    })))

  it("makeTempDirectoryScoped", () =>
    runPromise(Effect.gen(function*(_) {
      const fs = yield* _(Fs.FileSystem)
      let dir = ""
      yield* _(
        Effect.gen(function*(_) {
          dir = yield* _(fs.makeTempDirectoryScoped())
          const stat = yield* _(fs.stat(dir))
          expect(stat.type).toEqual("Directory")
        }),
        Effect.scoped
      )
      const error = yield* _(Effect.flip(fs.stat(dir)))
      assert(error._tag === "SystemError" && error.reason === "NotFound")
    })))

  it("truncate", () =>
    runPromise(Effect.gen(function*(_) {
      const fs = yield* _(Fs.FileSystem)
      const file = yield* _(fs.makeTempFile())

      const text = "hello world"
      yield* _(fs.writeFile(file, new TextEncoder().encode(text)))

      const before = yield* _(fs.readFile(file), Effect.map((_) => new TextDecoder().decode(_)))
      expect(before).toEqual(text)

      yield* _(fs.truncate(file))

      const after = yield* _(fs.readFile(file), Effect.map((_) => new TextDecoder().decode(_)))
      expect(after).toEqual("")
    })))

  it("should track the cursor position when reading", () =>
    runPromise(Effect.gen(function*(_) {
      const fs = yield* _(Fs.FileSystem)

      yield* _(
        Effect.gen(function*(_) {
          let text: string
          const file = yield* _(fs.open(`${__dirname}/fixtures/text.txt`))

          text = yield* _(Effect.flatten(file.readAlloc(Fs.Size(5))), Effect.map((_) => new TextDecoder().decode(_)))
          expect(text).toBe("lorem")

          yield* _(file.seek(Fs.Size(7), "current"))
          text = yield* _(Effect.flatten(file.readAlloc(Fs.Size(5))), Effect.map((_) => new TextDecoder().decode(_)))
          expect(text).toBe("dolar")

          yield* _(file.seek(Fs.Size(1), "current"))
          text = yield* _(Effect.flatten(file.readAlloc(Fs.Size(8))), Effect.map((_) => new TextDecoder().decode(_)))
          expect(text).toBe("sit amet")

          yield* _(file.seek(Fs.Size(0), "start"))
          text = yield* _(Effect.flatten(file.readAlloc(Fs.Size(11))), Effect.map((_) => new TextDecoder().decode(_)))
          expect(text).toBe("lorem ipsum")

          text = yield* _(
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
    runPromise(Effect.gen(function*(_) {
      const fs = yield* _(Fs.FileSystem)

      yield* _(
        Effect.gen(function*(_) {
          let text: string
          const path = yield* _(fs.makeTempFileScoped())
          const file = yield* _(fs.open(path, { flag: "w+" }))

          yield* _(file.write(new TextEncoder().encode("lorem ipsum")))
          yield* _(file.write(new TextEncoder().encode(" ")))
          yield* _(file.write(new TextEncoder().encode("dolor sit amet")))
          text = yield* _(fs.readFileString(path))
          expect(text).toBe("lorem ipsum dolor sit amet")

          yield* _(file.seek(Fs.Size(-4), "current"))
          yield* _(file.write(new TextEncoder().encode("hello world")))
          text = yield* _(fs.readFileString(path))
          expect(text).toBe("lorem ipsum dolor sit hello world")

          yield* _(file.seek(Fs.Size(6), "start"))
          yield* _(file.write(new TextEncoder().encode("blabl")))
          text = yield* _(fs.readFileString(path))
          expect(text).toBe("lorem blabl dolor sit hello world")
        }),
        Effect.scoped
      )
    })))

  it("should maintain a read cursor in append mode", () =>
    runPromise(Effect.gen(function*(_) {
      const fs = yield* _(Fs.FileSystem)

      yield* _(
        Effect.gen(function*(_) {
          let text: string
          const path = yield* _(fs.makeTempFileScoped())
          const file = yield* _(fs.open(path, { flag: "a+" }))

          yield* _(file.write(new TextEncoder().encode("foo")))
          yield* _(file.seek(Fs.Size(0), "start"))

          yield* _(file.write(new TextEncoder().encode("bar")))
          text = yield* _(fs.readFileString(path))
          expect(text).toBe("foobar")

          text = yield* _(Effect.flatten(file.readAlloc(Fs.Size(3))), Effect.map((_) => new TextDecoder().decode(_)))
          expect(text).toBe("foo")

          yield* _(file.write(new TextEncoder().encode("baz")))
          text = yield* _(fs.readFileString(path))
          expect(text).toBe("foobarbaz")

          text = yield* _(Effect.flatten(file.readAlloc(Fs.Size(6))), Effect.map((_) => new TextDecoder().decode(_)))
          expect(text).toBe("barbaz")
        }),
        Effect.scoped
      )
    })))

  it("should keep the current cursor if truncating doesn't affect it", () =>
    runPromise(Effect.gen(function*(_) {
      const fs = yield* _(Fs.FileSystem)

      yield* _(
        Effect.gen(function*(_) {
          const path = yield* _(fs.makeTempFileScoped())
          const file = yield* _(fs.open(path, { flag: "w+" }))

          yield* _(file.write(new TextEncoder().encode("lorem ipsum dolor sit amet")))
          yield* _(file.seek(Fs.Size(6), "start"))
          yield* _(file.truncate(Fs.Size(11)))

          const cursor = yield* _(file.seek(Fs.Size(0), "current"))
          expect(cursor).toBe(Fs.Size(6))
        }),
        Effect.scoped
      )
    })))

  it("should update the current cursor if truncating affects it", () =>
    runPromise(Effect.gen(function*(_) {
      const fs = yield* _(Fs.FileSystem)

      yield* _(
        Effect.gen(function*(_) {
          const path = yield* _(fs.makeTempFileScoped())
          const file = yield* _(fs.open(path, { flag: "w+" }))

          yield* _(file.write(new TextEncoder().encode("lorem ipsum dolor sit amet")))
          yield* _(file.truncate(Fs.Size(11)))

          const cursor = yield* _(file.seek(Fs.Size(0), "current"))
          expect(cursor).toBe(Fs.Size(11))
        }),
        Effect.scoped
      )
    })))
})

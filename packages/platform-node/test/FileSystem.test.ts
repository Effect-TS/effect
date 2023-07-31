import * as Effect from "@effect/io/Effect"
import * as Fs from "@effect/platform-node/FileSystem"

const runPromise = <E, A>(self: Effect.Effect<Fs.FileSystem, E, A>) =>
  Effect.runPromise(
    Effect.provideLayer(self, Fs.layer)
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
})

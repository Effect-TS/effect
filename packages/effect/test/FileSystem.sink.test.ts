import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Option, Stream } from "effect"

describe("FileSystem.sink", () => {
  const cases: ReadonlyArray<{
    readonly name: string
    readonly options: Parameters<FileSystem.FileSystem["sink"]>[1]
    readonly flag: FileSystem.OpenFlag
  }> = [
    { name: "control: omitted options", options: undefined, flag: "w" },
    { name: "control: empty options", options: {}, flag: "w" },
    { name: "control: mode only", options: { mode: 0o600 }, flag: "w" },
    { name: "control: explicit write", options: { flag: "w" }, flag: "w" },
    { name: "control: explicit append", options: { flag: "a", mode: 0o640 }, flag: "a" },
    { name: "regression: undefined flag", options: { flag: undefined }, flag: "w" },
    { name: "regression: undefined flag with mode", options: { flag: undefined, mode: 0o600 }, flag: "w" }
  ]

  for (const { flag, name, options } of cases) {
    it.effect(name, () =>
      Effect.gen(function*() {
        const opened: Array<{
          readonly path: string
          readonly options: Parameters<FileSystem.FileSystem["open"]>[1]
        }> = []
        const written: Array<Uint8Array> = []
        let closed = 0
        const file: FileSystem.File = {
          [FileSystem.FileTypeId]: FileSystem.FileTypeId,
          stat: Effect.die("unused"),
          sync: Effect.void,
          seek: () => Effect.succeed(FileSystem.Size(0)),
          read: () => Effect.succeed(FileSystem.Size(0)),
          readAlloc: () => Effect.succeed(Option.none()),
          truncate: () => Effect.void,
          write: (buffer) => Effect.succeed(FileSystem.Size(buffer.length)),
          writeAll: (buffer) =>
            Effect.sync(() => {
              written.push(buffer)
            })
        }
        const fs = FileSystem.make({
          ...FileSystem.makeNoop({}),
          open: (path, options) =>
            Effect.acquireRelease(
              Effect.sync(() => {
                opened.push({ path, options })
                return file
              }),
              () =>
                Effect.sync(() => {
                  closed++
                })
            )
        })
        const chunks = [new Uint8Array([1, 2]), new Uint8Array([3])]
        const sink = options === undefined ? fs.sink("output.bin") : fs.sink("output.bin", options)
        yield* Stream.run(Stream.fromIterable(chunks), sink)

        assert.strictEqual(opened.length, 1)
        assert.strictEqual(opened[0].path, "output.bin")
        assert.strictEqual(opened[0].options?.mode, options?.mode)
        assert.deepStrictEqual(written, chunks)
        assert.strictEqual(closed, 1)
        assert.strictEqual(opened[0].options?.flag, flag)
      }))
  }
})

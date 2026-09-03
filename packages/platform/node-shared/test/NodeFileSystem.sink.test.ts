import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, FileSystem, Stream } from "effect"

describe("NodeFileSystem.sink", () => {
  const cases: ReadonlyArray<{
    readonly name: string
    readonly options: Parameters<FileSystem.FileSystem["sink"]>[1]
  }> = [
    { name: "control: omitted options", options: undefined },
    { name: "control: empty options", options: {} },
    { name: "control: mode only", options: { mode: 0o600 } },
    { name: "control: explicit write", options: { flag: "w" } },
    { name: "control: explicit append", options: { flag: "a", mode: 0o600 } },
    { name: "regression: undefined flag", options: { flag: undefined } },
    { name: "regression: undefined flag with mode", options: { flag: undefined, mode: 0o600 } }
  ]

  for (const existing of [false, true]) {
    for (const { name, options } of cases) {
      it.effect(`${name}, ${existing ? "existing" : "new"} file`, () =>
        Effect.gen(function*() {
          const fs = yield* FileSystem.FileSystem
          const directory = yield* fs.makeTempDirectoryScoped({ prefix: "audit-s7-sink-" })
          const path = `${directory}/output.txt`
          if (existing) {
            yield* fs.writeFileString(path, "original")
          }
          const sink = options === undefined ? fs.sink(path) : fs.sink(path, options)
          const result = yield* Stream.run(Stream.make(new TextEncoder().encode("new")), sink).pipe(Effect.exit)

          assert(Exit.isSuccess(result), Exit.isFailure(result) ? Cause.pretty(result.cause) : "")
          const expected = existing && options?.flag === "a" ? "originalnew" : "new"
          assert.strictEqual(yield* fs.readFileString(path), expected)
        }).pipe(Effect.provide(NodeFileSystem.layer)))
    }
  }
})

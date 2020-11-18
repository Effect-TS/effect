import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import { globalTracingEnabled } from "../src/Tracing"

globalTracingEnabled.set(true)

describe("Tracing", () => {
  it("should trace", async () => {
    const a = await pipe(
      T.succeed(0),
      T.map((n) => n + 1),
      T.map((n) => n + 1),
      T.map((n) => n + 1),
      T.chain((n) =>
        T.tuple(
          T.succeed(n),
          pipe(
            T.executionTraces,
            T.map((s) =>
              s.map((t) => {
                const parts = t.file.split("/")
                return `(${t.op}) ${parts[parts.length - 1]}`
              })
            )
          )
        )
      ),
      T.runPromise
    )

    expect(a).toEqual([
      3,
      [
        "(map) tracing.test.ts:11:9",
        "(map) tracing.test.ts:12:9",
        "(map) tracing.test.ts:13:9",
        "(chain) tracing.test.ts:14:9",
        "(chain_) zipWith_.ts:14:10",
        "(map) zipWith_.ts:14:28",
        "(chain_) zipWith_.ts:14:10"
      ]
    ])
  })
  it("should only keep 2 traces", async () => {
    const a = await pipe(
      T.succeed(0),
      T.map((n) => n + 1),
      T.map((n) => n + 1),
      T.map((n) => n + 1),
      T.andThen(T.executionTraces),
      T.map((s) =>
        s.map((t) => {
          const parts = t.file.split("/")
          return `(${t.op}) ${parts[parts.length - 1]}`
        })
      ),
      T.tracedN(2),
      T.runPromise
    )

    expect(a).toEqual(["(map) tracing.test.ts:49:9", "(andThen) tracing.test.ts:50:9"])
  })
  it("should not trace", async () => {
    const a = await pipe(
      T.succeed(0),
      T.map((n) => n + 1),
      T.map((n) => n + 1),
      T.map((n) => n + 1),
      T.chain((n) =>
        T.tuple(
          T.succeed(n),
          pipe(
            T.executionTraces,
            T.map((s) =>
              s.map((t) => {
                const parts = t.file.split("/")
                return `(${t.op}) ${parts[parts.length - 1]}`
              })
            )
          )
        )
      ),
      T.untraced,
      T.runPromise
    )
    expect(a).toEqual([3, []])
  })
})

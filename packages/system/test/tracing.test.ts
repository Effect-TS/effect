import * as T from "../src/Effect"
import { pipe } from "../src/Function"

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
        "(Effect/map) tracing.test.ts:8:9",
        "(Effect/map) tracing.test.ts:9:9",
        "(Effect/map) tracing.test.ts:10:9",
        "(Effect/chain) tracing.test.ts:11:9",
        "(Effect/tuple) tracing.test.ts:12:11"
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

    expect(a).toEqual([
      "(Effect/map) tracing.test.ts:44:9",
      "(Effect/andThen) tracing.test.ts:45:9"
    ])
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
  it("should trace foreach", async () => {
    const a = await pipe(
      [0, 1, 2],
      T.foreach((n) => T.succeed(n + 1)),
      T.andThen(T.executionTraces),
      T.map((s) =>
        s.map((t) => {
          const parts = t.file.split("/")
          return `(${t.op}) ${parts[parts.length - 1]}`
        })
      ),
      T.runPromise
    )

    expect(a).toEqual([
      "(Effect/foreach) tracing.test.ts:89:9",
      "(Effect/andThen) tracing.test.ts:90:9"
    ])
  })
  it("should trace foreachPar", async () => {
    const a = await pipe(
      [0, 1, 2],
      T.foreachPar((n) => T.succeed(n + 1)),
      T.andThen(T.executionTraces),
      T.map((s) =>
        s.map((t) => {
          const parts = t.file.split("/")
          return `(${t.op}) ${parts[parts.length - 1]}`
        })
      ),
      T.runPromise
    )

    expect(a).toEqual([
      "(Effect/foreachPar) tracing.test.ts:108:9",
      "(Effect/andThen) tracing.test.ts:109:9"
    ])
  })
  it("should trace foreachParN", async () => {
    const a = await pipe(
      [0, 1, 2],
      T.foreachParN(2, (n) => T.succeed(n + 1)),
      T.andThen(T.executionTraces),
      T.map((s) =>
        s.map((t) => {
          const parts = t.file.split("/")
          return `(${t.op}) ${parts[parts.length - 1]}`
        })
      ),
      T.runPromise
    )

    expect(a).toEqual([
      "(Effect/foreachParN) tracing.test.ts:127:9",
      "(Effect/andThen) tracing.test.ts:128:9"
    ])
  })
})

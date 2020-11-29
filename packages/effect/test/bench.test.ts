import { defaultRuntime, QIO } from "@qio/core"

import * as T from "../src/Effect"
import { makeCustomRuntime } from "../src/Effect"
import * as F from "../src/Fiber"

function fibEffect(n: number): T.UIO<number> {
  if (n < 2) {
    return T.succeed(1)
  }
  return T.zipWith_(
    T.suspend(() => fibEffect(n - 1)),
    T.suspend(() => fibEffect(n - 2)),
    (a, b) => a + b
  )
}
function fibQIO(n: number): QIO<number> {
  if (n < 2) {
    return QIO.resolve(0)
  }
  // access to avoid ending up in the sync optimization that lead to stack explosion
  // mimic the same ops as fibEffect
  return QIO.accessM(() => fibQIO(n - 1)).zipWith(
    QIO.accessM(() => fibQIO(n - 2)),
    (x, y) => x + y
  )
}
async function fibPromise(n: number): Promise<number> {
  if (n < 2) {
    return 1
  }
  const a = await fibPromise(n - 1)
  const b = await fibPromise(n - 2)
  return a + b
}
function fibEffectGen(n: number): T.UIO<number> {
  if (n < 2) {
    return T.succeed(1)
  }
  return T.gen(function* (_) {
    const x = yield* _(fibEffectGen(n - 1))
    const y = yield* _(fibEffectGen(n - 2))
    return x + y
  })
}

const qioRuntime = defaultRuntime()

const runtime = makeCustomRuntime()
  .traceEffect(false)
  .traceExecution(false)
  .traceExecutionLength(0)
  .traceStack(false)
  .traceStackLength(0)
  .ancestorExecutionTraceLength(0)
  .ancestorStackTraceLength(0)
  .ancestryLength(0)

describe("Bench", () => {
  describe("Target", () => {
    it("promise", async () => {
      for (let i = 0; i < 1000; i++) {
        await fibPromise(10)
      }
    })
    it("qio", async () => {
      for (let i = 0; i < 1000; i++) {
        await qioRuntime.unsafeExecutePromise(fibQIO(10))
      }
    })
  })
  describe("With Tracing", () => {
    it("effect", () => T.runPromise(T.repeatN(1000)(fibEffect(10))))
    it("effect-fork-in", () =>
      T.runPromise(F.join(runtime.runFiber(T.repeatN(1000)(fibEffect(10))))))
    it("effect-gen", () =>
      T.runPromise(
        T.gen(function* (_) {
          for (let i = 0; i < 1000; i++) {
            yield* _(fibEffect(10))
          }
        })
      ))
    it("effect-gen-2", () =>
      T.runPromise(
        T.gen(function* (_) {
          for (let i = 0; i < 1000; i++) {
            yield* _(fibEffectGen(10))
          }
        })
      ))
  })
  describe("With Untraced", () => {
    it("effect", () => T.runPromise(T.untraced(T.repeatN(1000)(fibEffect(10)))))
    it("effect-gen", () =>
      T.runPromise(
        T.untraced(
          T.gen(function* (_) {
            for (let i = 0; i < 1000; i++) {
              yield* _(fibEffect(10))
            }
          })
        )
      ))
    it("effect-gen-2", () =>
      T.runPromise(
        T.untraced(
          T.gen(function* (_) {
            for (let i = 0; i < 1000; i++) {
              yield* _(fibEffectGen(10))
            }
          })
        )
      ))
  })
  describe("Without Tracing", () => {
    it("effect", () => runtime.runPromise(T.repeatN(1000)(fibEffect(10))))
    it("effect-gen", () =>
      runtime.runPromise(
        T.gen(function* (_) {
          for (let i = 0; i < 1000; i++) {
            yield* _(fibEffect(10))
          }
        })
      ))
    it("effect-gen-2", () =>
      runtime.runPromise(
        T.gen(function* (_) {
          for (let i = 0; i < 1000; i++) {
            yield* _(fibEffectGen(10))
          }
        })
      ))
  })
})

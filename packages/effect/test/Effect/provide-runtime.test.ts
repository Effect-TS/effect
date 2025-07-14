import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as RuntimeFlags from "effect/RuntimeFlags"
import * as Scope from "effect/Scope"

interface A {
  readonly value: number
}
const A = Context.GenericTag<A>("A")
const LiveA = Layer.succeed(A, { value: 1 })
const ref = FiberRef.unsafeMake(0)
const LiveEnv = Layer.mergeAll(
  LiveA,
  RuntimeFlags.enableOpSupervision,
  Layer.scopedDiscard(Effect.locallyScoped(ref, 2))
)

describe("Effect", () => {
  it.effect("provideSomeRuntime doesn't break env", () => {
    const someServiceImpl = {
      value: 42
    } as const
    interface SomeService {
      readonly _: unique symbol
    }
    const SomeService = Context.GenericTag<SomeService, typeof someServiceImpl>("SomeService")
    return Effect.gen(function*() {
      const rt = yield* pipe(Layer.succeedContext(Context.empty()), Layer.toRuntime)
      const pre = yield* Effect.context<never>()
      yield* Effect.provide(Effect.void, rt)
      const post = yield* Effect.context<never>()
      assertTrue(Equal.equals(pre, post))
    }).pipe(
      Effect.scoped,
      Effect.provide(Layer.succeed(SomeService, someServiceImpl))
    )
  })
  it("provideSomeRuntime", async () => {
    const { runtime, scope } = await Effect.runPromise(
      Effect.flatMap(Scope.make(), (scope) =>
        Effect.map(
          Scope.extend(Layer.toRuntime(LiveEnv), scope),
          (runtime) => ({ runtime, scope })
        ))
    )

    const all = await Effect.runPromise(Effect.all(
      [
        Effect.provide(
          Effect.gen(function*() {
            const a = yield* FiberRef.get(ref)
            const b = yield* A
            const c = RuntimeFlags.isEnabled(yield* Effect.getRuntimeFlags, RuntimeFlags.OpSupervision)
            return { a, b, c }
          }),
          runtime
        ),
        Effect.gen(function*() {
          const a = yield* FiberRef.get(ref)
          const c = RuntimeFlags.isEnabled(yield* Effect.getRuntimeFlags, RuntimeFlags.OpSupervision)
          return { a, c }
        })
      ]
    ))

    await Effect.runPromise(Scope.close(scope, Exit.void))

    strictEqual(all[0].a, 2)
    deepStrictEqual(all[0].b, { value: 1 })
    assertTrue(all[0].c)
    strictEqual(all[1].a, 0)
    assertFalse(all[1].c)
  })
})

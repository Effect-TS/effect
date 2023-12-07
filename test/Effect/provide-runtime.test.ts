import * as it from "effect-test/utils/extend"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import * as Layer from "effect/Layer"
import * as RuntimeFlags from "effect/RuntimeFlags"
import * as Scope from "effect/Scope"
import { assert, describe } from "vitest"

interface A {
  readonly value: number
}
const A = Context.Tag<A>()
const LiveA = Layer.succeed(A, { value: 1 })
const ref = FiberRef.unsafeMake(0)
const LiveEnv = Layer.mergeAll(
  LiveA,
  RuntimeFlags.enableOpSupervision,
  Layer.scopedDiscard(Effect.locallyScoped(ref, 2))
)

describe.concurrent("Effect", () => {
  it.effect("provideSomeRuntime doesn't break env", () => {
    const someServiceImpl = {
      value: 42
    } as const
    interface SomeService {
      readonly _: unique symbol
    }
    const SomeService = Context.Tag<SomeService, typeof someServiceImpl>()
    return Effect.gen(function*(_) {
      const rt = yield* _(Layer.succeedContext(Context.empty()), Layer.toRuntime)
      const pre = yield* _(Effect.context<never>())
      yield* _(Effect.provide(Effect.unit, rt))
      const post = yield* _(Effect.context<never>())
      assert.isTrue(Equal.equals(pre, post))
    }).pipe(
      Effect.scoped,
      Effect.provide(Layer.succeed(SomeService, someServiceImpl))
    )
  })
  it.it("provideSomeRuntime", async () => {
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
          Effect.gen(function*($) {
            const a = yield* $(FiberRef.get(ref))
            const b = yield* $(A)
            const c = RuntimeFlags.isEnabled(yield* $(Effect.getRuntimeFlags), RuntimeFlags.OpSupervision)
            return { a, b, c }
          }),
          runtime
        ),
        Effect.gen(function*($) {
          const a = yield* $(FiberRef.get(ref))
          const c = RuntimeFlags.isEnabled(yield* $(Effect.getRuntimeFlags), RuntimeFlags.OpSupervision)
          return { a, c }
        })
      ]
    ))

    await Effect.runPromise(Scope.close(scope, Exit.unit))

    assert.deepStrictEqual(all[0].a, 2)
    assert.deepStrictEqual(all[0].b, { value: 1 })
    assert.deepStrictEqual(all[0].c, true)
    assert.deepStrictEqual(all[1].a, 0)
    assert.deepStrictEqual(all[1].c, false)
  })
})

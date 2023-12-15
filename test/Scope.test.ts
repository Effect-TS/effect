import * as it from "effect-test/utils/extend"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import { identity, pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Scope from "effect/Scope"
import { assert, describe, expect } from "vitest"

type Action = Acquire | Use | Release

const OP_ACQUIRE = 0 as const
type OP_ACQUIRE = typeof OP_ACQUIRE

const OP_USE = 1 as const
type OP_USE = typeof OP_USE

const OP_RELEASE = 2 as const
type OP_RELEASE = typeof OP_RELEASE

interface Acquire {
  readonly op: OP_ACQUIRE
  readonly id: number
}

interface Use {
  readonly op: OP_USE
  readonly id: number
}

interface Release {
  readonly op: OP_RELEASE
  readonly id: number
}

const acquire = (id: number): Action => ({ op: OP_ACQUIRE, id })
const use = (id: number): Action => ({ op: OP_USE, id })
const release = (id: number): Action => ({ op: OP_RELEASE, id })
const isAcquire = (self: Action): self is Use => self.op === OP_ACQUIRE
const isUse = (self: Action): self is Use => self.op === OP_USE
const isRelease = (self: Action): self is Use => self.op === OP_RELEASE

const resource = (id: number, ref: Ref.Ref<ReadonlyArray<Action>>): Effect.Effect<Scope.Scope, never, number> => {
  return pipe(
    Ref.update(ref, (actions) => [...actions, acquire(id)]),
    Effect.as(id),
    Effect.uninterruptible,
    Effect.ensuring(
      Effect.scopeWith((scope) => scope.addFinalizer(() => Ref.update(ref, (actions) => [...actions, release(id)])))
    )
  )
}

describe("Scope", () => {
  it.effect("runs finalizers when the scope is closed", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make<ReadonlyArray<Action>>([]))
      yield* $(Effect.scoped(pipe(
        resource(1, ref),
        Effect.flatMap((id) => Ref.update(ref, (actions) => [...actions, use(id)]))
      )))
      const result = yield* $(Ref.get(ref))
      assert.deepStrictEqual(result, [acquire(1), use(1), release(1)])
    }))
  it.effect("runs finalizers in parallel", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, void>())
      const result = yield* $(
        Effect.addFinalizer(() => Deferred.succeed(deferred, void 0)),
        Effect.zipRight(Effect.addFinalizer(() => Deferred.await(deferred)), { concurrent: true }),
        Effect.scoped,
        Effect.asUnit
      )
      assert.isUndefined(result)
    }))
  it.effect("runs finalizers in parallel when the scope is closed", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make<ReadonlyArray<Action>>([]))
      yield* $(
        Effect.scoped(
          pipe(
            Effect.parallelFinalizers(resource(1, ref)),
            Effect.zip(resource(2, ref), { concurrent: true }),
            Effect.flatMap(([resource1, resource2]) =>
              pipe(
                Ref.update(ref, (actions) => [...actions, use(resource1)]),
                Effect.zip(Ref.update(ref, (actions) => [...actions, use(resource2)]), { concurrent: true })
              )
            )
          )
        )
      )
      const result = yield* $(Ref.get(ref))
      assert.isTrue(result.slice(0, 2).some((action) => isAcquire(action) && action.id === 1))
      assert.isTrue(result.slice(0, 2).some((action) => isAcquire(action) && action.id === 2))
      assert.isTrue(result.slice(2, 4).some((action) => isUse(action) && action.id === 1))
      assert.isTrue(result.slice(2, 4).some((action) => isUse(action) && action.id === 2))
      assert.isTrue(result.slice(4, 6).some((action) => isRelease(action) && action.id === 1))
      assert.isTrue(result.slice(4, 6).some((action) => isRelease(action) && action.id === 2))
    }))
  it.effect("preserves order of nested sequential finalizers", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make<ReadonlyArray<Action>>([]))
      const left = Effect.sequentialFinalizers(pipe(resource(1, ref), Effect.zipRight(resource(2, ref))))
      const right = Effect.sequentialFinalizers(pipe(resource(3, ref), Effect.zipRight(resource(4, ref))))
      yield* $(Effect.scoped(Effect.parallelFinalizers(pipe(left, Effect.zip(right, { concurrent: true })))))
      const actions = yield* $(Ref.get(ref))
      const action1Index = actions.findIndex((action) => action.op === OP_RELEASE && action.id === 1)
      const action2Index = actions.findIndex((action) => action.op === OP_RELEASE && action.id === 2)
      const action3Index = actions.findIndex((action) => action.op === OP_RELEASE && action.id === 3)
      const action4Index = actions.findIndex((action) => action.op === OP_RELEASE && action.id === 4)
      assert.isBelow(action2Index, action1Index)
      assert.isBelow(action4Index, action3Index)
    }))
  it.scoped("withEarlyRelease", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make<ReadonlyArray<Action>>([]))
      const left = resource(1, ref)
      const right = Effect.withEarlyRelease(resource(2, ref))
      yield* $(left, Effect.zipRight(pipe(right, Effect.flatMap(([release, _]) => release))))
      const actions = yield* $(Ref.get(ref))
      assert.deepStrictEqual(actions[0], acquire(1))
      assert.deepStrictEqual(actions[1], acquire(2))
      assert.deepStrictEqual(actions[2], release(2))
    }))
  it.effect("using", () =>
    Effect.gen(function*($) {
      const ref1 = yield* $(Ref.make<ReadonlyArray<Action>>([]))
      const ref2 = yield* $(Ref.make<ReadonlyArray<Action>>([]))
      yield* $(
        resource(1, ref1),
        Effect.using(() =>
          pipe(Ref.update(ref1, (actions) => [...actions, use(1)]), Effect.zipRight(resource(2, ref2)))
        ),
        Effect.zipRight(Ref.update(ref2, (actions) => [...actions, use(2)])),
        Effect.scoped
      )
      const actions1 = yield* $(Ref.get(ref1))
      const actions2 = yield* $(Ref.get(ref2))
      assert.deepStrictEqual(actions1, [acquire(1), use(1), release(1)])
      assert.deepStrictEqual(actions2, [acquire(2), use(2), release(2)])
    }))
  it.effect(
    ".pipe",
    () =>
      Effect.gen(function*(_) {
        const scope = yield* _(Scope.make())
        expect(scope.pipe(identity)).toBe(scope)
      })
  )
})

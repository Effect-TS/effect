import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, FiberHandle, FiberMap, Option, Ref, Scope } from "effect"

interface Options {
  readonly onlyIfMissing?: boolean
  readonly propagateInterruption?: boolean
}

type Form = "set data-first" | "set data-last" | "setUnsafe data-first" | "setUnsafe data-last"

interface Registration {
  readonly set: (form: Form, fiber: Fiber.Fiber<never>, options?: Options) => Effect.Effect<void>
  readonly get: Effect.Effect<Option.Option<Fiber.Fiber<never>>>
  readonly join: Effect.Effect<void>
}

const containers: ReadonlyArray<{
  readonly name: string
  readonly make: Effect.Effect<Registration, never, Scope.Scope>
}> = [
  {
    name: "FiberHandle",
    make: Effect.gen(function*() {
      const handle = yield* FiberHandle.make<never, never>()
      return {
        set: (form, fiber, options) => {
          switch (form) {
            case "set data-first":
              return FiberHandle.set(handle, fiber, options)
            case "set data-last":
              return handle.pipe(FiberHandle.set(fiber, options))
            case "setUnsafe data-first":
              return Effect.sync(() => FiberHandle.setUnsafe(handle, fiber, options))
            case "setUnsafe data-last":
              return Effect.sync(() => handle.pipe(FiberHandle.setUnsafe(fiber, options)))
          }
        },
        get: FiberHandle.get(handle),
        join: FiberHandle.join(handle)
      }
    })
  },
  {
    name: "FiberMap",
    make: Effect.gen(function*() {
      const map = yield* FiberMap.make<string, never, never>()
      return {
        set: (form, fiber, options) => {
          switch (form) {
            case "set data-first":
              return FiberMap.set(map, "key", fiber, options)
            case "set data-last":
              return map.pipe(FiberMap.set("key", fiber, options))
            case "setUnsafe data-first":
              return Effect.sync(() => FiberMap.setUnsafe(map, "key", fiber, options))
            case "setUnsafe data-last":
              return Effect.sync(() => map.pipe(FiberMap.setUnsafe("key", fiber, options)))
          }
        },
        get: FiberMap.get(map, "key"),
        join: FiberMap.join(map)
      }
    })
  }
]

const forms: ReadonlyArray<Form> = ["set data-first", "set data-last", "setUnsafe data-first", "setUnsafe data-last"]
const duplicateOptions: ReadonlyArray<{ readonly name: string; readonly options?: Options }> = [
  { name: "omitted" },
  { name: "false", options: { onlyIfMissing: false } },
  { name: "true", options: { onlyIfMissing: true } }
]

const makeWorker = Effect.gen(function*() {
  const ready = yield* Deferred.make<void>()
  const cleanups = yield* Ref.make(0)
  const fiber = yield* Effect.forkScoped(
    Deferred.succeed(ready, undefined).pipe(
      Effect.andThen(Effect.never),
      Effect.ensuring(Ref.update(cleanups, (n) => n + 1))
    ),
    // Return only after the worker suspends, not while readiness resumes its caller.
    { startImmediately: true }
  )
  yield* Deferred.await(ready)
  return { fiber, cleanups }
})

const open = (make: Effect.Effect<Registration, never, Scope.Scope>) =>
  Effect.gen(function*() {
    const scope = yield* Scope.make()
    yield* Effect.addFinalizer((exit) => Scope.close(scope, exit))
    const registration = yield* make.pipe(Scope.provide(scope))
    return { ...registration, close: Scope.close(scope, Exit.void) }
  })

const snapshot = (registration: Registration, worker: Effect.Success<typeof makeWorker>) =>
  Effect.gen(function*() {
    return {
      current: Option.exists(yield* registration.get, (fiber) => fiber === worker.fiber),
      pending: worker.fiber.pollUnsafe() === undefined,
      cleanups: yield* Ref.get(worker.cleanups)
    }
  })

const running = { current: true, pending: true, cleanups: 0 }
const stopped = { current: false, pending: false, cleanups: 1 }

describe("same-fiber registration", () => {
  for (const container of containers) {
    describe(container.name, () => {
      for (const form of forms) {
        describe(form, () => {
          for (const duplicate of duplicateOptions) {
            it.effect(`same fiber with onlyIfMissing ${duplicate.name} stays owned until scope close`, () =>
              Effect.gen(function*() {
                const registration = yield* open(container.make)
                const worker = yield* makeWorker
                yield* registration.set(form, worker.fiber)
                yield* registration.set(form, worker.fiber, duplicate.options)
                const first = yield* snapshot(registration, worker)
                yield* registration.set(form, worker.fiber, duplicate.options)
                const second = yield* snapshot(registration, worker)
                yield* registration.close
                const after = yield* snapshot(registration, worker)
                const exit = yield* Fiber.await(worker.fiber)
                assert.deepStrictEqual({ first, second, after, interrupted: Exit.hasInterrupts(exit) }, {
                  first: running,
                  second: running,
                  after: stopped,
                  interrupted: true
                })
              }))
          }

          it.effect("different candidate with onlyIfMissing true is rejected and current is retained", () =>
            Effect.gen(function*() {
              const registration = yield* open(container.make)
              const current = yield* makeWorker
              const candidate = yield* makeWorker
              yield* registration.set(form, current.fiber)
              yield* registration.set(form, candidate.fiber, { onlyIfMissing: true })
              const rejected = yield* Fiber.await(candidate.fiber)
              const before = yield* snapshot(registration, current)
              const candidateBefore = yield* snapshot(registration, candidate)
              yield* registration.close
              assert.deepStrictEqual({
                before,
                candidateBefore,
                after: yield* snapshot(registration, current),
                candidateAfter: yield* snapshot(registration, candidate),
                rejected: Exit.hasInterrupts(rejected)
              }, { before: running, candidateBefore: stopped, after: stopped, candidateAfter: stopped, rejected: true })
            }))

          it.effect("empty container accepts onlyIfMissing true", () =>
            Effect.gen(function*() {
              const registration = yield* open(container.make)
              const worker = yield* makeWorker
              yield* registration.set(form, worker.fiber, { onlyIfMissing: true })
              const before = yield* snapshot(registration, worker)
              yield* registration.close
              assert.deepStrictEqual({ before, after: yield* snapshot(registration, worker) }, {
                before: running,
                after: stopped
              })
            }))

          it.effect("ordinary replacement interrupts old fiber and owns replacement", () =>
            Effect.gen(function*() {
              const registration = yield* open(container.make)
              const previous = yield* makeWorker
              const replacement = yield* makeWorker
              yield* registration.set(form, previous.fiber)
              yield* registration.set(form, replacement.fiber)
              const oldExit = yield* Fiber.await(previous.fiber)
              const before = yield* snapshot(registration, replacement)
              const oldBefore = yield* snapshot(registration, previous)
              yield* registration.close
              assert.deepStrictEqual({
                before,
                oldBefore,
                after: yield* snapshot(registration, replacement),
                oldAfter: yield* snapshot(registration, previous),
                interrupted: Exit.hasInterrupts(oldExit)
              }, { before: running, oldBefore: stopped, after: stopped, oldAfter: stopped, interrupted: true })
            }))

          it.effect("closed container interrupts a new candidate with onlyIfMissing true", () =>
            Effect.gen(function*() {
              const registration = yield* open(container.make)
              yield* registration.close
              const worker = yield* makeWorker
              yield* registration.set(form, worker.fiber, { onlyIfMissing: true })
              const exit = yield* Fiber.await(worker.fiber)
              yield* registration.close
              assert.deepStrictEqual({
                after: yield* snapshot(registration, worker),
                interrupted: Exit.hasInterrupts(exit)
              }, {
                after: stopped,
                interrupted: true
              })
            }))

          for (const propagateInterruption of [false, true]) {
            it.effect(`same-fiber onlyIfMissing true preserves original propagateInterruption ${propagateInterruption}`, () =>
              Effect.gen(function*() {
                const registration = yield* open(container.make)
                const worker = yield* makeWorker
                yield* registration.set(form, worker.fiber, { propagateInterruption })
                yield* registration.set(form, worker.fiber, {
                  onlyIfMissing: true,
                  propagateInterruption: !propagateInterruption
                })
                const before = yield* snapshot(registration, worker)
                yield* Fiber.interrupt(worker.fiber)
                yield* registration.close
                const joinExit = yield* Effect.exit(registration.join)
                assert.deepStrictEqual({
                  before,
                  after: yield* snapshot(registration, worker),
                  joinedSuccessfully: Exit.isSuccess(joinExit),
                  joinedWithInterruption: Exit.hasInterrupts(joinExit)
                }, {
                  before: running,
                  after: stopped,
                  joinedSuccessfully: !propagateInterruption,
                  joinedWithInterruption: propagateInterruption
                })
              }))
          }
        })
      }
    })
  }
})

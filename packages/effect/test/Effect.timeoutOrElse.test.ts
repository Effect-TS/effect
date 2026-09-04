import { assert, describe, it } from "@effect/vitest"
import { Context, Deferred, Duration, Effect, Exit, Fiber, Option, Ref, References, Result } from "effect"

describe("timeoutOrElse ordering", () => {
  const forms = ["data-first", "pipe"] as const
  const durations: ReadonlyArray<readonly [string, Duration.Input]> = [
    ["zero number", 0],
    ["zero Duration", Duration.zero],
    ["zero string", "0 millis"],
    ["finite Duration", Duration.millis(1)]
  ]

  for (const form of forms) {
    for (const [label, duration] of durations) {
      it.live(`${form}: factory and body follow cleanup, replay, ${label}`, () =>
        Effect.gen(function*() {
          let stopped = false
          let factories = 0
          let bodies = 0
          const order: Array<string> = []
          const value = { fallback: true }
          const source = Effect.never.pipe(Effect.ensuring(Effect.sync(() => {
            stopped = true
            order.push("stopped")
          })))
          const options = {
            duration,
            orElse: () => {
              factories++
              order.push(`factory:${stopped}`)
              return Effect.sync(() => {
                bodies++
                order.push(`body:${stopped}`)
                return value
              })
            }
          }
          const program = form === "data-first"
            ? Effect.timeoutOrElse(source, options)
            : source.pipe(Effect.timeoutOrElse(options))
          const before = [factories, bodies]
          const first = yield* program
          const firstStopped = stopped
          stopped = false
          const second = yield* program
          assert.deepStrictEqual({
            before,
            factories,
            bodies,
            firstStopped,
            stopped,
            identity: [first === value, second === value],
            order
          }, {
            before: [0, 0],
            factories: 2,
            bodies: 2,
            firstStopped: true,
            stopped: true,
            identity: [true, true],
            order: ["stopped", "factory:true", "body:true", "stopped", "factory:true", "body:true"]
          })
        }))
    }
  }

  it.live("control: timeout then outside catch runs factory and body after cleanup", () =>
    Effect.gen(function*() {
      let stopped = false
      const order: Array<string> = []
      const value = { fallback: true }
      const result = yield* Effect.never.pipe(
        Effect.ensuring(Effect.sync(() => {
          stopped = true
          order.push("stopped")
        })),
        Effect.timeout(0),
        Effect.catchTag("TimeoutError", () => {
          order.push(`factory:${stopped}`)
          return Effect.sync(() => {
            order.push(`body:${stopped}`)
            return value
          })
        })
      )
      assert.deepStrictEqual([stopped, result === value, order], [true, true, ["stopped", "factory:true", "body:true"]])
    }))

  it.live("control: timeoutOption completes the same source shutdown barrier", () =>
    Effect.gen(function*() {
      let stopped = false
      const order: Array<string> = []
      const result = yield* Effect.never.pipe(
        Effect.ensuring(Effect.sync(() => {
          stopped = true
          order.push("stopped")
        })),
        Effect.timeoutOption(0),
        Effect.map((option) => {
          order.push(`continuation:${stopped}`)
          return option
        })
      )
      assert.deepStrictEqual([result, stopped, order], [Option.none(), true, ["stopped", "continuation:true"]])
    }))

  const values: ReadonlyArray<readonly [string, unknown]> = [
    ["object", { source: true }],
    ["Some", Option.some(1)],
    ["None", Option.none()],
    ["undefined", undefined],
    ["zero", 0],
    ["false", false]
  ]
  for (const form of forms) {
    for (const [label, value] of values) {
      for (const [time, duration] of [["zero", Duration.zero], ["infinity", Duration.infinity]] as const) {
        it.live(`control: ${form} source ${label} with ${time} is not a timeout`, () =>
          Effect.gen(function*() {
            let calls = 0
            const options = {
              duration,
              orElse: () => {
                calls++
                return Effect.succeed("unexpected fallback")
              }
            }
            const source = Effect.succeed(value)
            const result = yield* form === "data-first"
              ? Effect.timeoutOrElse(source, options)
              : source.pipe(Effect.timeoutOrElse(options))
            assert.deepStrictEqual([result === value, calls], [true, 0])
          }))
      }
    }
  }

  for (const [label, duration] of [["zero", 0], ["infinity", Duration.infinity]] as const) {
    for (const kind of ["error", "defect"] as const) {
      it.live(`control: source ${kind} with ${label} skips fallback and retains identity`, () =>
        Effect.gen(function*() {
          const error = { kind }
          let calls = 0
          const exit = yield* Effect.exit(
            Effect.timeoutOrElse(kind === "error" ? Effect.fail(error) : Effect.die(error), {
              duration,
              orElse: () => {
                calls++
                return Effect.succeed("unexpected fallback")
              }
            })
          )
          const found = kind === "error" ? Exit.findError(exit) : Exit.findDefect(exit)
          assert.deepStrictEqual([Result.isSuccess(found) && found.success === error, calls], [true, 0])
        }))
    }
  }

  for (const kind of ["error", "defect"] as const) {
    it.live(`fallback ${kind} factory and body follow cleanup and retain identity`, () =>
      Effect.gen(function*() {
        const error = { kind }
        let stopped = false
        const order: Array<string> = []
        const exit = yield* Effect.exit(Effect.never.pipe(
          Effect.ensuring(Effect.sync(() => {
            stopped = true
            order.push("stopped")
          })),
          Effect.timeoutOrElse({
            duration: 0,
            orElse: () => {
              order.push(`factory:${stopped}`)
              return Effect.suspend(() => {
                order.push(`body:${stopped}`)
                return kind === "error" ? Effect.fail(error) : Effect.die(error)
              })
            }
          })
        ))
        const found = kind === "error" ? Exit.findError(exit) : Exit.findDefect(exit)
        assert.deepStrictEqual([Result.isSuccess(found) && found.success === error, stopped, order], [
          true,
          true,
          ["stopped", "factory:true", "body:true"]
        ])
      }))
  }

  it.live("control: thrown fallback factory remains the same defect", () =>
    Effect.gen(function*() {
      const error = new Error("fallback factory")
      const exit = yield* Effect.exit(Effect.timeoutOrElse(Effect.never, {
        duration: 0,
        orElse: (): Effect.Effect<never> => {
          throw error
        }
      }))
      const found = Exit.findDefect(exit)
      assert.isTrue(Result.isSuccess(found) && found.success === error)
    }))

  it.live("slow fallback cannot let the original source win after timeout", () =>
    Effect.gen(function*() {
      const sourceGate = yield* Deferred.make<void>()
      const sourceStopped = yield* Deferred.make<void>()
      const fallbackStarted = yield* Deferred.make<void>()
      const fallbackRelease = yield* Deferred.make<void>()
      const sourceCompleted = yield* Ref.make(false)
      const value = { fallback: true }
      let fallbackInterrupted = false
      const source = Deferred.await(sourceGate).pipe(
        Effect.andThen(Ref.set(sourceCompleted, true)),
        Effect.as({ source: true }),
        Effect.ensuring(Deferred.succeed(sourceStopped, undefined))
      )
      const fiber = yield* Effect.timeoutOrElse(source, {
        duration: 0,
        orElse: () =>
          Deferred.succeed(fallbackStarted, undefined).pipe(
            Effect.andThen(Deferred.await(fallbackRelease)),
            Effect.as(value),
            Effect.onInterrupt(() =>
              Effect.sync(() => {
                fallbackInterrupted = true
              })
            )
          )
      }).pipe(Effect.forkChild)
      yield* Deferred.await(fallbackStarted)
      yield* Deferred.succeed(sourceGate, undefined)
      yield* Deferred.await(sourceStopped)
      const completed = yield* Ref.get(sourceCompleted)
      // If the source completed, keep the fallback blocked until the race returns.
      // Otherwise shutdown already won; release the selected fallback explicitly.
      if (!completed) yield* Deferred.succeed(fallbackRelease, undefined)
      const result = yield* Fiber.join(fiber)
      assert.deepStrictEqual([result === value, completed, fallbackInterrupted], [true, false, false])
    }))

  class SourceService extends Context.Service<SourceService, { source: string }>()("timeout-test/SourceService") {}
  class FallbackService
    extends Context.Service<FallbackService, { fallback: string }>()("timeout-test/FallbackService")
  {}
  const Local = Context.Reference<string>("timeout-test/Local", { defaultValue: () => "default" })

  it.live("control: source and fallback inherit public services, references, span and annotations", () =>
    Effect.gen(function*() {
      const sourceService = { source: "source service" }
      const fallbackService = { fallback: "fallback service" }
      const observed: Array<unknown> = []
      const result = yield* Effect.gen(function*() {
        const callerId = yield* Effect.fiberId
        const parentSpan = yield* Effect.currentSpan
        let sourceId: number | undefined
        const source = Effect.gen(function*() {
          sourceId = yield* Effect.fiberId
          observed.push(
            (yield* SourceService) === sourceService,
            yield* Local,
            (yield* Effect.currentSpan) === parentSpan
          )
          return yield* Effect.never
        }).pipe(Effect.provideService(Local, "source-local"))
        const value = yield* Effect.timeoutOrElse(source, {
          duration: 0,
          orElse: () =>
            Effect.gen(function*() {
              const fallbackId = yield* Effect.fiberId
              const annotations = yield* References.CurrentLogAnnotations
              observed.push(yield* Local, (yield* Effect.currentSpan) === parentSpan, annotations["request"])
              // Observational evidence only: no public fiber-identity guarantee is asserted.
              console.info(
                "timeoutOrElse fiber-hop",
                JSON.stringify({ sourceId, callerId, fallbackId, fallbackInCaller: callerId === fallbackId })
              )
              return yield* FallbackService
            })
        })
        observed.push(yield* Local, (yield* Effect.currentSpan) === parentSpan)
        return value
      }).pipe(
        Effect.provideService(SourceService, sourceService),
        Effect.provideService(FallbackService, fallbackService),
        Effect.provideService(Local, "parent-local"),
        Effect.annotateLogs({ request: "request-value" }),
        Effect.withSpan("timeout-parent")
      )
      assert.deepStrictEqual([result === fallbackService, observed], [true, [
        true,
        "source-local",
        true,
        "parent-local",
        true,
        "request-value",
        "parent-local",
        true
      ]])
    }))

  it.live("control: external interruption still stops a pending fallback", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      let sourceStopped = false
      let fallbackStopped = false
      let calls = 0
      const fiber = yield* Effect.never.pipe(
        Effect.ensuring(Effect.sync(() => {
          sourceStopped = true
        })),
        Effect.timeoutOrElse({
          duration: 0,
          orElse: () => {
            calls++
            return Deferred.succeed(started, undefined).pipe(
              Effect.andThen(Effect.never),
              Effect.ensuring(Effect.sync(() => {
                fallbackStopped = true
              }))
            )
          }
        }),
        Effect.forkChild
      )
      yield* Deferred.await(started)
      yield* Fiber.interrupt(fiber)
      const exit = yield* Fiber.await(fiber)
      assert.deepStrictEqual([Exit.hasInterrupts(exit), sourceStopped, fallbackStopped, calls], [true, true, true, 1])
    }))
})

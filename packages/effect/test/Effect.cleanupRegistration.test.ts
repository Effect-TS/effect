import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Exit, Fiber, Option, Tracer } from "effect"
import { afterEach, beforeEach } from "vitest"

// Private proof instrumentation records executed assertions, including failures.
let assertions: Array<string> = []
beforeEach(() => {
  assertions = []
})
afterEach((context) => {
  console.log("R10_ASSERTIONS", JSON.stringify({ test: context.task.name, assertions }))
})
const equal = (actual: unknown, expected: unknown, identity: string) => {
  assertions.push(identity)
  assert.strictEqual(actual, expected, identity)
}

type Mode = "direct throw" | "suspended throw" | "returned die" | "success" | "typed failure"
const modes: ReadonlyArray<Mode> = ["direct throw", "suspended throw", "returned die", "success", "typed failure"]

const outcome = (mode: Mode, value: object, error: object, defect: Error): Effect.Effect<object, object> => {
  switch (mode) {
    case "direct throw":
      throw defect
    case "suspended throw":
      return Effect.suspend(() => {
        throw defect
      })
    case "returned die":
      return Effect.die(defect)
    case "success":
      return Effect.succeed(value)
    case "typed failure":
      return Effect.fail(error)
  }
}

const checkExit = (exit: Exit.Exit<unknown, unknown>, mode: Mode, value: object, error: object, defect: Error) => {
  equal(exit._tag, mode === "success" ? "Success" : "Failure", "exit classification")
  if (Exit.isSuccess(exit)) {
    equal(exit.value, value, "success identity")
  } else {
    equal(exit.cause.reasons.length, 1, "one reason")
    const reason = exit.cause.reasons[0]
    equal(reason._tag, mode === "typed failure" ? "Fail" : "Die", "reason classification")
    if (reason._tag === "Die") equal(reason.defect, defect, "defect identity")
    if (reason._tag === "Fail") equal(reason.error, error, "error identity")
  }
}

class CountingSpan extends Tracer.NativeSpan {
  ends = 0
  override end(time: bigint, exit: Exit.Exit<unknown, unknown>): void {
    this.ends++
    super.end(time, exit)
  }
}

describe("cleanup registration", () => {
  for (const mode of modes) {
    it.effect(`acquireUseRelease ${mode}`, () =>
      Effect.gen(function*() {
        const resource = { resource: "synthetic" }
        const value = { value: "synthetic" }
        const error = { error: "synthetic" }
        const defect = new Error("synthetic callback defect")
        const parent = Tracer.externalSpan({ spanId: "parent", traceId: "trace" })
        const releases: Array<{ resource: object; exit: Exit.Exit<object, object> }> = []
        let acquired = 0
        let used = 0
        const program = Effect.withFiber((fiber) => {
          const context = fiber.context
          return Effect.acquireUseRelease(
            Effect.sync(() => {
              acquired++
              return resource
            }),
            (received): Effect.Effect<object, object> => {
              used++
              equal(received, resource, "use resource identity")
              equal(Fiber.getCurrent(), fiber, "use same fiber")
              equal(Fiber.getCurrent()?.context, context, "use same context")
              equal(
                Option.getOrUndefined(Context.getOption(fiber.context, Tracer.ParentSpan)),
                parent,
                "use surrounding parent"
              )
              return outcome(mode, value, error, defect)
            },
            (received, exit) =>
              Effect.sync(() => {
                equal(Fiber.getCurrent(), fiber, "release same fiber")
                releases.push({ resource: received, exit })
              })
          )
        }).pipe(Effect.withParentSpan(parent))
        equal(acquired, 0, "lazy acquisition")
        equal(used, 0, "lazy use")
        equal(releases.length, 0, "lazy release")
        for (let run = 0; run < 2; run++) {
          const exit = yield* Effect.exit(program)
          checkExit(exit, mode, value, error, defect)
        }
        equal(acquired, 2, "acquire replay count")
        equal(used, 2, "use replay count")
        equal(releases.length, 2, "one release per execution")
        for (const release of releases) {
          equal(release.resource, resource, "release resource identity")
          checkExit(release.exit, mode, value, error, defect)
        }
      }))
  }

  it.effect("acquireUseRelease failed acquisition skips use and cleanup", () =>
    Effect.gen(function*() {
      const error = { acquisition: "failed" }
      let used = 0
      let released = 0
      const exit = yield* Effect.exit(Effect.acquireUseRelease(
        Effect.fail(error),
        () => {
          used++
          return Effect.void
        },
        () => {
          released++
          return Effect.void
        }
      ))
      checkExit(exit, "typed failure", {}, error, new Error("unused"))
      equal(used, 0, "failed acquire no use")
      equal(released, 0, "failed acquire no release")
    }))

  it.effect("acquireUseRelease returned release failure", () =>
    Effect.gen(function*() {
      const error = { release: "failed" }
      const resource = { resource: "synthetic" }
      let releases = 0
      const exit = yield* Effect.exit(Effect.acquireUseRelease(
        Effect.succeed(resource),
        () => Effect.succeed(resource),
        (received, used) => {
          releases++
          equal(received, resource, "failed release resource identity")
          equal(Exit.isSuccess(used) && used.value, resource, "failed release observes success")
          return Effect.fail(error)
        }
      ))
      checkExit(exit, "typed failure", {}, error, new Error("unused"))
      equal(releases, 1, "failed release once")
    }))

  for (const form of ["plain", "options"]) {
    for (const mode of modes) {
      it.effect(`useSpan ${form} ${mode}`, () =>
        Effect.gen(function*() {
          const value = { value: "synthetic" }
          const error = { error: "synthetic" }
          const defect = new Error("synthetic span callback defect")
          const parent = Tracer.externalSpan({ spanId: "parent", traceId: "trace" })
          const explicitParent = Tracer.externalSpan({ spanId: "explicit", traceId: "trace" })
          const spans: Array<CountingSpan> = []
          const seen: Array<Tracer.Span> = []
          const tracer = Tracer.make({
            span: (options) => {
              const span = new CountingSpan(options)
              spans.push(span)
              return span
            }
          })
          let used = 0
          const program = Effect.withFiber((fiber) => {
            const context = fiber.context
            const evaluate = (span: Tracer.Span): Effect.Effect<object, object> => {
              used++
              seen.push(span)
              equal(Fiber.getCurrent(), fiber, "span callback same fiber")
              equal(Fiber.getCurrent()?.context, context, "span callback same context")
              equal(
                Option.getOrUndefined(Context.getOption(fiber.context, Tracer.ParentSpan)),
                parent,
                "span not installed as parent"
              )
              return outcome(mode, value, error, defect)
            }
            return form === "plain"
              ? Effect.useSpan("synthetic-operation", evaluate)
              : Effect.useSpan("synthetic-operation", {
                parent: explicitParent,
                kind: "client",
                attributes: { synthetic: value },
                links: [{ span: parent, attributes: {} }],
                sampled: true
              }, evaluate)
          }).pipe(Effect.withTracer(tracer), Effect.withTracerTiming(false), Effect.withParentSpan(parent))
          equal(spans.length, 0, "lazy span creation")
          equal(used, 0, "lazy span callback")
          for (let run = 0; run < 2; run++) {
            const exit = yield* Effect.exit(program)
            checkExit(exit, mode, value, error, defect)
          }
          equal(spans.length, 2, "span replay creation count")
          equal(used, 2, "span replay callback count")
          equal(spans[0] === spans[1], false, "fresh span per evaluation")
          for (let index = 0; index < spans.length; index++) {
            const span = spans[index]
            equal(seen[index], span, "callback span identity")
            equal(span.name, "synthetic-operation", "span name")
            equal(Option.getOrUndefined(span.parent), form === "plain" ? parent : explicitParent, "span parent option")
            equal(span.startTime, 0n, "disabled start timing")
            if (form === "options") {
              equal(span.kind, "client", "span kind")
              equal(span.attributes.get("synthetic"), value, "span attribute identity")
              equal(span.links[0].span, parent, "span link identity")
              equal(span.sampled, true, "span sampled")
            }
            equal(span.ends, 1, "one span end per execution")
            equal(span.status._tag, "Ended", "span ended")
            if (span.status._tag === "Ended") {
              equal(span.status.endTime, 0n, "disabled end timing")
              checkExit(span.status.exit, mode, value, error, defect)
            }
          }
        }))
    }
  }

  it.effect("useSpan manually ended span is not ended again", () =>
    Effect.gen(function*() {
      const tracer = Tracer.make({ span: (options) => new CountingSpan(options) })
      const span = yield* Effect.useSpan("manually-ended", (span) => {
        span.end(123n, Exit.void)
        return Effect.succeed(span)
      }).pipe(Effect.withTracer(tracer))
      equal(span instanceof CountingSpan, true, "real counting span")
      if (span instanceof CountingSpan) equal(span.ends, 1, "manual end once")
      equal(span.status._tag, "Ended", "manual ended")
      if (span.status._tag === "Ended") equal(span.status.endTime, 123n, "manual end time retained")
    }))

  it.effect("useSpan without surrounding parent does not install one", () =>
    Effect.gen(function*() {
      yield* Effect.useSpan("no-parent", () =>
        Effect.gen(function*() {
          const parent = yield* Effect.currentParentSpan.pipe(Effect.option)
          equal(Option.isNone(parent), true, "no parent installed")
        }))
    }))
})

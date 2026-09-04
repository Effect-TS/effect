import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, Layer, Option, References, Scope, Tracer } from "effect"

const location = "synthetic-layer-call.ts:73:11"
const suppliedStack = `at constructLayer (${location})`
const modes = ["default", "false", "supplier"] as const
const forms = ["data-first", "data-last"] as const
const wrappers = ["withSpan", "withParentSpan"] as const

describe("Layer trace options", () => {
  for (const wrapper of wrappers) {
    for (const form of forms) {
      for (const mode of modes) {
        const name = `${wrapper} ${form} ${mode}`

        it.effect(`${name} public frame and laziness`, () =>
          Effect.gen(function*() {
            let calls = 0
            const options = mode === "default" ? undefined : {
              captureStackTrace: mode === "false" ? false : () => {
                calls++
                return suppliedStack
              }
            }
            const Captured = Context.Service<References.StackFrame | undefined>(`frame/${name}`)
            const acquire = Layer.effect(Captured, References.CurrentStackFrame)
            const parent = yield* Effect.makeSpan(name)
            const layer = wrapper === "withSpan"
              ? form === "data-first"
                ? Layer.withSpan(acquire, name, options)
                : acquire.pipe(Layer.withSpan(name, options))
              : form === "data-first"
              ? Layer.withParentSpan(acquire, parent, options)
              : acquire.pipe(Layer.withParentSpan(parent, options))
            assert.strictEqual(calls, 0)
            const frame = yield* Effect.provide(Captured, layer)
            assert.strictEqual(calls, 0)
            assert.isDefined(frame)
            assert.strictEqual(frame!.name, name)
            const stack = frame!.stack()
            if (mode === "default") {
              assert.isString(stack)
              assert.isAbove(stack!.length, 0)
            } else {
              assert.strictEqual(stack, mode === "false" ? undefined : suppliedStack)
            }
            assert.strictEqual(calls, mode === "supplier" ? 1 : 0)
          }))

        it.effect(`${name} failed acquisition diagnostic`, () =>
          Effect.gen(function*() {
            let calls = 0
            let acquisitionFrame: References.StackFrame | undefined
            const options = mode === "default" ? undefined : {
              captureStackTrace: mode === "false" ? false : () => {
                calls++
                return suppliedStack
              }
            }
            const Failure = Context.Service<never>(`failure/${name}`)
            const error = new Error("ordinary layer acquisition failed")
            const acquire = Layer.effect(
              Failure,
              Effect.gen(function*() {
                acquisitionFrame = yield* References.CurrentStackFrame
                return yield* Effect.fail(error)
              })
            )
            const parent = yield* Effect.makeSpan(name)
            const layer = wrapper === "withSpan"
              ? form === "data-first"
                ? Layer.withSpan(acquire, name, options)
                : acquire.pipe(Layer.withSpan(name, options))
              : form === "data-first"
              ? Layer.withParentSpan(acquire, parent, options)
              : acquire.pipe(Layer.withParentSpan(parent, options))
            assert.strictEqual(calls, 0)
            const cause = yield* Effect.provide(Effect.void, layer).pipe(Effect.sandbox, Effect.flip)
            assert.strictEqual(cause.reasons.length, 1)
            const reason = cause.reasons[0]
            assert.strictEqual(reason._tag, "Fail")
            if (reason._tag !== "Fail") return
            assert.strictEqual(reason.error, error)
            const frame = Context.getOrUndefined(Cause.reasonAnnotations(reason), Cause.StackTrace)
            assert.isDefined(frame)
            assert.strictEqual(frame, acquisitionFrame)
            assert.strictEqual(frame!.name, name)
            assert.strictEqual(calls, 0)
            const pretty = Cause.pretty(cause)
            assert.include(pretty, error.message)
            assert.include(pretty, `at ${name}`)
            if (mode === "supplier") {
              assert.include(pretty, `at ${name} (${location})`)
              assert.strictEqual(calls, 1)
            } else if (mode === "false") {
              assert.include(pretty.split("\n"), `    at ${name}`)
              assert.isUndefined(frame!.stack())
            } else {
              assert.isString(frame!.stack())
              assert.isAbove(frame!.stack()!.length, 0)
            }
          }))
      }
    }
  }

  for (const form of forms) {
    it.effect(`withSpan ${form} preserves metadata, service, sharing and scoped lifetime`, () =>
      Effect.gen(function*() {
        const parent = yield* Effect.makeSpan("outer")
        const link = Tracer.externalSpan({ spanId: "linked", traceId: "linked-trace" })
        const Annotation = Context.Service<string>(`annotation/${form}`)
        const Service = Context.Service<{ readonly value: number; readonly span: Tracer.Span }>(`service/${form}`)
        const endings: Array<{ readonly span: Tracer.Span; readonly exit: Exit.Exit<unknown, unknown> }> = []
        let acquisitions = 0
        let releases = 0
        let calls = 0
        const acquire = Layer.effect(
          Service,
          Effect.gen(function*() {
            const span = yield* Effect.currentSpan
            yield* Effect.acquireRelease(
              Effect.sync(() => acquisitions++),
              () => Effect.sync(() => releases++)
            )
            return { value: 42, span }
          })
        )
        const options: Layer.SpanOptions = {
          parent,
          links: [{ span: link, attributes: { relation: "input" } }],
          attributes: { component: "database", count: 7 },
          annotations: Context.make(Annotation, "preserved"),
          kind: "client",
          sampled: true,
          captureStackTrace: () => {
            calls++
            return suppliedStack
          },
          onEnd: (span, exit) => Effect.sync(() => endings.push({ span, exit }))
        }
        const layer = form === "data-first"
          ? Layer.withSpan(acquire, "database-init", options)
          : acquire.pipe(Layer.withSpan("database-init", options))
        assert.strictEqual(calls, 0)
        const scope = yield* Scope.make()
        const memo = yield* Layer.makeMemoMap
        const first = yield* Layer.buildWithMemoMap(layer, memo, scope)
        const second = yield* Layer.buildWithMemoMap(layer, memo, scope)
        const service = Context.get(first, Service)
        const span = service.span
        assert.strictEqual(Context.get(second, Service), service)
        assert.strictEqual(service.value, 42)
        assert.strictEqual(acquisitions, 1)
        assert.strictEqual(releases, 0)
        assert.strictEqual(calls, 0)
        assert.strictEqual(span.name, "database-init")
        assert.deepStrictEqual(span.parent, Option.some(parent))
        assert.strictEqual(span.traceId, parent.traceId)
        assert.strictEqual(span.kind, "client")
        assert.strictEqual(span.sampled, true)
        assert.strictEqual(span.attributes.get("component"), "database")
        assert.strictEqual(span.attributes.get("count"), 7)
        assert.deepStrictEqual(span.links, [{ span: link, attributes: { relation: "input" } }])
        assert.strictEqual(Context.getOrUndefined(span.annotations, Annotation), "preserved")
        assert.strictEqual(span.status._tag, "Started")
        assert.strictEqual(endings.length, 0)
        yield* Scope.close(scope, Exit.void)
        assert.strictEqual(releases, 1)
        assert.strictEqual(endings.length, 1)
        assert.strictEqual(endings[0].span, span)
        assert.strictEqual(endings[0].exit._tag, "Success")
        assert.strictEqual(span.status._tag, "Ended")
        assert.strictEqual(calls, 0)
        yield* Scope.close(scope, Exit.void)
        assert.strictEqual(endings.length, 1)
      }))

    it.effect(`withSpan ${form} preserves failed acquisition onEnd and lifetime`, () =>
      Effect.gen(function*() {
        let current: Tracer.Span | undefined
        let releases = 0
        let calls = 0
        const endings: Array<{ readonly span: Tracer.Span; readonly exit: Exit.Exit<unknown, unknown> }> = []
        const error = new Error("failed initialization")
        const acquire = Layer.effectDiscard(Effect.gen(function*() {
          current = yield* Effect.currentSpan
          yield* Effect.acquireRelease(Effect.void, () => Effect.sync(() => releases++))
          return yield* Effect.fail(error)
        }))
        const options: Layer.SpanOptions = {
          captureStackTrace: () => {
            calls++
            return suppliedStack
          },
          onEnd: (span, exit) => Effect.sync(() => endings.push({ span, exit }))
        }
        const layer = form === "data-first"
          ? Layer.withSpan(acquire, "failed-init", options)
          : acquire.pipe(Layer.withSpan("failed-init", options))
        const exit = yield* Effect.provide(Effect.void, layer).pipe(Effect.exit)
        assert.strictEqual(exit._tag, "Failure")
        assert.isDefined(current)
        assert.strictEqual(current!.name, "failed-init")
        assert.strictEqual(current!.status._tag, "Ended")
        assert.strictEqual(releases, 1)
        assert.strictEqual(endings.length, 1)
        assert.strictEqual(endings[0].span, current)
        assert.strictEqual(endings[0].exit._tag, "Failure")
        assert.strictEqual(calls, 0)
        assert.deepStrictEqual(endings[0].exit, exit)
      }))
  }
})

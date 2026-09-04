import { assert, describe, it } from "@effect/vitest"
import { Exit, Scope } from "effect"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as References from "effect/References"
import * as TestConsole from "effect/testing/TestConsole"

interface AnnotationSnapshot {
  readonly stage: string
  readonly annotations: Record<string, unknown>
}

const runScopedAnnotation = (
  annotate: Effect.Effect<void, never, Scope.Scope>,
  initial: Record<string, unknown>,
  replaceWith?: { readonly value: unknown }
) =>
  Effect.gen(function*() {
    const snapshots: Array<AnnotationSnapshot> = []
    const scope = yield* Scope.make()
    const logger = Logger.make<unknown, void>(({ fiber, message }) => {
      snapshots.push({
        stage: String(Array.isArray(message) ? message[0] : message),
        annotations: { ...fiber.getRef(References.CurrentLogAnnotations) }
      })
    })

    yield* Effect.gen(function*() {
      yield* Effect.log("before")
      yield* annotate
      yield* Effect.log("inside")
      if (replaceWith !== undefined) {
        yield* Effect.gen(function*() {
          yield* Effect.log("replacement")
          yield* Scope.close(scope, Exit.void)
          yield* Effect.log("after close")
        }).pipe(Effect.annotateLogs("measurement", replaceWith.value))
      } else {
        yield* Scope.close(scope, Exit.void)
        yield* Effect.log("after close")
      }
    }).pipe(
      Scope.provide(scope),
      Effect.annotateLogs(initial),
      Effect.provide(Logger.layer([logger])),
      Effect.ensuring(Scope.close(scope, Exit.void))
    )

    return snapshots
  })

describe("Logger", () => {
  it.effect("should output logs", () =>
    Effect.gen(function*() {
      yield* Effect.logInfo("info", "message").pipe(
        Effect.annotateLogs("key", "value"),
        Effect.withLogSpan("span")
      )

      const result = yield* TestConsole.logLines

      assert.match(
        result[0] as string,
        /\[\d{2}:\d{2}:\d{2}\.\d{3}\]\sINFO\s\(#1\)\sspan=\dms:/
      )
      assert.strictEqual(result[1], "info")
      assert.strictEqual(result[2], "message")
      assert.deepStrictEqual(result[3], { key: "value" })
    }))

  it.effect(
    "replace loggers",
    Effect.fnUntraced(function*() {
      const result: Array<string> = []
      const context = yield* Layer.build(Logger.layer([Logger.formatJson.pipe(
        Logger.map((inp): void => {
          result.push(inp)
        })
      )]))
      yield* Effect.logInfo("info", "message").pipe(Effect.provideContext(context))
      assert.strictEqual(result.length, 1)
    })
  )

  it.effect("formatLogFmt does not double quote string messages or annotations", () =>
    Effect.gen(function*() {
      const result: Array<string> = []
      const logger = Logger.formatLogFmt.pipe(
        Logger.map((output): void => {
          result.push(output)
        })
      )

      yield* Effect.logInfo("Welcome to the Effect Playground!").pipe(
        Effect.annotateLogs({
          annotation1: "first",
          annotation2: "second",
          annotation3: "\"omg\""
        }),
        Effect.provide(Logger.layer([logger]))
      )

      assert.strictEqual(result.length, 1)
      const output = result[0] as string
      assert.match(output, /message="Welcome to the Effect Playground!"/)
      assert.match(output, /annotation1=first/)
      assert.match(output, /annotation2=second/)
      assert.match(output, /annotation3="\\"omg\\""/)
      assert.ok(!output.includes("message=\"\\\"Welcome to the Effect Playground!\\\"\""))
      assert.ok(!output.includes("annotation1=\"\\\"first\\\"\""))
    }))

  it.effect("formatSimple does not double quote string messages or annotations", () =>
    Effect.gen(function*() {
      const result: Array<string> = []
      const logger = Logger.formatSimple.pipe(
        Logger.map((output): void => {
          result.push(output)
        })
      )

      yield* Effect.logInfo("hello world").pipe(
        Effect.annotateLogs("annotation", "value with spaces"),
        Effect.provide(Logger.layer([logger]))
      )

      assert.strictEqual(result.length, 1)
      const output = result[0] as string
      assert.match(output, /message="hello world"/)
      assert.match(output, /annotation="value with spaces"/)
      assert.ok(!output.includes("message=\"\\\"hello world\\\"\""))
      assert.ok(!output.includes("annotation=\"\\\"value with spaces\\\"\""))
    }))

  it.effect("formats BigInt messages consistently", () =>
    Effect.gen(function*() {
      const simple: Array<string> = []
      const logFmt: Array<string> = []
      const structured: Array<{ readonly message: unknown; readonly level: string }> = []
      const json: Array<{ readonly message: unknown; readonly level: string }> = []
      const loggers = [
        Logger.formatSimple.pipe(Logger.map((output) => void simple.push(output))),
        Logger.formatLogFmt.pipe(Logger.map((output) => void logFmt.push(output))),
        Logger.formatStructured.pipe(Logger.map((output) => void structured.push(output))),
        Logger.formatJson.pipe(Logger.map((output) => void json.push(JSON.parse(output))))
      ]

      yield* Effect.logInfo(123n, { value: 123n }).pipe(Effect.provide(Logger.layer(loggers)))

      assert.include(simple[0], ` level=INFO fiber=`)
      assert.include(simple[0], `message=123n message="{\\"value\\":123n}"`)
      assert.include(logFmt[0], ` level=INFO fiber=`)
      assert.include(logFmt[0], `message=123n message="{\\"value\\":123n}"`)
      assert.deepStrictEqual(structured[0].message, [123n, { value: 123n }])
      assert.strictEqual(structured[0].level, "INFO")
      assert.deepStrictEqual(json[0].message, ["123n", { value: "123n" }])
      assert.strictEqual(json[0].level, "INFO")
    }))

  it.effect("annotateLogsScoped applies annotations only while scoped", () =>
    Effect.gen(function*() {
      const annotations: Array<Record<string, unknown>> = []
      const logger = Logger.make<unknown, void>((options) => {
        annotations.push({ ...options.fiber.getRef(References.CurrentLogAnnotations) })
      })

      yield* Effect.gen(function*() {
        yield* Effect.log("before")
        yield* Effect.scoped(
          Effect.gen(function*() {
            yield* Effect.annotateLogsScoped("requestId", "req-123")
            yield* Effect.log("inside")
          })
        )
        yield* Effect.log("after")
      }).pipe(Effect.provide(Logger.layer([logger])))

      assert.deepStrictEqual(annotations, [{}, { requestId: "req-123" }, {}])
    }))

  it.effect("annotateLogsScoped restores previous annotations", () =>
    Effect.gen(function*() {
      const annotations: Array<Record<string, unknown>> = []
      const logger = Logger.make<unknown, void>((options) => {
        annotations.push({ ...options.fiber.getRef(References.CurrentLogAnnotations) })
      })

      const scope = Scope.makeUnsafe()

      yield* Effect.gen(function*() {
        yield* Effect.log("before")
        yield* Effect.annotateLogsScoped("inner", "scope")
        yield* Effect.log("after")
      }).pipe(
        Effect.annotateLogs("outer", "program"),
        Effect.ensuring(Scope.close(scope, Exit.void)),
        Effect.andThen(Effect.log("outside")),
        Effect.provide(Logger.layer([logger]))
      )

      assert.deepStrictEqual(
        annotations,
        [{ outer: "program" }, { outer: "program", inner: "scope" }, {}]
      )
    }))

  describe("annotateLogsScoped with NaN", () => {
    const forms: Array<{
      readonly name: string
      readonly annotate: Effect.Effect<void, never, Scope.Scope>
    }> = [
      { name: "key/value", annotate: Effect.annotateLogsScoped("measurement", NaN) },
      { name: "record", annotate: Effect.annotateLogsScoped({ measurement: NaN }) }
    ]

    for (const { annotate, name } of forms) {
      it.effect(`${name} restores an absent key`, () =>
        Effect.gen(function*() {
          const snapshots = yield* runScopedAnnotation(annotate, {})
          assert.deepStrictEqual(snapshots, [
            { stage: "before", annotations: {} },
            { stage: "inside", annotations: { measurement: NaN } },
            { stage: "after close", annotations: {} }
          ])
        }))

      it.effect(`${name} restores an existing value`, () =>
        Effect.gen(function*() {
          const initial = { measurement: "before" }
          const snapshots = yield* runScopedAnnotation(annotate, initial)
          assert.deepStrictEqual(snapshots, [
            { stage: "before", annotations: initial },
            { stage: "inside", annotations: { measurement: NaN } },
            { stage: "after close", annotations: initial }
          ])
        }))
    }

    it.effect("retains a value that replaces the scoped NaN", () =>
      Effect.gen(function*() {
        const initial = { measurement: "before" }
        const snapshots = yield* runScopedAnnotation(
          Effect.annotateLogsScoped("measurement", NaN),
          initial,
          { value: 42 }
        )
        assert.deepStrictEqual(snapshots, [
          { stage: "before", annotations: initial },
          { stage: "inside", annotations: { measurement: NaN } },
          { stage: "replacement", annotations: { measurement: 42 } },
          { stage: "after close", annotations: { measurement: 42 } }
        ])
      }))

    it.effect("keeps signed zero interchangeable when closing the scope", () =>
      Effect.gen(function*() {
        const initial = { measurement: "before" }
        const snapshots = yield* runScopedAnnotation(
          Effect.annotateLogsScoped("measurement", +0),
          initial,
          { value: -0 }
        )
        assert.deepStrictEqual(snapshots, [
          { stage: "before", annotations: initial },
          { stage: "inside", annotations: { measurement: +0 } },
          { stage: "replacement", annotations: { measurement: -0 } },
          { stage: "after close", annotations: initial }
        ])
        assert.strictEqual(Object.is(snapshots[1].annotations.measurement, +0), true)
        assert.strictEqual(Object.is(snapshots[2].annotations.measurement, -0), true)
      }))
  })

  it.effect("default logger preserves message item order when logging a cause", () =>
    Effect.gen(function*() {
      yield* Effect.log("first", Cause.fail("boom"), "second")

      const result = yield* TestConsole.logLines

      assert.match(
        result[0] as string,
        /\[\d{2}:\d{2}:\d{2}\.\d{3}\]\sINFO\s\(#\d+\):/
      )
      assert.strictEqual(result[1], "first")
      assert.strictEqual(result[2], "second")
      assert.match(result[3] as string, /boom/)
    }))
})

import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit } from "effect"

type Path = "succeed" | "sync" | "suspend"
type Form = "direct" | "pipe"
type Shape = "default" | "rest" | "adapter" | "optional" | "zero"
type SuccessOp = "flatMap" | "andThen" | "flatMapEager" | "matchCauseEffect" | "matchEffect" | "matchCauseEffectEager"
type FailureOp = "catchCause" | "matchCauseEffect" | "matchEffect" | "matchCauseEffectEager"
const paths: Array<Path> = ["succeed", "sync", "suspend"]
const forms: Array<Form> = ["direct", "pipe"]
const shapes: Array<Shape> = ["default", "rest", "adapter", "optional", "zero"]
const successOps: Array<SuccessOp> = [
  "flatMap",
  "andThen",
  "flatMapEager",
  "matchCauseEffect",
  "matchEffect",
  "matchCauseEffectEager"
]
const failureOps: Array<FailureOp> = ["catchCause", "matchCauseEffect", "matchEffect", "matchCauseEffectEager"]

const source = (path: Path) =>
  path === "succeed"
    ? Effect.succeed("hello")
    : path === "sync"
    ? Effect.sync(() => "hello")
    : Effect.suspend(() => Effect.succeed("hello"))

const applySuccess = <E, R>(
  op: SuccessOp,
  form: Form,
  self: Effect.Effect<string>,
  f: (text: string) => Effect.Effect<string, E, R>,
  other: () => Effect.Effect<string>
) => {
  const options = { onSuccess: f, onFailure: other }
  switch (op) {
    case "flatMap":
      return form === "direct" ? Effect.flatMap(self, f) : self.pipe(Effect.flatMap(f))
    case "andThen":
      return form === "direct" ? Effect.andThen(self, f) : self.pipe(Effect.andThen(f))
    case "flatMapEager":
      return form === "direct" ? Effect.flatMapEager(self, f) : self.pipe(Effect.flatMapEager(f))
    case "matchCauseEffect":
      return form === "direct" ? Effect.matchCauseEffect(self, options) : self.pipe(Effect.matchCauseEffect(options))
    case "matchEffect":
      return form === "direct" ? Effect.matchEffect(self, options) : self.pipe(Effect.matchEffect(options))
    case "matchCauseEffectEager":
      return form === "direct"
        ? Effect.matchCauseEffectEager(self, options)
        : self.pipe(Effect.matchCauseEffectEager(options))
  }
}

const applyFailure = <E, R>(
  op: FailureOp,
  form: Form,
  self: Effect.Effect<never, string>,
  f: (cause: Cause.Cause<string>) => Effect.Effect<string, E, R>,
  other: () => Effect.Effect<string>
) => {
  const options = { onFailure: f, onSuccess: other }
  switch (op) {
    case "catchCause":
      return form === "direct" ? Effect.catchCause(self, f) : self.pipe(Effect.catchCause<string, string, E, R>(f))
    case "matchCauseEffect":
      return form === "direct" ? Effect.matchCauseEffect(self, options) : self.pipe(Effect.matchCauseEffect(options))
    case "matchCauseEffectEager":
      return form === "direct"
        ? Effect.matchCauseEffectEager(self, options)
        : self.pipe(Effect.matchCauseEffectEager(options))
    case "matchEffect": {
      const typed = { onFailure: (error: string) => f(Cause.fail(error)), onSuccess: other }
      return form === "direct" ? Effect.matchEffect(self, typed) : self.pipe(Effect.matchEffect(typed))
    }
  }
}

// No inspection of runtime continuations: observe only callback input and public results.
const callback = <A>(shape: Shape, calls: Array<Array<unknown>>, project: (a: A) => string) => {
  const render = (value: A, uppercase = false) => {
    const text = project(value)
    calls.push([text, typeof uppercase])
    return Effect.succeed(uppercase ? text.toUpperCase() : text)
  }
  switch (shape) {
    case "default":
      return render
    case "adapter":
      return (value: A) => render(value)
    case "optional":
      return (value: A, uppercase?: boolean) => render(value, uppercase)
    case "zero":
      return () => {
        calls.push(["zero"])
        return Effect.succeed("hello")
      }
    case "rest":
      return (value: A, ...options: Array<boolean>) => {
        const text = project(value)
        calls.push([text, options.map((option) => typeof option)])
        return Effect.succeed(options[0] ? text.toUpperCase() : text)
      }
  }
}

describe("Effect public callback arguments", () => {
  for (const op of successOps) {
    for (const path of paths) {
      for (const form of forms) {
        for (const shape of shapes) {
          it.effect(`success ${op} ${path} ${form} ${shape}`, () =>
            Effect.gen(function*() {
              const calls: Array<Array<unknown>> = []
              let otherCalls = 0
              const f = callback<string>(shape, calls, (text) => text)
              const program = applySuccess(op, form, source(path), f, () => {
                otherCalls++
                return Effect.succeed("other")
              })
              const before = calls.length
              const first = yield* program
              const second = yield* program
              const eager = path === "succeed" && (op === "flatMapEager" || op === "matchCauseEffectEager")
              const vector = shape === "rest" ? ["hello", []] : shape === "zero" ? ["zero"] : ["hello", "boolean"]
              assert.deepStrictEqual({ before, first, second, otherCalls, calls }, {
                before: eager ? 1 : 0,
                first: "hello",
                second: "hello",
                otherCalls: 0,
                calls: eager ? [vector] : [vector, vector]
              })
            }))
        }
      }
    }
  }

  for (const op of failureOps) {
    for (const path of paths) {
      for (const form of forms) {
        for (const shape of shapes) {
          it.effect(`failure ${op} ${path} ${form} ${shape}`, () =>
            Effect.gen(function*() {
              const calls: Array<Array<unknown>> = []
              let otherCalls = 0
              const cause = Cause.fail("hello")
              const failed = Effect.failCause(cause)
              // A sync failure uses the public failCauseSync constructor, not a throwing thunk.
              const self = path === "succeed"
                ? failed
                : path === "sync"
                ? Effect.failCauseSync(() => cause)
                : Effect.suspend(() => failed)
              const f = callback<Cause.Cause<string>>(shape, calls, (input) => {
                assert.deepStrictEqual(input, cause)
                return "hello"
              })
              const program = applyFailure(op, form, self, f, () => {
                otherCalls++
                return Effect.succeed("other")
              })
              const before = calls.length
              const first = yield* program
              const second = yield* program
              const eager = path === "succeed" && op === "matchCauseEffectEager"
              const vector = shape === "rest" ? ["hello", []] : shape === "zero" ? ["zero"] : ["hello", "boolean"]
              assert.deepStrictEqual({ before, first, second, otherCalls, calls }, {
                before: eager ? 1 : 0,
                first: "hello",
                second: "hello",
                otherCalls: 0,
                calls: eager ? [vector] : [vector, vector]
              })
            }))
        }
      }
    }
  }

  it.effect("ordinary reusable render helper", () =>
    Effect.gen(function*() {
      const render = (text: string, uppercase = false) => Effect.succeed(uppercase ? text.toUpperCase() : text)
      assert.strictEqual(render.length, 1)
      assert.strictEqual(yield* render("hello"), "hello")
      assert.strictEqual(yield* Effect.flatMap(Effect.succeed("hello"), render), "hello")
    }))

  it.effect("typed match failure invokes reusable default and rest helpers directly", () =>
    Effect.gen(function*() {
      const render = (text: string, uppercase = false) => Effect.succeed(uppercase ? text.toUpperCase() : text)
      const rest = (text: string, ...options: Array<boolean>) => Effect.succeed([text, options])
      assert.strictEqual(
        yield* Effect.matchEffect(Effect.fail("hello"), { onFailure: render, onSuccess: render }),
        "hello"
      )
      assert.deepStrictEqual(
        yield* Effect.fail("hello").pipe(Effect.matchEffect({ onFailure: rest, onSuccess: rest })),
        ["hello", []]
      )
    }))

  it.effect("pure match controls isolate their callbacks", () =>
    Effect.gen(function*() {
      const render = (text: string, uppercase = false) => uppercase ? text.toUpperCase() : text
      const renderCause = (_cause: Cause.Cause<string>, uppercase = false) => uppercase ? "HELLO" : "hello"
      assert.strictEqual(
        yield* Effect.match(Effect.succeed("hello"), { onSuccess: render, onFailure: render }),
        "hello"
      )
      assert.strictEqual(
        yield* Effect.matchCause(Effect.fail("hello"), { onSuccess: render, onFailure: renderCause }),
        "hello"
      )
    }))

  for (const op of successOps) {
    for (const outcome of ["fail", "defect"] as const) {
      it.effect(`preserve success handler ${op} ${outcome}`, () =>
        Effect.gen(function*() {
          const error = { message: "selected" }
          let selected = 0
          let other = 0
          const f = (_text: string, _uppercase = false): Effect.Effect<string, typeof error> => {
            selected++
            if (outcome === "defect") throw error
            return Effect.fail(error)
          }
          const program = applySuccess(op, "direct", source("suspend"), f, () => {
            other++
            return Effect.succeed("other")
          })
          assert.deepStrictEqual(yield* Effect.exit(program), outcome === "fail" ? Exit.fail(error) : Exit.die(error))
          assert.deepStrictEqual([selected, other], [1, 0])
        }))
    }
  }
  for (const op of failureOps) {
    for (const outcome of ["fail", "defect"] as const) {
      it.effect(`preserve failure handler ${op} ${outcome}`, () =>
        Effect.gen(function*() {
          const error = { message: "selected" }
          let selected = 0
          let other = 0
          const f = (_cause: Cause.Cause<string>, _uppercase = false): Effect.Effect<string, typeof error> => {
            selected++
            if (outcome === "defect") throw error
            return Effect.fail(error)
          }
          const program = applyFailure(op, "pipe", Effect.suspend(() => Effect.fail("hello")), f, () => {
            other++
            return Effect.succeed("other")
          })
          assert.deepStrictEqual(yield* Effect.exit(program), outcome === "fail" ? Exit.fail(error) : Exit.die(error))
          assert.deepStrictEqual([selected, other], [1, 0])
        }))
    }
  }

  it.effect("short circuit and cause identity", () =>
    Effect.gen(function*() {
      const value = { text: "hello" }
      const cause = Cause.fail({ message: "source" })
      let calls = 0
      assert.strictEqual(
        yield* Effect.catchCause(Effect.succeed(value), () => {
          calls++
          return Effect.succeed(value)
        }),
        value
      )
      assert.deepStrictEqual(
        yield* Effect.exit(Effect.flatMap(Effect.failCause(cause), () => {
          calls++
          return Effect.succeed(value)
        })),
        Exit.failCause(cause)
      )
      yield* Effect.catchCause(Effect.failCause(cause), (input) => {
        assert.strictEqual(input, cause)
        return Effect.void
      })
      yield* Effect.matchCauseEffect(Effect.failCause(cause), {
        onFailure: (input) => {
          assert.strictEqual(input, cause)
          return Effect.void
        },
        onSuccess: () => Effect.void
      })
      assert.strictEqual(calls, 0)
    }))

  it.effect("typed matcher preserves source defects and cause matcher selects them", () =>
    Effect.gen(function*() {
      const defect = { message: "defect" }
      let typed = 0
      const handler = () => {
        typed++
        return Effect.succeed("other")
      }
      assert.deepStrictEqual(
        yield* Effect.exit(Effect.matchEffect(Effect.die(defect), { onFailure: handler, onSuccess: handler })),
        Exit.die(defect)
      )
      const cause = yield* Effect.matchCauseEffect(Effect.die(defect), {
        onFailure: Effect.succeed,
        onSuccess: () => Effect.succeed(Cause.die(defect))
      })
      assert.deepStrictEqual(cause, Cause.die(defect))
      assert.strictEqual(typed, 0)
    }))

  class Input extends Context.Service<Input, string>()("callbackArguments/Input") {}
  class Suffix extends Context.Service<Suffix, string>()("callbackArguments/Suffix") {}
  it.effect("source and selected callbacks retain service requirements", () =>
    Effect.gen(function*() {
      const render = (text: string, uppercase = false) =>
        Effect.map(Suffix, (suffix) => (uppercase ? text.toUpperCase() : text) + suffix)
      const recover = (_cause: Cause.Cause<string>, uppercase = false) => render("hello", uppercase)
      const self = Effect.flatMap(Input, Effect.succeed)
      const failed = Effect.flatMap(Input, Effect.fail)
      const programs = [
        Effect.flatMap(self, render),
        Effect.catchCause(failed, recover),
        Effect.matchCauseEffect(self, { onSuccess: render, onFailure: recover }),
        Effect.matchCauseEffect(failed, { onSuccess: render, onFailure: recover })
      ]
      for (const program of programs) {
        assert.strictEqual(
          yield* program.pipe(Effect.provideService(Input, "hello"), Effect.provideService(Suffix, "!")),
          "hello!"
        )
      }
    }))
})

import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, References } from "effect"

const withCaptureDisabled = <A>(run: () => A): A => {
  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = 0
  try {
    return run()
  } finally {
    Error.stackTraceLimit = limit
  }
}

// Even an empty stack costs a capture in workerd, so count Error allocations.
const countErrors = (run: () => void): number => {
  const original = globalThis.Error
  let count = 0
  globalThis.Error = new Proxy(original, {
    construct(target, args, newTarget) {
      count++
      return Reflect.construct(target, args, newTarget)
    }
  })
  try {
    run()
    return count
  } finally {
    globalThis.Error = original
  }
}

describe("stack capture", { concurrent: false }, () => {
  it("Effect.fn skips definition capture at limit zero", () => {
    const count = withCaptureDisabled(() => countErrors(() => Effect.fn("test")(() => Effect.void)))
    assert.strictEqual(count, 0)
  })

  it("Effect.fn skips invocation capture at limit zero", () => {
    const fn = Effect.fn("test")(() => Effect.void)
    const count = withCaptureDisabled(() => countErrors(() => Effect.runSync(fn())))
    assert.strictEqual(count, 0)
  })

  it("default spans skip capture at limit zero", () => {
    const count = withCaptureDisabled(() => countErrors(() => Effect.runSync(Effect.withSpan(Effect.void, "test"))))
    assert.strictEqual(count, 0)
  })

  it("Effect.fn renders its call and definition frames", () => {
    const definitionLine = Number(new Error().stack!.split("\n")[1].match(/:(\d+):\d+\)?$/)![1]) + 1
    const pinned = Effect.fn("pinned")(function*() {
      return yield* Effect.die(new Error("boom"))
    })
    const callLine = Number(new Error().stack!.split("\n")[1].match(/:(\d+):\d+\)?$/)![1]) + 1
    const exit = Effect.runSyncExit(pinned())
    assert.isTrue(Exit.isFailure(exit))
    if (Exit.isFailure(exit)) {
      const rendered = Cause.pretty(exit.cause)
      assert.match(rendered, new RegExp(`at pinned \\(.*StackCapture\\.test\\.ts:${callLine}:\\d+\\)`))
      assert.match(
        rendered,
        new RegExp(`at pinned \\(definition\\) \\(.*StackCapture\\.test\\.ts:${definitionLine}:\\d+\\)`)
      )
    }
  })

  it("Effect.withSpan renders its span frame", () => {
    const spanLine = Number(new Error().stack!.split("\n")[1].match(/:(\d+):\d+\)?$/)![1]) + 1
    const traced = Effect.withSpan(Effect.die(new Error("boom")), "pinned-span")
    const exit = Effect.runSyncExit(traced)
    assert.isTrue(Exit.isFailure(exit))
    if (Exit.isFailure(exit)) {
      assert.match(
        Cause.pretty(exit.cause),
        new RegExp(`at pinned-span \\(.*StackCapture\\.test\\.ts:${spanLine}:\\d+\\)`)
      )
    }
  })

  it("explicit span capture works at limit zero", () => {
    const frame = withCaptureDisabled(() => {
      const frame = Effect.runSync(Effect.withSpan(References.CurrentStackFrame, "test", { captureStackTrace: true }))
      assert.strictEqual(Error.stackTraceLimit, 0)
      return frame
    })
    assert.match(frame!.stack()!, /StackCapture\.test\.ts:\d+:\d+/)
  })
})

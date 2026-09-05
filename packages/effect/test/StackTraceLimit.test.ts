import { describe, it, vi } from "@effect/vitest"
import { Effect, Layer, LayerMap, LayerRef, References, Schema, type Tracer } from "effect"
import * as StackTraceLimit from "effect/internal/stackTraceLimit"
import { addSpanStackTrace } from "effect/internal/tracer"
import { HttpApiMiddleware } from "effect/unstable/httpapi"
import { Atom } from "effect/unstable/reactivity"
import { RpcMiddleware } from "effect/unstable/rpc"
import { assertFalse, assertInclude, assertTrue, deepStrictEqual, strictEqual } from "./utils/assert.ts"

const getLimit = (): number | undefined => (Error as { stackTraceLimit?: number | undefined }).stackTraceLimit

const withLimit = <A>(limit: number, f: () => A): A => {
  const prev = getLimit()
  StackTraceLimit.setStackTraceLimit(limit)
  try {
    return f()
  } finally {
    StackTraceLimit.setStackTraceLimit(prev)
  }
}

const stackOf = (self: unknown): string | undefined => (self as { readonly stack?: string | undefined }).stack

describe("stackTraceLimit", () => {
  describe("writable environment", () => {
    it("isStackTraceLimitWritable returns true", () => {
      assertTrue(StackTraceLimit.isStackTraceLimitWritable())
    })

    it("getStackTraceLimit reflects the current value", () => {
      const prev = getLimit()
      StackTraceLimit.setStackTraceLimit(5)
      strictEqual(StackTraceLimit.getStackTraceLimit(), 5)
      StackTraceLimit.setStackTraceLimit(prev)
    })

    it("setStackTraceLimit updates and restores the limit", () => {
      const prev = StackTraceLimit.getStackTraceLimit()
      StackTraceLimit.setStackTraceLimit(7)
      strictEqual(getLimit(), 7)
      StackTraceLimit.setStackTraceLimit(prev)
      strictEqual(getLimit(), prev)
    })
  })

  describe("frozen intrinsics (non-writable Error.stackTraceLimit)", () => {
    // The writability check is cached at module load, so re-import the module
    // after redefining the property to exercise the frozen path.
    it("degrades to a no-op without throwing", async () => {
      const original = Object.getOwnPropertyDescriptor(Error, "stackTraceLimit")
      Object.defineProperty(Error, "stackTraceLimit", {
        value: 10,
        writable: false,
        configurable: true,
        enumerable: original?.enumerable ?? false
      })
      try {
        vi.resetModules()
        const frozen = await import("effect/internal/stackTraceLimit")

        assertFalse(frozen.isStackTraceLimitWritable())

        // reading still works
        strictEqual(frozen.getStackTraceLimit(), 10)

        // setStackTraceLimit is a silent no-op rather than throwing
        frozen.setStackTraceLimit(0)
        strictEqual(getLimit(), 10)
      } finally {
        if (original !== undefined) {
          Object.defineProperty(Error, "stackTraceLimit", original)
        }
        vi.resetModules()
      }
    })
  })

  describe("a limit of 0 skips the capture", () => {
    const runFn = () => {
      const double = Effect.fn("double")(function*(n: number) {
        return [n * 2, yield* References.CurrentStackFrame] as const
      })
      return Effect.runSync(double(21))
    }

    it("Effect.fn runs and reports neither a call nor a definition frame", () => {
      const [value, frame] = withLimit(0, runFn)
      strictEqual(value, 42)
      strictEqual(frame?.name, "double")
      strictEqual(frame?.stack(), undefined)
      strictEqual(frame?.parent?.name, "double (definition)")
      strictEqual(frame?.parent?.stack(), undefined)
    })

    it("Effect.fn keeps both frames at a non-zero limit", () => {
      const [value, frame] = withLimit(10, runFn)
      strictEqual(value, 42)
      assertInclude(frame?.stack(), "StackTraceLimit.test.ts")
      assertInclude(frame?.parent?.stack(), "StackTraceLimit.test.ts")
    })

    it.effect("LayerMap.Service exposes no stack and is otherwise unchanged", () =>
      Effect.gen(function*() {
        const looked: Array<string> = []
        const makeService = (id: string) => {
          class TestMap extends LayerMap.Service<TestMap>()(id, {
            lookup: (key: string) => Layer.effectDiscard(Effect.sync(() => looked.push(key))) as Layer.Layer<any>
          }) {}
          return TestMap
        }

        const ZeroMap = withLimit(0, () => makeService("StackTraceLimitTest/LayerMapZero"))
        strictEqual(stackOf(ZeroMap), undefined)
        strictEqual(ZeroMap.key, "StackTraceLimitTest/LayerMapZero")
        yield* Effect.provide(Effect.scoped(ZeroMap.contextEffect("a")), ZeroMap.layer)
        deepStrictEqual(looked, ["a"])

        const TenMap = withLimit(10, () => makeService("StackTraceLimitTest/LayerMapTen"))
        assertInclude(stackOf(TenMap), "StackTraceLimit.test.ts")
      }))

    it.effect("LayerRef.Service exposes no stack and is otherwise unchanged", () =>
      Effect.gen(function*() {
        const acquired: Array<string> = []
        const makeService = (id: string) => {
          class TestRef extends LayerRef.Service<TestRef>()(id, {
            layer: Layer.effectDiscard(Effect.sync(() => acquired.push(id))) as Layer.Layer<any>
          }) {}
          return TestRef
        }

        const ZeroRef = withLimit(0, () => makeService("StackTraceLimitTest/LayerRefZero"))
        strictEqual(stackOf(ZeroRef), undefined)
        strictEqual(ZeroRef.key, "StackTraceLimitTest/LayerRefZero")
        yield* Effect.provide(Effect.scoped(ZeroRef.contextEffect), ZeroRef.layer)
        deepStrictEqual(acquired, ["StackTraceLimitTest/LayerRefZero"])

        const TenRef = withLimit(10, () => makeService("StackTraceLimitTest/LayerRefTen"))
        assertInclude(stackOf(TenRef), "StackTraceLimit.test.ts")
      }))

    it("RpcMiddleware.Service exposes no stack and is otherwise unchanged", () => {
      const Zero = withLimit(0, () => {
        class ZeroRpc extends RpcMiddleware.Service<ZeroRpc>()("StackTraceLimitTest/RpcZero") {}
        return ZeroRpc
      })
      strictEqual(stackOf(Zero), undefined)
      strictEqual(Zero.key, "StackTraceLimitTest/RpcZero")
      strictEqual(Zero.requiredForClient, false)

      const Ten = withLimit(10, () => {
        class TenRpc extends RpcMiddleware.Service<TenRpc>()("StackTraceLimitTest/RpcTen") {}
        return TenRpc
      })
      assertInclude(stackOf(Ten), "StackTraceLimit.test.ts")
    })

    it("HttpApiMiddleware.Service exposes no stack and is otherwise unchanged", () => {
      const Zero = withLimit(0, () => {
        class ZeroHttp extends HttpApiMiddleware.Service<ZeroHttp>()("StackTraceLimitTest/HttpZero") {}
        return ZeroHttp
      })
      strictEqual(stackOf(Zero), undefined)
      strictEqual(Zero.key, "StackTraceLimitTest/HttpZero")
      strictEqual(Zero.requiredForClient, false)

      const Ten = withLimit(10, () => {
        class TenHttp extends HttpApiMiddleware.Service<TenHttp>()("StackTraceLimitTest/HttpTen") {}
        return TenHttp
      })
      assertInclude(stackOf(Ten), "StackTraceLimit.test.ts")
    })

    it("Atom.withLabel keeps the name and drops the caller location", () => {
      const zero = withLimit(0, () => Atom.make(0).pipe(Atom.withLabel("counter")).label)
      deepStrictEqual(zero, ["counter", ""])

      const ten = withLimit(10, () => Atom.make(0).pipe(Atom.withLabel("counter")).label)
      strictEqual(ten?.[0], "counter")
      assertInclude(ten?.[1], "StackTraceLimit.test.ts")
    })

    it("Atom.serializable keeps the key and drops the caller location", () => {
      const zero = withLimit(0, () => Atom.make(0).pipe(Atom.serializable({ key: "count", schema: Schema.Number })))
      deepStrictEqual(zero.label, ["count", ""])

      const ten = withLimit(10, () => Atom.make(0).pipe(Atom.serializable({ key: "count", schema: Schema.Number })))
      strictEqual(ten.label?.[0], "count")
      assertInclude(ten.label?.[1], "StackTraceLimit.test.ts")
    })

    it("constructs no Error at a limit of 0, and one per site otherwise", () => {
      const RealError = globalThis.Error
      let constructed = 0
      class CountingError extends RealError {
        constructor(message?: string, options?: ErrorOptions) {
          super(message, options)
          constructed++
        }
      }

      // Exercises all nine capture sites once each.
      const touchEverySite = (suffix: string) => {
        const counted = Effect.fn("counted")(function*(n: number) {
          return n
        })
        Effect.runSync(counted(1))
        class CountedMap extends LayerMap.Service<CountedMap>()(`StackTraceLimitTest/Counted${suffix}Map`, {
          lookup: () => Layer.effectDiscard(Effect.void) as Layer.Layer<any>
        }) {}
        class CountedRef extends LayerRef.Service<CountedRef>()(`StackTraceLimitTest/Counted${suffix}Ref`, {
          layer: Layer.effectDiscard(Effect.void) as Layer.Layer<any>
        }) {}
        class CountedRpc extends RpcMiddleware.Service<CountedRpc>()(`StackTraceLimitTest/Counted${suffix}Rpc`) {}
        class CountedHttp
          extends HttpApiMiddleware.Service<CountedHttp>()(`StackTraceLimitTest/Counted${suffix}Http`)
        {}
        Atom.make(0).pipe(Atom.withLabel("counted"))
        Atom.make(0).pipe(Atom.serializable({ key: "counted", schema: Schema.Number }))
        addSpanStackTrace(undefined)
        return [CountedMap, CountedRef, CountedRpc, CountedHttp]
      }
      ;(globalThis as { Error: ErrorConstructor }).Error = CountingError as unknown as ErrorConstructor
      try {
        withLimit(0, () => touchEverySite("Zero"))
        strictEqual(constructed, 0)

        constructed = 0
        withLimit(10, () => touchEverySite("Ten"))
        strictEqual(constructed, 9)
      } finally {
        ;(globalThis as { Error: ErrorConstructor }).Error = RealError
      }
    })

    it("addSpanStackTrace returns the options unchanged", () => {
      const options: Tracer.TraceOptions = {}
      const zero = withLimit(0, () => addSpanStackTrace(options))
      strictEqual(zero, options)
      strictEqual(zero.captureStackTrace, undefined)
      strictEqual(withLimit(0, () => addSpanStackTrace(undefined)) as unknown, undefined)

      const ten = withLimit(10, () => addSpanStackTrace(options))
      assertTrue(typeof ten.captureStackTrace === "function")
      assertInclude((ten.captureStackTrace as () => string | undefined)(), "StackTraceLimit.test.ts")
    })
  })
})

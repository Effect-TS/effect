import * as FeatureFlag from "@effect/openfeature/FeatureFlag"
import * as NodeSdk from "@effect/openfeature/NodeSdk"
import * as WebSdk from "@effect/openfeature/WebSdk"
import { assert, describe, it } from "@effect/vitest"
import type { Client as NodeClient, EvaluationContext, EvaluationDetails } from "@openfeature/server-sdk"
import type { Client as WebClient } from "@openfeature/web-sdk"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

describe("FeatureFlag", () => {
  const enabled = FeatureFlag.flag({
    key: "checkout.enabled",
    schema: Schema.Boolean,
    defaultValue: false
  })

  it.effect("evaluates Node flags with merged Effect-local context and hook hints", () => {
    let receivedContext: EvaluationContext | undefined
    let receivedOptions: unknown
    const client = {
      getBooleanValue: async (
        _flagKey: string,
        _defaultValue: boolean,
        context?: EvaluationContext,
        options?: unknown
      ) => {
        receivedContext = context
        receivedOptions = options
        return true
      }
    } as unknown as NodeClient

    const evaluation = FeatureFlag.value(enabled, {
      hookHints: { requestId: "req-1" }
    })
    const program = NodeSdk.withEvaluationContext({ account: "outer", targetingKey: "outer-user" })(
      NodeSdk.withEvaluationContext({ account: "inner", plan: "pro" })(evaluation)
    )

    return Effect.gen(function*() {
      const value = yield* program
      assert.isTrue(value)
      assert.deepEqual(receivedContext, {
        account: "inner",
        targetingKey: "outer-user",
        plan: "pro"
      })
      assert.deepEqual(receivedOptions, { hookHints: { requestId: "req-1" } })
    }).pipe(Effect.provide(NodeSdk.layer({ client })))
  })

  it.effect("returns schema-decoded OpenFeature details without discarding metadata", () => {
    const details: EvaluationDetails<string> = {
      flagKey: "checkout.variant",
      value: "treatment",
      variant: "treatment",
      reason: "TARGETING_MATCH",
      flagMetadata: { owner: "checkout" }
    }
    const variant = FeatureFlag.flag({
      key: "checkout.variant",
      schema: Schema.Literals(["control", "treatment"]),
      defaultValue: "control"
    })
    const client = {
      getStringDetails: async () => details
    } as unknown as NodeClient

    return Effect.gen(function*() {
      const result = yield* FeatureFlag.details(variant)
      assert.deepEqual(result, details)
    }).pipe(Effect.provide(NodeSdk.layer({ client })))
  })

  it.effect("evaluates all OpenFeature value types through the Node client", () => {
    const calls: Array<string> = []
    const flags = FeatureFlag.define({
      boolean: FeatureFlag.flag({ key: "flag.boolean", schema: Schema.Boolean, defaultValue: false }),
      string: FeatureFlag.flag({ key: "flag.string", schema: Schema.String, defaultValue: "default" }),
      number: FeatureFlag.flag({ key: "flag.number", schema: Schema.Number, defaultValue: 42 }),
      object: FeatureFlag.flag({
        key: "flag.object",
        schema: Schema.Struct({ mode: Schema.String }),
        defaultValue: { mode: "safe" }
      })
    })
    const client = {
      getBooleanValue: async (_key: string, defaultValue: boolean) => {
        calls.push("boolean")
        return defaultValue
      },
      getStringValue: async (_key: string, defaultValue: string) => {
        calls.push("string")
        return defaultValue
      },
      getNumberValue: async (_key: string, defaultValue: number) => {
        calls.push("number")
        return defaultValue
      },
      getObjectValue: async (_key: string, defaultValue: { mode: string }) => {
        calls.push("object")
        return defaultValue
      }
    } as unknown as NodeClient

    return Effect.gen(function*() {
      assert.isFalse(yield* FeatureFlag.value(flags.boolean))
      assert.strictEqual(yield* FeatureFlag.value(flags.string), "default")
      assert.strictEqual(yield* FeatureFlag.value(flags.number), 42)
      assert.deepEqual(yield* FeatureFlag.value(flags.object), { mode: "safe" })
      assert.deepEqual(calls, ["boolean", "string", "number", "object"])
    }).pipe(Effect.provide(NodeSdk.layer({ client })))
  })

  it.effect("decodes transforming schemas and rejects provider values outside the schema", () => {
    const limit = FeatureFlag.flag({
      key: "checkout.limit",
      schema: Schema.NumberFromString,
      defaultValue: "10"
    })
    const client = {
      getStringValue: async () => "12"
    } as unknown as NodeClient

    return Effect.gen(function*() {
      assert.strictEqual(yield* FeatureFlag.value(limit), 12)
      const result = yield* Effect.result(FeatureFlag.value(FeatureFlag.flag({
        key: "checkout.variant",
        schema: Schema.Literals(["control", "treatment"]),
        defaultValue: "control"
      })))
      assert.strictEqual(result._tag, "Failure")
      if (result._tag === "Failure") {
        assert.instanceOf(result.failure, FeatureFlag.FeatureFlagError)
        assert.strictEqual(result.failure.operation, "decode")
      }
    }).pipe(Effect.provide(NodeSdk.layer({ client })))
  })

  it.effect("wraps unexpected Node client rejections in FeatureFlagError", () => {
    const client = {
      getStringValue: async () => {
        throw new Error("connection failed")
      }
    } as unknown as NodeClient
    const variant = FeatureFlag.flag({
      key: "checkout.variant",
      schema: Schema.String,
      defaultValue: "control"
    })

    return Effect.gen(function*() {
      const result = yield* Effect.result(FeatureFlag.value(variant))
      assert.strictEqual(result._tag, "Failure")
      if (result._tag === "Failure") {
        assert.instanceOf(result.failure, FeatureFlag.FeatureFlagError)
        assert.strictEqual(result.failure.flagKey, "checkout.variant")
        assert.strictEqual(result.failure.operation, "value")
      }
    }).pipe(Effect.provide(NodeSdk.layer({ client })))
  })

  it.effect("supports synchronous browser evaluation and forwards hook hints", () => {
    let receivedOptions: unknown
    const limit = FeatureFlag.flag({
      key: "checkout.limit",
      schema: Schema.Number,
      defaultValue: 1
    })
    const client = {
      getNumberDetails: (_flagKey: string, _defaultValue: number, options?: unknown) => {
        receivedOptions = options
        return {
          flagKey: "checkout.limit",
          value: 3,
          variant: "small",
          reason: "STATIC",
          flagMetadata: {}
        }
      }
    } as unknown as WebClient

    return Effect.gen(function*() {
      const details = yield* FeatureFlag.details(limit, {
        hookHints: { surface: "browser" }
      })
      assert.strictEqual(details.value, 3)
      assert.deepEqual(receivedOptions, { hookHints: { surface: "browser" } })
    }).pipe(Effect.provide(WebSdk.layer({ client })))
  })

  it.effect("maps synchronous browser client exceptions to FeatureFlagError", () => {
    const client = {
      getBooleanValue: () => {
        throw new Error("invalid client")
      }
    } as unknown as WebClient

    return Effect.gen(function*() {
      const result = yield* Effect.result(FeatureFlag.value(enabled))
      assert.strictEqual(result._tag, "Failure")
      if (result._tag === "Failure") {
        assert.instanceOf(result.failure, FeatureFlag.FeatureFlagError)
        assert.strictEqual(result.failure.operation, "value")
      }
    }).pipe(Effect.provide(WebSdk.layer({ client })))
  })
})

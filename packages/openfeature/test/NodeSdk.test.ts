import * as FeatureFlag from "@effect/openfeature/FeatureFlag"
import * as NodeSdk from "@effect/openfeature/NodeSdk"
import { assert, describe, it } from "@effect/vitest"
import type { Client as NodeClient, EvaluationContext, EvaluationDetails } from "@openfeature/server-sdk"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

describe("NodeSdk", () => {
  it.effect("evaluates flags with merged Effect-local context, hooks, and hook hints", () => {
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

    const hooks: Array<FeatureFlag.Hook> = [{ before: () => undefined }]
    const enabled = FeatureFlag.flag({ key: "checkout.enabled", schema: Schema.Boolean, defaultValue: false })
    const evaluation = FeatureFlag.value(enabled, {
      hooks,
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
      assert.deepEqual(receivedOptions, { hooks, hookHints: { requestId: "req-1" } })
    }).pipe(Effect.provide(NodeSdk.layer({ client })))
  })

  it.effect("returns OpenFeature evaluation details without discarding metadata", () => {
    const details: EvaluationDetails<boolean> = {
      flagKey: "checkout.enabled",
      value: true,
      variant: "treatment",
      reason: "TARGETING_MATCH",
      flagMetadata: { owner: "checkout" }
    }
    const client = {
      getBooleanDetails: async () => details
    } as unknown as NodeClient
    const enabled = FeatureFlag.flag({ key: "checkout.enabled", schema: Schema.Boolean, defaultValue: false })

    return Effect.gen(function*() {
      const result = yield* FeatureFlag.details(enabled)
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
      }),
      array: FeatureFlag.flag({
        key: "flag.array",
        schema: Schema.Array(Schema.String),
        defaultValue: ["safe"]
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
      getObjectValue: async (_key: string, defaultValue: unknown) => {
        calls.push("object")
        return defaultValue
      }
    } as unknown as NodeClient

    return Effect.gen(function*() {
      assert.isFalse(yield* FeatureFlag.value(flags.boolean))
      assert.strictEqual(yield* FeatureFlag.value(flags.string), "default")
      assert.strictEqual(yield* FeatureFlag.value(flags.number), 42)
      assert.deepEqual(yield* FeatureFlag.value(flags.object), { mode: "safe" })
      assert.deepEqual(yield* FeatureFlag.value(flags.array), ["safe"])
      assert.deepEqual(calls, ["boolean", "string", "number", "object", "object"])
    }).pipe(Effect.provide(NodeSdk.layer({ client })))
  })

  it.effect("wraps unexpected Node client rejections in FeatureFlagError", () => {
    const client = {
      getStringValue: async () => {
        throw new Error("connection failed")
      }
    } as unknown as NodeClient
    const variant = FeatureFlag.flag({ key: "checkout.variant", schema: Schema.String, defaultValue: "control" })

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
})

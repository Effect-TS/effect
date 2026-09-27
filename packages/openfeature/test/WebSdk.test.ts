import * as FeatureFlag from "@effect/openfeature/FeatureFlag"
import * as WebSdk from "@effect/openfeature/WebSdk"
import { assert, describe, it } from "@effect/vitest"
import type { Client as WebClient } from "@openfeature/web-sdk"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

describe("WebSdk", () => {
  it.effect("supports synchronous browser evaluation and forwards hooks and hook hints", () => {
    let receivedOptions: unknown
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

    const hooks: Array<FeatureFlag.Hook> = [{ after: () => undefined }]
    const limit = FeatureFlag.flag({ key: "checkout.limit", schema: Schema.Number, defaultValue: 1 })
    return Effect.gen(function*() {
      const details = yield* FeatureFlag.details(limit, {
        hooks,
        hookHints: { surface: "browser" }
      })
      assert.strictEqual(details.value, 3)
      assert.deepEqual(receivedOptions, { hooks, hookHints: { surface: "browser" } })
    }).pipe(Effect.provide(WebSdk.layer({ client })))
  })

  it.effect("maps synchronous browser client exceptions to FeatureFlagError", () => {
    const client = {
      getBooleanValue: () => {
        throw new Error("invalid client")
      }
    } as unknown as WebClient
    const enabled = FeatureFlag.flag({ key: "browser.flag", schema: Schema.Boolean, defaultValue: false })

    return Effect.gen(function*() {
      const result = yield* Effect.result(FeatureFlag.value(enabled))
      assert.strictEqual(result._tag, "Failure")
      if (result._tag === "Failure") {
        assert.instanceOf(result.failure, FeatureFlag.FeatureFlagError)
        assert.strictEqual(result.failure.operation, "value")
      }
    }).pipe(Effect.provide(WebSdk.layer({ client })))
  })

  it.effect("evaluates readonly array schemas through the object API", () => {
    const regions = FeatureFlag.flag({
      key: "browser.regions",
      schema: Schema.Array(Schema.String),
      defaultValue: ["us"]
    })
    const client = {
      getObjectValue: (_key: string, defaultValue: unknown) => defaultValue
    } as unknown as WebClient

    return Effect.gen(function*() {
      assert.deepEqual(yield* FeatureFlag.value(regions), ["us"])
    }).pipe(Effect.provide(WebSdk.layer({ client })))
  })
})

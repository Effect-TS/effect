import * as Resource from "@effect/opentelemetry/Resource"
import { assert, describe, it } from "@effect/vitest"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"

describe("Resource", () => {
  it("lets custom attributes override SDK defaults but not the service options", () => {
    const attributes = Resource.configToAttributes({
      serviceName: "test",
      serviceVersion: "service-version",
      attributes: {
        "service.name": "attribute-service",
        "telemetry.sdk.name": "custom",
        "telemetry.sdk.language": "webjs",
        "telemetry.sdk.version": "custom-version"
      }
    })
    assert.deepStrictEqual(attributes, {
      "service.name": "test",
      "service.version": "service-version",
      "telemetry.sdk.name": "custom",
      "telemetry.sdk.language": "webjs",
      "telemetry.sdk.version": "custom-version"
    })
  })

  it.effect("preserves embedded equals signs and ignores empty attribute keys", () =>
    Effect.gen(function*() {
      const resource = yield* Resource.Resource
      assert.strictEqual(resource.attributes["key"], "value")
      assert.strictEqual(resource.attributes["encoded"], "abc=def==")
      assert.strictEqual(resource.attributes[""], undefined)
    }).pipe(
      Effect.provide(Resource.layerFromEnv()),
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv({
          env: {
            OTEL_RESOURCE_ATTRIBUTES: "key=value,encoded=abc=def==, =ignored"
          }
        })
      )
    ))
})

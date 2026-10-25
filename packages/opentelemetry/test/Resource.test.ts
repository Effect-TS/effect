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

  it.effect("percent-decodes attribute keys and values", () =>
    Effect.gen(function*() {
      const resource = yield* Resource.Resource
      assert.strictEqual(resource.attributes["message"], "hello world")
      assert.strictEqual(resource.attributes["comma"], "one,two")
      assert.strictEqual(resource.attributes["equal"], "left=right")
      assert.strictEqual(resource.attributes["地域"], "東京")
      assert.strictEqual(resource.attributes["cpu"], "50%")
      assert.strictEqual(resource.attributes["service.name"], "env-service")
      assert.strictEqual(resource.attributes["team"], "explicit")
    }).pipe(
      Effect.provide(Resource.layerFromEnv({ team: "explicit" })),
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv({
          env: {
            OTEL_SERVICE_NAME: "env-service",
            OTEL_RESOURCE_ATTRIBUTES:
              "message=hello%20world,comma=one%2Ctwo,equal=left%3Dright,%E5%9C%B0%E5%9F%9F=%E6%9D%B1%E4%BA%AC,cpu=50%,service%2Ename=attribute-service,team=from%20env"
          }
        })
      )
    ))
})

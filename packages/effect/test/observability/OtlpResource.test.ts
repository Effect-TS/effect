import { assert, describe, it } from "@effect/vitest"
import { ConfigProvider, Effect } from "effect"
import { OtlpResource } from "effect/observability"
import * as Version from "effect/Version"

const attributesRecord = (resource: OtlpResource.Resource): Record<string, string | null | undefined> =>
  Object.fromEntries(resource.attributes.map((attribute) => [attribute.key, attribute.value.stringValue]))

const sdk = {
  "telemetry.sdk.name": "effect",
  "telemetry.sdk.language": "nodejs",
  "telemetry.sdk.version": Version.getCurrentVersion()
}

describe("OtlpResource", () => {
  describe("fromConfig", () => {
    it.effect("decodes percent-encoded OTEL_RESOURCE_ATTRIBUTES", () =>
      Effect.gen(function*() {
        const resource = yield* OtlpResource.fromConfig()
        const attributes = Object.fromEntries(
          resource.attributes.map((attribute) => [attribute.key, attribute.value.stringValue])
        )

        assert.strictEqual(attributes.message, "hello world")
        assert.strictEqual(attributes.comma, "comma,value")
      }).pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromEnv({
            env: {
              OTEL_SERVICE_NAME: "repro",
              OTEL_RESOURCE_ATTRIBUTES: "message=hello%20world,comma=comma%2Cvalue"
            }
          })
        )
      ))

    it.effect("uses explicit service options before attributes and environment variables", () =>
      Effect.gen(function*() {
        const resource = yield* OtlpResource.fromConfig({
          serviceName: "explicit-service",
          serviceVersion: "explicit-version",
          attributes: {
            "custom.attribute": "explicit",
            "service.name": "explicit-attribute-service",
            "service.version": "explicit-attribute-version"
          }
        })

        assert.deepStrictEqual(attributesRecord(resource), {
          ...sdk,
          "custom.attribute": "explicit",
          "service.name": "explicit-service",
          "service.version": "explicit-version"
        })
      }).pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromEnv({
            env: {
              OTEL_SERVICE_NAME: "env-service",
              OTEL_SERVICE_VERSION: "env-version",
              OTEL_RESOURCE_ATTRIBUTES: "service.name=env-attribute-service,service.version=env-attribute-version"
            }
          })
        )
      ))

    it.effect("uses explicit attributes before environment variables", () =>
      Effect.gen(function*() {
        const resource = yield* OtlpResource.fromConfig({
          attributes: {
            "custom.attribute": "explicit",
            "service.name": "explicit-attribute-service",
            "service.version": "explicit-attribute-version"
          }
        })

        assert.deepStrictEqual(attributesRecord(resource), {
          ...sdk,
          "custom.attribute": "explicit",
          "service.name": "explicit-attribute-service",
          "service.version": "explicit-attribute-version"
        })
      }).pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromEnv({
            env: {
              OTEL_SERVICE_NAME: "env-service",
              OTEL_SERVICE_VERSION: "env-version",
              OTEL_RESOURCE_ATTRIBUTES:
                "service.name=env-attribute-service,service.version=env-attribute-version,custom.attribute=env"
            }
          })
        )
      ))

    it.effect("uses dedicated service variables before OTEL resource attributes", () =>
      Effect.gen(function*() {
        const resource = yield* OtlpResource.fromConfig()

        assert.deepStrictEqual(attributesRecord(resource), {
          ...sdk,
          "service.name": "env-service",
          "service.version": "env-version"
        })
      }).pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromEnv({
            env: {
              OTEL_SERVICE_NAME: "env-service",
              OTEL_SERVICE_VERSION: "env-version",
              OTEL_RESOURCE_ATTRIBUTES: "service.name=env-attribute-service,service.version=env-attribute-version"
            }
          })
        )
      ))

    it.effect("omits service.version when it is not configured", () =>
      Effect.gen(function*() {
        const resource = yield* OtlpResource.fromConfig({
          serviceName: "explicit-service"
        })

        assert.deepStrictEqual(attributesRecord(resource), {
          ...sdk,
          "service.name": "explicit-service"
        })
      }).pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromEnv({
            env: {}
          })
        )
      ))
  })

  it.effect("omits service.name when no service name is configured", () =>
    Effect.gen(function*() {
      const resource = yield* OtlpResource.fromConfig()
      assert.deepStrictEqual(attributesRecord(resource), { ...sdk })
    }).pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env: {} }))
    ))

  it.effect("omits service.name even when an executable name is supplied", () =>
    Effect.gen(function*() {
      const resource = yield* OtlpResource.fromConfig({
        attributes: { "process.executable.name": "worker" }
      })
      assert.deepStrictEqual(attributesRecord(resource), {
        ...sdk,
        "process.executable.name": "worker"
      })
    }).pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env: {} }))
    ))

  it("provides SDK defaults", () => {
    assert.deepStrictEqual(attributesRecord(OtlpResource.make({ serviceName: "test" })), {
      ...sdk,
      "service.name": "test"
    })
  })

  it.effect("preserves environment-provided service names without a dedicated service variable", () =>
    Effect.gen(function*() {
      const resource = yield* OtlpResource.fromConfig()
      assert.deepStrictEqual(attributesRecord(resource), { ...sdk, "service.name": "env-service" })
    }).pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv({ env: { OTEL_RESOURCE_ATTRIBUTES: "service.name=env-service" } })
      )
    ))

  it.effect("does not derive a service name from an environment-provided executable name", () =>
    Effect.gen(function*() {
      const resource = yield* OtlpResource.fromConfig()
      assert.deepStrictEqual(attributesRecord(resource), { ...sdk, "process.executable.name": "worker" })
    }).pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv({ env: { OTEL_RESOURCE_ATTRIBUTES: "process.executable.name=worker" } })
      )
    ))

  it("lets custom attributes override the SDK defaults", () => {
    const resource = OtlpResource.make({
      serviceName: "test",
      attributes: {
        "telemetry.sdk.name": "custom",
        "telemetry.sdk.language": "webjs",
        "telemetry.sdk.version": "custom-version"
      }
    })
    assert.deepStrictEqual(attributesRecord(resource), {
      "service.name": "test",
      "telemetry.sdk.name": "custom",
      "telemetry.sdk.language": "webjs",
      "telemetry.sdk.version": "custom-version"
    })
  })

  describe("unknownToAttributeValue", () => {
    it("preserves bigint attribute precision", () => {
      const input = 9_007_199_254_740_993n
      const output = OtlpResource.unknownToAttributeValue(input)

      assert.strictEqual(String(output.intValue), input.toString())
    })
  })
})

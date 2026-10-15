import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import * as Resource from "@effect/opentelemetry/Resource"
import { assert, describe, it } from "@effect/vitest"
import { InMemoryLogRecordExporter, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs"
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

  it.effect("preserves values containing equals signs in OTEL_RESOURCE_ATTRIBUTES", () => {
    const exporter = new InMemoryLogRecordExporter()
    return Effect.gen(function*() {
      yield* Effect.log("test")
      const record = exporter.getFinishedLogRecords()[0]!
      assert.strictEqual(record.resource.attributes["key1"], "val1")
      assert.strictEqual(record.resource.attributes["encoded"], "abc=def==")
      assert.strictEqual(record.resource.attributes["url"], "https://example.com?a=1&b=2")
    }).pipe(
      Effect.provide(
        NodeSdk.layer(() => ({
          logRecordProcessor: [new SimpleLogRecordProcessor({ exporter })]
        }))
      ),
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv({
          env: {
            OTEL_RESOURCE_ATTRIBUTES: "key1=val1,encoded=abc=def==,url=https://example.com?a=1&b=2"
          }
        })
      )
    )
  })
})

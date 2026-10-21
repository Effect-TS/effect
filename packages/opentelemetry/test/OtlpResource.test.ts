import { describe, expect, it } from "@effect/vitest"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as OtlpResource from "../src/OtlpResource.js"

describe("OtlpResource", () => {
  it.effect("fromConfig does not duplicate service attributes from OTEL_RESOURCE_ATTRIBUTES", () =>
    Effect.gen(function*() {
      const resource = yield* OtlpResource.fromConfig()
      expect(resource.attributes).toEqual([
        { key: "deployment.environment", value: { stringValue: "test" } },
        { key: "service.name", value: { stringValue: "my-service" } },
        { key: "service.version", value: { stringValue: "1.2.3" } }
      ])
    }).pipe(
      Effect.withConfigProvider(ConfigProvider.fromMap(
        new Map([[
          "OTEL_RESOURCE_ATTRIBUTES",
          "service.name=my-service,service.version=1.2.3,deployment.environment=test"
        ]])
      ))
    ))
})

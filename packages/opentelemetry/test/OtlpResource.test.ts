import { describe, expect, it } from "@effect/vitest"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as OtlpResource from "../src/OtlpResource.js"

const withConfig = (map: Record<string, string>) =>
  Effect.withConfigProvider(ConfigProvider.fromMap(new Map(Object.entries(map))))

describe("OtlpResource", () => {
  describe("fromConfig", () => {
    it.effect("does not duplicate service.name/service.version from OTEL_RESOURCE_ATTRIBUTES", () =>
      Effect.gen(function*() {
        const resource = yield* OtlpResource.fromConfig()
        const serviceNameAttrs = resource.attributes.filter((attr) => attr.key === "service.name")
        const serviceVersionAttrs = resource.attributes.filter((attr) => attr.key === "service.version")
        expect(serviceNameAttrs).toHaveLength(1)
        expect(serviceNameAttrs[0].value.stringValue).toBe("my-service")
        expect(serviceVersionAttrs).toHaveLength(1)
        expect(serviceVersionAttrs[0].value.stringValue).toBe("1.2.3")
      }).pipe(
        withConfig({
          OTEL_RESOURCE_ATTRIBUTES: "service.name=my-service,service.version=1.2.3,deployment.environment=test"
        })
      ))

    it.effect("keeps other attributes from OTEL_RESOURCE_ATTRIBUTES", () =>
      Effect.gen(function*() {
        const resource = yield* OtlpResource.fromConfig()
        const envAttr = resource.attributes.filter((attr) => attr.key === "deployment.environment")
        expect(envAttr).toHaveLength(1)
        expect(envAttr[0].value.stringValue).toBe("test")
      }).pipe(
        withConfig({
          OTEL_RESOURCE_ATTRIBUTES: "service.name=my-service,deployment.environment=test"
        })
      ))
  })
})

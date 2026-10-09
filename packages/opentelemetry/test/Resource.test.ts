import * as Resource from "@effect/opentelemetry/Resource"
import { assert, describe, it } from "@effect/vitest"

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
})

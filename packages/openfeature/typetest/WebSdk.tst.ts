import type * as FeatureFlag from "@effect/openfeature/FeatureFlag"
import * as WebSdk from "@effect/openfeature/WebSdk"
import { OpenFeature as BrowserOpenFeature } from "@openfeature/web-sdk"
import type * as Layer from "effect/Layer"
import { expect, it } from "tstyche"

it("adapts the official Web SDK client type", () => {
  const webLayer = WebSdk.layer({ client: BrowserOpenFeature.getClient("checkout") })

  expect(webLayer).type.toBe<Layer.Layer<FeatureFlag.FeatureFlag>>()
})

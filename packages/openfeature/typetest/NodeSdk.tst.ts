import type * as FeatureFlag from "@effect/openfeature/FeatureFlag"
import * as NodeSdk from "@effect/openfeature/NodeSdk"
import { OpenFeature as NodeOpenFeature } from "@openfeature/server-sdk"
import type * as Layer from "effect/Layer"
import { expect, it } from "tstyche"

it("adapts the official Node SDK client type", () => {
  const nodeLayer = NodeSdk.layer({ client: NodeOpenFeature.getClient("checkout") })

  expect(nodeLayer).type.toBe<Layer.Layer<FeatureFlag.FeatureFlag>>()
})

/**
 * @since 1.0.0
 */
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import type { NodeSDKConfiguration } from "@opentelemetry/sdk-node"
import { NodeSDK } from "@opentelemetry/sdk-node"

/**
 * @since 1.0.0
 * @category layer
 */
export const layer = (config: Partial<NodeSDKConfiguration>) =>
  Layer.scopedDiscard(Effect.acquireRelease(
    Effect.tap(
      Effect.sync(() => new NodeSDK(config)),
      (sdk) => Effect.sync(() => sdk.start())
    ),
    (sdk) => Effect.promise(() => sdk.shutdown())
  ))

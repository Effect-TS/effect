/**
 * @since 1.0.0
 */
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import { Resource } from "@effect/opentelemetry/Resource"
import type { NodeSDKConfiguration } from "@opentelemetry/sdk-node"
import { NodeSDK } from "@opentelemetry/sdk-node"

/**
 * @since 1.0.0
 * @category layer
 */
export const layer = <R, E>(
  config: Effect.Effect<R, E, Partial<Omit<NodeSDKConfiguration, "resource" | "serviceName">>>
) =>
  Layer.scopedDiscard(Effect.acquireRelease(
    Effect.flatMap(
      Effect.all(config, Resource),
      ([config, resource]) =>
        Effect.sync(() => {
          const sdk = new NodeSDK({ ...config, resource })
          sdk.start()
          return sdk
        })
    ),
    (sdk) => Effect.promise(() => sdk.shutdown())
  ))

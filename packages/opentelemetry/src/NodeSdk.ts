/**
 * @since 1.0.0
 */
import { Resource } from "@effect/opentelemetry/Resource"
import type { NodeSDKConfiguration } from "@opentelemetry/sdk-node"
import { NodeSDK } from "@opentelemetry/sdk-node"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/**
 * @since 1.0.0
 * @category model
 */
export type Configuration = Partial<Omit<NodeSDKConfiguration, "resource" | "serviceName">>

/**
 * @since 1.0.0
 * @category constructor
 */
export const config: (config: Configuration) => Configuration = (config: Configuration) => config

/**
 * @since 1.0.0
 * @category layer
 */
export const layer = <R, E>(
  config: Effect.Effect<R, E, Configuration>
): Layer.Layer<Resource | R, E, never> =>
  Layer.scopedDiscard(Effect.acquireRelease(
    Effect.flatMap(
      Effect.all([config, Resource]),
      ([config, resource]) =>
        Effect.sync(() => {
          const sdk = new NodeSDK({ ...config, resource })
          sdk.start()
          return sdk
        })
    ),
    (sdk) => Effect.promise(() => sdk.shutdown())
  ))

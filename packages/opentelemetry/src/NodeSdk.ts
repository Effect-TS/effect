/**
 * @since 1.0.0
 */
import type { NodeSDKConfiguration } from "@opentelemetry/sdk-node"
import { NodeSDK } from "@opentelemetry/sdk-node"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import * as Layer from "effect/Layer"
import { Resource } from "./Resource"

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
export const layer = (
  config: LazyArg<Configuration>
): Layer.Layer<Resource, never, never> =>
  Layer.scopedDiscard(Effect.acquireRelease(
    Effect.flatMap(
      Resource,
      (resource) =>
        Effect.sync(() => {
          const sdk = new NodeSDK({ ...config(), resource })
          sdk.start()
          return sdk
        })
    ),
    (sdk) => Effect.promise(() => sdk.shutdown())
  ))

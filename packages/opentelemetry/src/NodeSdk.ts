/**
 * @since 1.0.0
 */
import type { NodeSDKConfiguration } from "@opentelemetry/sdk-node"
import { NodeSDK } from "@opentelemetry/sdk-node"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Metrics from "./Metrics"
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

const make = (config: Configuration) =>
  Effect.flatMap(Resource, (resource) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const sdk = new NodeSDK({ ...config, metricReader: undefined, resource })
        sdk.start()
        return sdk
      }),
      (sdk) => Effect.promise(() => sdk.shutdown())
    ))

/**
 * @since 1.0.0
 * @category layer
 */
export const layer = (
  evaluate: LazyArg<Configuration>
): Layer.Layer<Resource, never, never> =>
  Layer.unwrapEffect(
    Effect.sync(() => {
      const config = evaluate()
      const Tracing = Layer.scopedDiscard(make(config))
      return config.metricReader ?
        Layer.merge(
          Tracing,
          Metrics.layer(() => config.metricReader!)
        ) :
        Tracing
    })
  )

/**
 * Browser adapter for OpenFeature Web SDK clients using the Web SDK's synchronous evaluation and static-context model.
 *
 * @since 4.0.0
 */
import type * as OpenFeature from "@openfeature/core"
import type { Client, FlagEvaluationOptions } from "@openfeature/web-sdk"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as FeatureFlag from "./FeatureFlag.ts"

/**
 * Configuration for adapting an OpenFeature Web SDK client.
 *
 * @category models
 * @since 4.0.0
 */
export interface Configuration {
  readonly client: Client
}

const toClientOptions = (options?: FeatureFlag.EvaluationOptions): FlagEvaluationOptions | undefined =>
  options?.hookHints === undefined && options?.hooks === undefined
    ? undefined
    : ({
      ...(options.hookHints === undefined ? {} : { hookHints: options.hookHints }),
      ...(options.hooks === undefined ? {} : { hooks: options.hooks })
    } as FlagEvaluationOptions)

const getClientResult = (
  client: Client,
  flag: FeatureFlag.FlagDefinition,
  details: boolean,
  options: FlagEvaluationOptions | undefined
): unknown => {
  const { key, defaultValue } = flag
  if (typeof defaultValue === "boolean") {
    return details
      ? client.getBooleanDetails(key, defaultValue, options)
      : client.getBooleanValue(key, defaultValue, options)
  }
  if (typeof defaultValue === "string") {
    return details
      ? client.getStringDetails(key, defaultValue, options)
      : client.getStringValue(key, defaultValue, options)
  }
  if (typeof defaultValue === "number") {
    return details
      ? client.getNumberDetails(key, defaultValue, options)
      : client.getNumberValue(key, defaultValue, options)
  }
  // Effect schemas encode arrays as readonly; OpenFeature accepts the same values at runtime.
  const objectDefault = defaultValue as OpenFeature.JsonValue
  return details
    ? client.getObjectDetails(key, objectDefault, options)
    : client.getObjectValue(key, objectDefault, options)
}

const evaluateValue = <S extends FeatureFlag.FlagSchema>(
  client: Client,
  flag: FeatureFlag.FlagDefinition<S>,
  options?: FeatureFlag.EvaluationOptions
): Effect.Effect<S["Type"], FeatureFlag.FeatureFlagError> =>
  Effect.try({
    try: () => getClientResult(client, flag, false, toClientOptions(options)),
    catch: (cause) => new FeatureFlag.FeatureFlagError({ flagKey: flag.key, operation: "value", cause })
  }).pipe(
    Effect.flatMap((value) => FeatureFlag.decode(flag, value))
  )

const evaluateDetails = <S extends FeatureFlag.FlagSchema>(
  client: Client,
  flag: FeatureFlag.FlagDefinition<S>,
  options?: FeatureFlag.EvaluationOptions
): Effect.Effect<FeatureFlag.EvaluationDetails<S["Type"]>, FeatureFlag.FeatureFlagError> =>
  Effect.try({
    try: () => getClientResult(client, flag, true, toClientOptions(options)),
    catch: (cause) => new FeatureFlag.FeatureFlagError({ flagKey: flag.key, operation: "details", cause })
  }).pipe(
    Effect.flatMap((result) => {
      const details = result as OpenFeature.EvaluationDetails<OpenFeature.FlagValue>
      return FeatureFlag.decode(flag, details.value).pipe(
        Effect.map((value) => ({ ...details, value }))
      )
    })
  )

/**
 * Creates a layer that adapts an existing OpenFeature Web SDK client.
 *
 * **Details**
 *
 * Configure static evaluation context through the Web SDK API before providing
 * this layer. This adapter does not mutate shared context during individual
 * evaluations. Results are decoded with each flag's schema.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = ({ client }: Configuration): Layer.Layer<FeatureFlag.FeatureFlag> =>
  FeatureFlag.layer({
    value: (flag, options) => evaluateValue(client, flag, options),
    details: (flag, options) => evaluateDetails(client, flag, options)
  })

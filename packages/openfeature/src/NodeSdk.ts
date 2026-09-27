/**
 * Node.js adapter for OpenFeature server SDK clients with per-Effect-scope evaluation context.
 *
 * @since 4.0.0
 */
import type * as OpenFeature from "@openfeature/core"
import type { Client, EvaluationContext, FlagEvaluationOptions } from "@openfeature/server-sdk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as FeatureFlag from "./FeatureFlag.ts"

/**
 * Configuration for adapting an OpenFeature server SDK client.
 *
 * @category models
 * @since 4.0.0
 */
export interface Configuration {
  readonly client: Client
}

const CurrentEvaluationContexts = Context.Reference<ReadonlyArray<EvaluationContext>>(
  "@effect/openfeature/NodeSdk/CurrentEvaluationContexts",
  { defaultValue: () => [] }
)

const mergeContexts = (contexts: ReadonlyArray<EvaluationContext>): EvaluationContext | undefined =>
  contexts.length === 0 ? undefined : Object.assign({}, ...contexts)

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
  context: EvaluationContext | undefined,
  options: FlagEvaluationOptions | undefined
): Promise<unknown> => {
  const { key, defaultValue } = flag
  if (typeof defaultValue === "boolean") {
    return details
      ? client.getBooleanDetails(key, defaultValue, context, options)
      : client.getBooleanValue(key, defaultValue, context, options)
  }
  if (typeof defaultValue === "string") {
    return details
      ? client.getStringDetails(key, defaultValue, context, options)
      : client.getStringValue(key, defaultValue, context, options)
  }
  if (typeof defaultValue === "number") {
    return details
      ? client.getNumberDetails(key, defaultValue, context, options)
      : client.getNumberValue(key, defaultValue, context, options)
  }
  // Effect schemas encode arrays as readonly; OpenFeature accepts the same values at runtime.
  const objectDefault = defaultValue as OpenFeature.JsonValue
  return details
    ? client.getObjectDetails(key, objectDefault, context, options)
    : client.getObjectValue(key, objectDefault, context, options)
}

const evaluateRaw = <A>(
  flag: FeatureFlag.FlagDefinition,
  operation: "value" | "details",
  options: FeatureFlag.EvaluationOptions | undefined,
  run: (context: EvaluationContext | undefined, options: FlagEvaluationOptions | undefined) => Promise<A>
): Effect.Effect<A, FeatureFlag.FeatureFlagError> =>
  Effect.gen(function*() {
    const contexts = yield* CurrentEvaluationContexts
    return yield* Effect.tryPromise({
      try: () => run(mergeContexts(contexts), toClientOptions(options)),
      catch: (cause) => new FeatureFlag.FeatureFlagError({ flagKey: flag.key, operation, cause })
    })
  })

const evaluateValue = <S extends FeatureFlag.FlagSchema>(
  client: Client,
  flag: FeatureFlag.FlagDefinition<S>,
  options?: FeatureFlag.EvaluationOptions
): Effect.Effect<S["Type"], FeatureFlag.FeatureFlagError> =>
  evaluateRaw(
    flag,
    "value",
    options,
    (context, clientOptions) => getClientResult(client, flag, false, context, clientOptions)
  ).pipe(Effect.flatMap((value) => FeatureFlag.decode(flag, value)))

const evaluateDetails = <S extends FeatureFlag.FlagSchema>(
  client: Client,
  flag: FeatureFlag.FlagDefinition<S>,
  options?: FeatureFlag.EvaluationOptions
): Effect.Effect<FeatureFlag.EvaluationDetails<S["Type"]>, FeatureFlag.FeatureFlagError> =>
  evaluateRaw(
    flag,
    "details",
    options,
    (context, clientOptions) => getClientResult(client, flag, true, context, clientOptions)
  ).pipe(
    Effect.flatMap((result) => {
      const details = result as OpenFeature.EvaluationDetails<OpenFeature.FlagValue>
      return FeatureFlag.decode(flag, details.value).pipe(
        Effect.map((value) => ({ ...details, value }))
      )
    })
  )

/**
 * Creates a layer that adapts an existing OpenFeature server SDK client.
 *
 * **Details**
 *
 * Provider registration and cleanup remain owned by the caller. Evaluation
 * results are decoded with each flag's schema before being returned.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = ({ client }: Configuration): Layer.Layer<FeatureFlag.FeatureFlag> =>
  FeatureFlag.layer({
    value: (flag, options) => evaluateValue(client, flag, options),
    details: (flag, options) => evaluateDetails(client, flag, options)
  })

/**
 * Provides evaluation context to Node flag evaluations in an Effect scope,
 * merging nested scopes from outer to inner before the OpenFeature client
 * applies its global and transaction context rules.
 *
 * @category context
 * @since 4.0.0
 */
export const withEvaluationContext =
  (context: EvaluationContext) => <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.updateService(self, CurrentEvaluationContexts, (contexts) => [...contexts, context])

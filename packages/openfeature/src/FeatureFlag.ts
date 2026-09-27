/**
 * Schema-validated Effect service for evaluating typed OpenFeature flags.
 *
 * @since 4.0.0
 */
import type * as OpenFeature from "@openfeature/core"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

/**
 * OpenFeature evaluation context used to target a flag result.
 *
 * @category models
 * @since 4.0.0
 */
export type EvaluationContext = OpenFeature.EvaluationContext

/**
 * OpenFeature resolution details returned alongside a validated flag value.
 *
 * @category models
 * @since 4.0.0
 */
export type EvaluationDetails<A> = Omit<OpenFeature.EvaluationDetails<OpenFeature.FlagValue>, "value"> & {
  readonly value: A
}

/**
 * Optional hints passed to OpenFeature hooks for one evaluation.
 *
 * @category models
 * @since 4.0.0
 */
export type HookHints = OpenFeature.HookHints

/**
 * Hook run before and after a flag evaluation.
 *
 * **Details**
 *
 * Hooks use OpenFeature's common `BaseHook` shape so the same hook can be
 * passed to evaluations backed by either the Node or Web SDK adapter.
 *
 * @category models
 * @since 4.0.0
 */
export type Hook = OpenFeature.BaseHook

/**
 * Options for one flag evaluation.
 *
 * **Details**
 *
 * `hooks` and `hookHints` are forwarded to the underlying OpenFeature client
 * for the evaluation.
 *
 * @category models
 * @since 4.0.0
 */
export interface EvaluationOptions {
  readonly hookHints?: HookHints | undefined
  readonly hooks?: ReadonlyArray<Hook> | undefined
}

/**
 * Operation names reported by `FeatureFlagError`.
 *
 * @category models
 * @since 4.0.0
 */
export type EvaluationOperation = "value" | "details" | "decode"

/**
 * Error raised when an OpenFeature client fails or a result fails its schema.
 *
 * **Details**
 *
 * OpenFeature resolution errors normally return the supplied default value and
 * can be inspected through the details operation. This error represents
 * failures that escape the client API or values that do not match the flag's
 * schema.
 *
 * @category errors
 * @since 4.0.0
 */
export class FeatureFlagError extends Data.TaggedError("FeatureFlagError")<{
  readonly flagKey: string
  readonly operation: EvaluationOperation
  readonly cause: unknown
}> {}

type JsonValue = null | boolean | number | string | ReadonlyArray<JsonValue> | { readonly [key: string]: JsonValue }

type EncodedFlagValue<E> = [E] extends [boolean] ? E
  : [E] extends [string] ? E
  : [E] extends [number] ? E
  : [E] extends [object | null] ? E
  : never

const FlagDefinitionTypeId = Symbol("@effect/openfeature/FlagDefinition")

/**
 * An Effect Schema codec supported as an OpenFeature flag value.
 *
 * **Details**
 *
 * The encoded form must be a JSON value (including readonly arrays) and
 * decoding must not require additional services.
 *
 * @category models
 * @since 4.0.0
 */
export type FlagSchema = Schema.ConstraintCodec<unknown, JsonValue, never, unknown>

/**
 * A flag definition binds an OpenFeature key, an Effect `Schema`, and the
 * encoded default value used by OpenFeature.
 *
 * **Details**
 *
 * The schema's encoded type must be an OpenFeature JSON value. For schemas that
 * transform values, `defaultValue` is in the encoded form and evaluations
 * return the decoded schema type. Use `flag` to construct definitions so the
 * encoded value type matches one OpenFeature evaluation method.
 *
 * @category models
 * @since 4.0.0
 */
export interface FlagDefinition<S extends FlagSchema = FlagSchema> {
  readonly [FlagDefinitionTypeId]: S
  readonly key: string
  readonly schema: S
  readonly defaultValue: S["Encoded"]
}

/**
 * Creates a typed flag definition.
 *
 * **Details**
 *
 * The schema determines the result type, validates values returned by the
 * provider, and constrains the default value to the schema's encoded type.
 * Encoded values must belong to one OpenFeature evaluation type: boolean,
 * string, number, or object (including arrays and null). Mixed types such as
 * `string | null` cannot be evaluated with a single SDK method.
 *
 * @category definitions
 * @since 4.0.0
 */
export const flag = <const S extends FlagSchema>(definition: {
  readonly key: string
  readonly schema: S
  readonly defaultValue: NoInfer<EncodedFlagValue<S["Encoded"]>>
}): FlagDefinition<S> => ({ ...definition, [FlagDefinitionTypeId]: definition.schema })

/**
 * Groups flag definitions into an application catalog while preserving its
 * exact keys and each flag's inferred schema type.
 *
 * @category definitions
 * @since 4.0.0
 */
export const define = <const Flags extends Readonly<Record<string, FlagDefinition>>>(flags: Flags): Flags => flags

/**
 * Service contract for evaluating schema-defined OpenFeature flags.
 *
 * @category services
 * @since 4.0.0
 */
export interface FeatureFlagService {
  readonly value: <S extends FlagSchema>(
    flag: FlagDefinition<S>,
    options?: EvaluationOptions | undefined
  ) => Effect.Effect<S["Type"], FeatureFlagError>
  readonly details: <S extends FlagSchema>(
    flag: FlagDefinition<S>,
    options?: EvaluationOptions | undefined
  ) => Effect.Effect<EvaluationDetails<S["Type"]>, FeatureFlagError>
}

/**
 * Context service used by Effect programs to evaluate OpenFeature flags.
 *
 * @category services
 * @since 4.0.0
 */
export class FeatureFlag
  extends Context.Service<FeatureFlag, FeatureFlagService>()("@effect/openfeature/FeatureFlag")
{}

/**
 * Creates a layer that provides a custom Effect feature-flag service.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (service: FeatureFlagService): Layer.Layer<FeatureFlag> =>
  Layer.succeed(FeatureFlag, FeatureFlag.of(service))

const use = <A>(f: (service: FeatureFlagService) => Effect.Effect<A, FeatureFlagError>) =>
  Effect.flatMap(FeatureFlag, f)

/**
 * Evaluates a flag and decodes the OpenFeature result with its schema.
 *
 * @category evaluation
 * @since 4.0.0
 */
export const value = <S extends FlagSchema>(
  flag: FlagDefinition<S>,
  options?: EvaluationOptions | undefined
): Effect.Effect<S["Type"], FeatureFlagError, FeatureFlag> => use((service) => service.value(flag, options))

/**
 * Evaluates a flag and decodes its value while preserving OpenFeature
 * resolution metadata.
 *
 * @category evaluation
 * @since 4.0.0
 */
export const details = <S extends FlagSchema>(
  flag: FlagDefinition<S>,
  options?: EvaluationOptions | undefined
): Effect.Effect<EvaluationDetails<S["Type"]>, FeatureFlagError, FeatureFlag> =>
  use((service) => service.details(flag, options))

/** @internal */
export const decode = <S extends FlagSchema>(
  flag: FlagDefinition<S>,
  value: unknown
): Effect.Effect<S["Type"], FeatureFlagError> =>
  Schema.decodeUnknownEffect(flag.schema)(value).pipe(
    Effect.mapError((cause) => new FeatureFlagError({ flagKey: flag.key, operation: "decode", cause }))
  )

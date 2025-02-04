/**
 * @since 1.0.0
 */

import { dual } from "effect/Function"
import * as Predicate from "effect/Predicate"
import * as String from "effect/String"
import type { Span } from "effect/Tracer"
import type { Simplify } from "effect/Types"

/**
 * The attributes used to describe telemetry in the context of Generative
 * Artificial Intelligence (GenAI) Models requests and responses.
 *
 * {@see https://opentelemetry.io/docs/specs/semconv/attributes-registry/gen-ai/}
 *
 * @since 1.0.0
 * @category models
 */
export type GenAITelemetryAttributes = Simplify<
  & GenAI.AttributesWithPrefix<GenAI.BaseAttributes, "gen_ai">
  & GenAI.AttributesWithPrefix<GenAI.OperationAttributes, "gen_ai.operation">
  & GenAI.AttributesWithPrefix<GenAI.TokenAttributes, "gen_ai.token">
  & GenAI.AttributesWithPrefix<GenAI.UsageAttributes, "gen_ai.usage">
  & GenAI.AttributesWithPrefix<GenAI.RequestAttributes, "gen_ai.request">
  & GenAI.AttributesWithPrefix<GenAI.ResponseAttributes, "gen_ai.response">
>

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace GenAI {
  /**
   * All telemetry attributes which are part of the GenAI specification.
   *
   * @since 1.0.0
   * @category models
   */
  export type AllAttributes =
    & BaseAttributes
    & OperationAttributes
    & TokenAttributes
    & UsageAttributes
    & RequestAttributes
    & ResponseAttributes

  /**
   * Telemetry attributes which are part of the GenAI specification and are
   * namespaced by `gen_ai`.
   *
   * @since 1.0.0
   * @category models
   */
  export interface BaseAttributes {
    /**
     * The Generative AI product as identified by the client or server
     * instrumentation.
     */
    readonly system?: (string & {}) | WellKnownSystem | null | undefined
  }

  /**
   * Telemetry attributes which are part of the GenAI specification and are
   * namespaced by `gen_ai.operation`.
   *
   * @since 1.0.0
   * @category models
   */
  export interface OperationAttributes {
    readonly name?: (string & {}) | WellKnownOperationName | null | undefined
  }

  /**
   * Telemetry attributes which are part of the GenAI specification and are
   * namespaced by `gen_ai.token`.
   *
   * @since 1.0.0
   * @category models
   */
  export interface TokenAttributes {
    readonly type?: string | null | undefined
  }

  /**
   * Telemetry attributes which are part of the GenAI specification and are
   * namespaced by `gen_ai.usage`.
   *
   * @since 1.0.0
   * @category models
   */
  export interface UsageAttributes {
    readonly inputTokens?: number | null | undefined
    readonly outputTokens?: number | null | undefined
  }

  /**
   * Telemetry attributes which are part of the GenAI specification and are
   * namespaced by `gen_ai.request`.
   *
   * @since 1.0.0
   * @category models
   */
  export interface RequestAttributes {
    /**
     * The name of the GenAI model a request is being made to.
     */
    readonly model?: string | null | undefined
    /**
     * The temperature setting for the GenAI request.
     */
    readonly temperature?: number | null | undefined
    /**
     * The temperature setting for the GenAI request.
     */
    readonly topK?: number | null | undefined
    /**
     * The top_k sampling setting for the GenAI request.
     */
    readonly topP?: number | null | undefined
    /**
     * The top_p sampling setting for the GenAI request.
     */
    readonly maxTokens?: number | null | undefined
    /**
     * The encoding formats requested in an embeddings operation, if specified.
     */
    readonly encodingFormats?: ReadonlyArray<string> | null | undefined
    /**
     * List of sequences that the model will use to stop generating further
     * tokens.
     */
    readonly stopSequences?: ReadonlyArray<string> | null | undefined
    /**
     * The frequency penalty setting for the GenAI request.
     */
    readonly frequencyPenalty?: number | null | undefined
    /**
     * The presence penalty setting for the GenAI request.
     */
    readonly presencePenalty?: number | null | undefined
    /**
     * The seed setting for the GenAI request. Requests with same seed value
     * are more likely to return same result.
     */
    readonly seed?: number | null | undefined
  }

  /**
   * Telemetry attributes which are part of the GenAI specification and are
   * namespaced by `gen_ai.response`.
   *
   * @since 1.0.0
   * @category models
   */
  export interface ResponseAttributes {
    /**
     * The unique identifier for the completion.
     */
    readonly id?: string | null | undefined
    /**
     * The name of the model that generated the response.
     */
    readonly model?: string | null | undefined
    /**
     * Array of reasons the model stopped generating tokens, corresponding to
     * each generation received.
     */
    readonly finishReasons?: ReadonlyArray<string> | null | undefined
  }

  /**
   * The `gen_ai.operation.name` attribute has the following list of well-known
   * values.
   *
   * If one of them applies, then the respective value **MUST** be used;
   * otherwise, a custom value **MAY** be used.
   *
   * @since 1.0.0
   * @category models
   */
  export type WellKnownOperationName = "chat" | "embeddings" | "text_completion"

  /**
   * The `gen_ai.system` attribute has the following list of well-known values.
   *
   * If one of them applies, then the respective value **MUST** be used;
   * otherwise, a custom value **MAY** be used.
   *
   * @since 1.0.0
   * @category models
   */
  export type WellKnownSystem =
    | "anthropic"
    | "aws.bedrock"
    | "az.ai.inference"
    | "az.ai.openai"
    | "cohere"
    | "deepseek"
    | "gemini"
    | "groq"
    | "ibm.watsonx.ai"
    | "mistral_ai"
    | "openai"
    | "perplexity"
    | "vertex_ai"
    | "xai"

  /**
   * @since 1.0.0
   * @category models
   */
  export type AttributesWithPrefix<Attributes extends Record<string, any>, Prefix extends string> = {
    [Name in keyof Attributes as `${Prefix}.${FormatAttributeName<Name>}`]: Attributes[Name]
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type FormatAttributeName<T extends string | number | symbol> = T extends string ?
    T extends `${infer First}${infer Rest}`
      ? `${First extends Uppercase<First> ? "_" : ""}${Lowercase<First>}${FormatAttributeName<Rest>}`
    : T :
    never
}

/**
 * @since 1.0.0
 * @category utilities
 */
export const addSpanAttributes = (
  keyPrefix: string,
  transformKey: (key: string) => string
) =>
<Attributes extends Record<string, any>>(span: Span, attributes: Attributes): void => {
  for (const [key, value] of Object.entries(attributes)) {
    if (Predicate.isNotNullable(value)) {
      span.attribute(`${keyPrefix}.${transformKey(key)}`, value)
    }
  }
}

const addSpanBaseAttributes = addSpanAttributes("gen_ai", String.camelToSnake)<GenAI.BaseAttributes>
const addSpanOperationAttributes = addSpanAttributes("gen_ai.operation", String.camelToSnake)<GenAI.OperationAttributes>
const addSpanRequestAttributes = addSpanAttributes("gen_ai.request", String.camelToSnake)<GenAI.RequestAttributes>
const addSpanResponseAttributes = addSpanAttributes("gen_ai.response", String.camelToSnake)<GenAI.ResponseAttributes>
const addSpanTokenAttributes = addSpanAttributes("gen_ai.token", String.camelToSnake)<GenAI.TokenAttributes>
const addSpanUsageAttributes = addSpanAttributes("gen_ai.usage", String.camelToSnake)<GenAI.UsageAttributes>

/**
 * @since 1.0.0
 * @since models
 */
export type GenAITelemetryAttributeOptions = GenAI.BaseAttributes & {
  readonly operation?: GenAI.OperationAttributes | undefined
  readonly request?: GenAI.RequestAttributes | undefined
  readonly response?: GenAI.ResponseAttributes | undefined
  readonly token?: GenAI.TokenAttributes | undefined
  readonly usage?: GenAI.UsageAttributes | undefined
}

/**
 * Applies the specified GenAI telemetry attributes to the provided `Span`.
 *
 * **NOTE**: This method will mutate the `Span` **in-place**.
 *
 * @since 1.0.0
 * @since utilities
 */
export const addGenAIAnnotations = dual<
  (options: GenAITelemetryAttributeOptions) => (span: Span) => void,
  (span: Span, options: GenAITelemetryAttributeOptions) => void
>(2, (span, options) => {
  addSpanBaseAttributes(span, { system: options.system })
  if (Predicate.isNotNullable(options.operation)) addSpanOperationAttributes(span, options.operation)
  if (Predicate.isNotNullable(options.request)) addSpanRequestAttributes(span, options.request)
  if (Predicate.isNotNullable(options.response)) addSpanResponseAttributes(span, options.response)
  if (Predicate.isNotNullable(options.token)) addSpanTokenAttributes(span, options.token)
  if (Predicate.isNotNullable(options.usage)) addSpanUsageAttributes(span, options.usage)
})

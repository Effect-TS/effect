/**
 * @since 1.0.0
 */
import * as AiTelemetry from "@effect/ai/AiTelemetry"
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
 * @category Models
 */
export type OpenAiTelemetryAttributes = Simplify<
  & AiTelemetry.GenAITelemetryAttributes
  & AiTelemetry.GenAI.AttributesWithPrefix<OpenAiTelemetry.RequestAttributes, "gen_ai.openai.request">
  & AiTelemetry.GenAI.AttributesWithPrefix<OpenAiTelemetry.ResponseAttributes, "gen_ai.openai.request">
>

/**
 * @since 1.0.0
 */
export declare namespace OpenAiTelemetry {
  /**
   * All telemetry attributes which are part of the GenAI specification,
   * including the OpenAi-specific attributes.
   *
   * @since 1.0.0
   * @category Models
   */
  export type AllAttributes = AiTelemetry.GenAI.AllAttributes & RequestAttributes & ResponseAttributes

  /**
   * Telemetry attributes which are part of the GenAI specification and are
   * namespaced by `gen_ai.openai.request`.
   *
   * @since 1.0.0
   * @category Models
   */
  export interface RequestAttributes {
    /**
     * The response format that is requested.
     */
    readonly responseFormat?: (string & {}) | WellKnownResponseFormat | null | undefined
    /**
     * The service tier requested. May be a specific tier, `default`, or `auto`.
     */
    readonly serviceTier?: (string & {}) | WellKnownServiceTier | null | undefined
  }

  /**
   * Telemetry attributes which are part of the GenAI specification and are
   * namespaced by `gen_ai.openai.response`.
   *
   * @since 1.0.0
   * @category Models
   */
  export interface ResponseAttributes {
    /**
     * The service tier used for the response.
     */
    readonly serviceTier?: string | null | undefined
    /**
     * A fingerprint to track any eventual change in the Generative AI
     * environment.
     */
    readonly systemFingerprint?: string | null | undefined
  }

  /**
   * The `gen_ai.openai.request.response_format` attribute has the following
   * list of well-known values.
   *
   * If one of them applies, then the respective value **MUST** be used;
   * otherwise, a custom value **MAY** be used.
   *
   * @since 1.0.0
   * @category Models
   */
  export type WellKnownResponseFormat = "json_object" | "json_schema" | "text"

  /**
   * The `gen_ai.openai.request.service_tier` attribute has the following
   * list of well-known values.
   *
   * If one of them applies, then the respective value **MUST** be used;
   * otherwise, a custom value **MAY** be used.
   *
   * @since 1.0.0
   * @category Models
   */
  export type WellKnownServiceTier = "auto" | "default"
}

/**
 * @since 1.0.0
 * @since Models
 */
export type OpenAiTelemetryAttributeOptions = AiTelemetry.GenAITelemetryAttributeOptions & {
  openai?: {
    request?: OpenAiTelemetry.RequestAttributes | undefined
    response?: OpenAiTelemetry.ResponseAttributes | undefined
  } | undefined
}

const addOpenAiRequestAttributes = AiTelemetry.addSpanAttributes("gen_ai.openai.request", String.camelToSnake)<
  OpenAiTelemetry.RequestAttributes
>
const addOpenAiResponseAttributes = AiTelemetry.addSpanAttributes("gen_ai.openai.response", String.camelToSnake)<
  OpenAiTelemetry.ResponseAttributes
>

/**
 * Applies the specified OpenAi GenAI telemetry attributes to the provided
 * `Span`.
 *
 * **NOTE**: This method will mutate the `Span` **in-place**.
 *
 * @since 1.0.0
 * @since Utilities
 */
export const addGenAIAnnotations = dual<
  (options: OpenAiTelemetryAttributeOptions) => (span: Span) => void,
  (span: Span, options: OpenAiTelemetryAttributeOptions) => void
>(2, (span, options) => {
  AiTelemetry.addGenAIAnnotations(span, options)
  if (Predicate.isNotNullable(options.openai)) {
    if (Predicate.isNotNullable(options.openai.request)) {
      addOpenAiRequestAttributes(span, options.openai.request)
    }
    if (Predicate.isNotNullable(options.openai.response)) {
      addOpenAiResponseAttributes(span, options.openai.response)
    }
  }
})

/**
 * Google Vertex telemetry attributes for OpenTelemetry integration.
 *
 * Provides Google Vertex-specific GenAI telemetry attributes following
 * OpenTelemetry semantic conventions, extending the base GenAI attributes with
 * Google Vertex-specific request and response metadata.
 *
 * @since 4.0.0
 */
import { dual } from "effect/Function"
import * as String from "effect/String"
import type { Span } from "effect/Tracer"
import type { Simplify } from "effect/Types"
import * as Telemetry from "effect/unstable/ai/Telemetry"

/**
 * The attributes used to describe telemetry in the context of Generative
 * Artificial Intelligence (GenAI) Models requests and responses.
 *
 * @see https://opentelemetry.io/docs/specs/semconv/attributes-registry/gen-ai/
 * @category models
 * @since 4.0.0
 */
export type GoogleVertexTelemetryAttributes = Simplify<
  & Telemetry.GenAITelemetryAttributes
  & Telemetry.AttributesWithPrefix<RequestAttributes, "gen_ai.google_vertex.request">
  & Telemetry.AttributesWithPrefix<ResponseAttributes, "gen_ai.google_vertex.response">
>

/**
 * All telemetry attributes which are part of the GenAI specification, including
 * the Google Vertex-specific attributes.
 *
 * @category models
 * @since 4.0.0
 */
export type AllAttributes = Telemetry.AllAttributes & RequestAttributes & ResponseAttributes

/**
 * Telemetry attributes which are part of the GenAI specification and are
 * namespaced by `gen_ai.google_vertex.request`.
 *
 * @category models
 * @since 4.0.0
 */
export interface RequestAttributes {
  /**
   * The thinking (reasoning) token budget configured for the request.
   */
  readonly thinkingBudgetTokens?: number | null | undefined
}

/**
 * Telemetry attributes which are part of the GenAI specification and are
 * namespaced by `gen_ai.google_vertex.response`.
 *
 * @category models
 * @since 4.0.0
 */
export interface ResponseAttributes {
  /**
   * The finish reason from the response.
   */
  readonly finishReason?: string | null | undefined
  /**
   * Number of cached content tokens read for the request.
   */
  readonly cachedContentTokens?: number | null | undefined
  /**
   * Number of reasoning (thoughts) tokens generated.
   */
  readonly thoughtsTokens?: number | null | undefined
}

/**
 * Options accepted by `addGenAIAnnotations`, combining standard GenAI telemetry
 * attributes with optional Google Vertex request and response attributes.
 *
 * @category models
 * @since 4.0.0
 */
export type GoogleVertexTelemetryAttributeOptions = Telemetry.GenAITelemetryAttributeOptions & {
  googleVertex?: {
    request?: RequestAttributes | undefined
    response?: ResponseAttributes | undefined
  } | undefined
}

const addRequestAttributes = Telemetry.addSpanAttributes("gen_ai.google_vertex.request", String.camelToSnake)<
  RequestAttributes
>
const addResponseAttributes = Telemetry.addSpanAttributes("gen_ai.google_vertex.response", String.camelToSnake)<
  ResponseAttributes
>

/**
 * Applies the specified Google Vertex GenAI telemetry attributes to the
 * provided `Span`.
 *
 * **Gotchas**
 *
 * This method mutates the `Span` in place.
 *
 * @category utils
 * @since 4.0.0
 */
export const addGenAIAnnotations: {
  (options: GoogleVertexTelemetryAttributeOptions): (span: Span) => void
  (span: Span, options: GoogleVertexTelemetryAttributeOptions): void
} = dual(2, (span: Span, options: GoogleVertexTelemetryAttributeOptions) => {
  Telemetry.addGenAIAnnotations(span, options)
  if (options.googleVertex != null) {
    if (options.googleVertex.request != null) {
      addRequestAttributes(span, options.googleVertex.request)
    }
    if (options.googleVertex.response != null) {
      addResponseAttributes(span, options.googleVertex.response)
    }
  }
})

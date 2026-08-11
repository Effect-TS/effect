/**
 * Google Agent Platform telemetry attributes for OpenTelemetry integration.
 *
 * Provides Google Agent Platform-specific GenAI telemetry attributes following
 * OpenTelemetry semantic conventions, extending the base GenAI attributes with
 * Google Agent Platform-specific request and response metadata.
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
export type GoogleAgentPlatformTelemetryAttributes = Simplify<
  & Telemetry.GenAITelemetryAttributes
  & Telemetry.AttributesWithPrefix<RequestAttributes, "gen_ai.google_agent_platform.request">
  & Telemetry.AttributesWithPrefix<ResponseAttributes, "gen_ai.google_agent_platform.response">
>

/**
 * All telemetry attributes which are part of the GenAI specification, including
 * the Google Agent Platform-specific attributes.
 *
 * @category models
 * @since 4.0.0
 */
export type AllAttributes = Telemetry.AllAttributes & RequestAttributes & ResponseAttributes

/**
 * Telemetry attributes which are part of the GenAI specification and are
 * namespaced by `gen_ai.google_agent_platform.request`.
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
 * namespaced by `gen_ai.google_agent_platform.response`.
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
 * attributes with optional Google Agent Platform request and response attributes.
 *
 * @category models
 * @since 4.0.0
 */
export type GoogleAgentPlatformTelemetryAttributeOptions = Telemetry.GenAITelemetryAttributeOptions & {
  googleAgentPlatform?: {
    request?: RequestAttributes | undefined
    response?: ResponseAttributes | undefined
  } | undefined
}

const addRequestAttributes = Telemetry.addSpanAttributes("gen_ai.google_agent_platform.request", String.camelToSnake)<
  RequestAttributes
>
const addResponseAttributes = Telemetry.addSpanAttributes("gen_ai.google_agent_platform.response", String.camelToSnake)<
  ResponseAttributes
>

/**
 * Applies the specified Google Agent Platform GenAI telemetry attributes to the
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
  (options: GoogleAgentPlatformTelemetryAttributeOptions): (span: Span) => void
  (span: Span, options: GoogleAgentPlatformTelemetryAttributeOptions): void
} = dual(2, (span: Span, options: GoogleAgentPlatformTelemetryAttributeOptions) => {
  Telemetry.addGenAIAnnotations(span, options)
  if (options.googleAgentPlatform != null) {
    if (options.googleAgentPlatform.request != null) {
      addRequestAttributes(span, options.googleAgentPlatform.request)
    }
    if (options.googleAgentPlatform.response != null) {
      addResponseAttributes(span, options.googleAgentPlatform.response)
    }
  }
})

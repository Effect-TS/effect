import * as Context from "effect/Context"
import type * as Generated from "./Generated.js"
import * as InternalUtilities from "./internal/utilities.js"

// =============================================================================
// Google Generative Ai Provider Metadata
// =============================================================================

/**
 * @since 1.0.0
 * @category Context
 */
export class ProviderMetadata extends Context.Tag(InternalUtilities.ProviderMetadataKey)<
  ProviderMetadata,
  ProviderMetadata.Service
>() {}

/**
 * @since 1.0.0
 */
export declare namespace ProviderMetadata {
  /**
   * @since 1.0.0
   * @category Provider Metadata
   */
  export interface Service {
    /**
     * Citations to sources for a specific response.
     */
    readonly citationSources?: ReadonlyArray<typeof Generated.CitationSource.Encoded> | undefined
    /**
     * Attribution information for sources that contributed to a grounded answer.
     */
    readonly groundingAttributions?: ReadonlyArray<typeof Generated.GroundingAttribution.Encoded> | undefined
    /**
     * Grounding metadata for the candidate.
     */
    readonly groundingMetadata?: ReadonlyArray<typeof Generated.GroundingMetadata.Encoded> | undefined
    /**
     * The URLs that were retrieved by the URL context retrieval tool.
     */
    readonly retrievedUrls?: ReadonlyArray<typeof Generated.UrlMetadata.Encoded> | undefined
    /**
     * List of ratings for the safety of a response candidate.
     *
     * There is at most one rating per category.
     */
    readonly safetyRatings?: ReadonlyArray<typeof Generated.SafetyRating.Encoded> | undefined
  }
}

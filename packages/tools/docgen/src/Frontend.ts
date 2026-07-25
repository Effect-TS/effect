/**
 * Documentation analysis frontend seam.
 *
 * @since 0.6.0
 */
import type * as Effect from "effect/Effect"
import type * as Domain from "./Domain.ts"
import type * as SemanticModel from "./SemanticModel.ts"

/**
 * A concrete frontend that compiles one selected input surface.
 *
 * @category models
 * @since 0.6.0
 */
export interface DocumentationFrontend<R = never> {
  readonly analyze: Effect.Effect<SemanticModel.SemanticModel, Domain.DocgenError, R>
}

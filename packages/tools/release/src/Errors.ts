import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

export class ReleaseError extends Schema.TaggedError<ReleaseError>()("ReleaseError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect())
}) {}

/**
 * Placeholder for contract members that the implementation run fills in.
 * Throwing (rather than failing) keeps "not implemented" distinct from every
 * modelled `ReleaseError` in the tests.
 */
export const notImplemented = (member: string): never => {
  throw new Error(`not implemented: ${member}`)
}

export const notImplementedEffect = (member: string): Effect.Effect<never> =>
  Effect.die(new Error(`not implemented: ${member}`))

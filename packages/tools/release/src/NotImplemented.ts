import * as Effect from "effect/Effect"

/**
 * Placeholder for contract members that the implementation run fills in.
 * Throwing (rather than failing) keeps "not implemented" distinct from every
 * modelled `ReleaseError` in the tests. Delete this module once every member
 * is implemented.
 */
export const notImplemented = (member: string): never => {
  throw new Error(`not implemented: ${member}`)
}

export const notImplementedEffect = (member: string): Effect.Effect<never> =>
  Effect.die(new Error(`not implemented: ${member}`))

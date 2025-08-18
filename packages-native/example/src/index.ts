/**
 * @effect-native/example
 * 
 * Example custom package in the effect-native fork.
 * This demonstrates how to create packages that extend Effect
 * without being part of the upstream repository.
 * 
 * @packageDocumentation
 * @since 0.0.1
 */

import * as Effect from "effect/Effect"

/**
 * Example function that uses Effect
 * @since 0.0.1
 */
export const greet = (name: string): Effect.Effect<string> =>
  Effect.succeed(`Hello ${name} from @effect-native/example!`)

/**
 * Re-export for convenience
 * @since 0.0.1
 */
export { Effect }
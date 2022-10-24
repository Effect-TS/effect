import type { Context } from "@fp-ts/data/Context"

/**
 * Performs the specified effect if this layer succeeds.
 *
 * @tsplus static effect/core/io/Layer.Aspects tap
 * @tsplus pipeable effect/core/io/Layer tap
 * @category sequencing
 * @since 1.0.0
 */
export function tap<ROut, RIn2, E2, X>(f: (context: Context<ROut>) => Effect<RIn2, E2, X>) {
  return <RIn, E>(self: Layer<RIn, E, ROut>): Layer<RIn | RIn2, E | E2, ROut> =>
    self.flatMap((environment) =>
      Layer.fromEffectEnvironment(f(environment).map(() => environment))
    )
}

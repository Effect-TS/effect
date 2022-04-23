import { LiveRandom } from "@effect/core/io/Random/operations/live";

/**
 * @tsplus static ets/Random/Ops withSeed
 */
export function withSeed(seed: number) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    Effect.succeed(new LiveRandom(seed)).flatMap((random) =>
      effect.apply(DefaultEnv.services.value.locally(Env(Random.Tag, random)))
    );
}

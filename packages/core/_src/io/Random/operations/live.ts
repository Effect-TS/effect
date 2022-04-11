import { RandomSym } from "@effect/core/io/Random/definition";

/**
 * @tsplus static ets/Random/Ops live
 */
export function live(seed: number): Random {
  const PRNG = new RandomPCG(seed);

  const next: UIO<number> = Effect.succeed(() => PRNG.number());

  const nextBoolean: UIO<boolean> = next.flatMap((n) => Effect.succeed(n > 0.5));

  const nextInt: UIO<number> = Effect.succeed(() => PRNG.integer(0));

  function nextRange(low: number, high: number, __tsplusTrace?: string): UIO<number> {
    return next.flatMap((n) => Effect.succeed((high - low) * n + low));
  }

  function nextIntBetween(
    low: number,
    high: number,
    __tsplusTrace?: string
  ): UIO<number> {
    return Effect.succeed(() => PRNG.integer(1 + high - low) + low);
  }

  function shuffle<A>(
    collection: LazyArg<Collection<A>>,
    __tsplusTrace?: string
  ): UIO<Collection<A>> {
    return shuffleWith(collection, (n) => nextIntBetween(0, n));
  }

  return {
    [RandomSym]: RandomSym,
    next,
    nextBoolean,
    nextInt,
    nextRange,
    nextIntBetween,
    shuffle
  };
}

function shuffleWith<A>(
  collection: LazyArg<Collection<A>>,
  nextIntBounded: (n: number) => UIO<number>,
  __tsplusTrace?: string
): UIO<Collection<A>> {
  return Effect.suspendSucceed(() => {
    const collection0 = collection();

    return Effect.Do()
      .bind("buffer", () =>
        Effect.succeed(() => {
          const buffer: Array<A> = [];
          for (const element of collection0) {
            buffer.push(element);
          }
          return buffer;
        }))
      .bindValue(
        "swap",
        ({ buffer }) =>
          (i1: number, i2: number) =>
            Effect.succeed(() => {
              const tmp = buffer[i1]!;
              buffer[i1] = buffer[i2]!;
              buffer[i2] = tmp;
              return buffer;
            })
      )
      .tap(({ buffer, swap }) => {
        const ns: Array<number> = [];
        for (let i = buffer.length; i >= 2; i = i - 1) {
          ns.push(i);
        }
        return Effect.forEachDiscard(ns, (n) => nextIntBounded(n).flatMap((k) => swap(n - 1, k)));
      })
      .map(({ buffer }) => buffer);
  });
}

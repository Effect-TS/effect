import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Creates a sink that effectfully folds elements of type `In` into a
 * structure of type `S`, until `max` worth of elements (determined by the
 * `costFn`) have been folded.
 *
 * The `decompose` function will be used for decomposing elements that cause
 * an `S` aggregate to cross `max` into smaller elements. Be vigilant with
 * this function, it has to generate "simpler" values or the fold may never
 * end. A value is considered indivisible if `decompose` yields the empty
 * chunk or a single-valued chunk. In these cases, there is no other choice
 * than to yield a value that will cross the threshold.
 *
 * @tsplus static effect/core/stream/Sink.Ops foldWeightedDecomposeEffect
 */
export function foldWeightedDecomposeEffect<R, E, R2, E2, R3, E3, In, S>(
  z: S,
  costFn: (s: S, input: In) => Effect<R, E, number>,
  max: number,
  decompose: (input: In) => Effect<R2, E2, Chunk<In>>,
  f: (s: S, input: In) => Effect<R3, E3, S>
): Sink<R | R2 | R3, E | E2 | E3, In, In, S> {
  return Sink.suspend(new SinkInternal(go(z, costFn, max, decompose, f, false, 0)))
}

function go<R, E, R2, E2, R3, E3, In, S>(
  s: S,
  costFn: (s: S, input: In) => Effect<R, E, number>,
  max: number,
  decompose: (input: In) => Effect<R2, E2, Chunk<In>>,
  f: (s: S, input: In) => Effect<R3, E3, S>,
  dirty: boolean,
  cost: number
): Channel<R | R2 | R3, E | E2 | E3, Chunk<In>, unknown, E | E2 | E3, Chunk<In>, S> {
  return Channel.readWith(
    (chunk: Chunk<In>) =>
      Channel.fromEffect(
        fold(chunk, s, costFn, max, decompose, f, dirty, cost, 0)
      ).flatMap(({ tuple: [nextS, nextCost, nextDirty, leftovers] }) =>
        leftovers.isNonEmpty
          ? Channel.write(leftovers) > Channel.succeed(nextS)
          : cost > max
          ? Channel.succeed(nextS)
          : go(nextS, costFn, max, decompose, f, nextDirty, nextCost)
      ),
    (err) => Channel.fail(err),
    (): Channel<
      R | R2 | R3,
      E | E2 | E3,
      Chunk<In>,
      unknown,
      E | E2 | E3,
      Chunk<In>,
      S
    > => Channel.succeed(s)
  )
}

function fold<R, E, R2, E2, R3, E3, In, S>(
  input: Chunk<In>,
  s: S,
  costFn: (s: S, input: In) => Effect<R, E, number>,
  max: number,
  decompose: (input: In) => Effect<R2, E2, Chunk<In>>,
  f: (s: S, input: In) => Effect<R3, E3, S>,
  dirty: boolean,
  cost: number,
  index: number
): Effect<R | R2 | R3, E | E2 | E3, Tuple<[S, number, boolean, Chunk<In>]>> {
  if (index === input.length) {
    return Effect.sync(Tuple(s, cost, dirty, Chunk.empty<In>()))
  }

  const elem = input.unsafeGet(index)

  return costFn(s, elem)
    .map((addedCost) => cost + addedCost)
    .flatMap((total) => {
      if (total <= max) {
        return f(s, elem).flatMap((s) =>
          fold(input, s, costFn, max, decompose, f, true, total, index + 1)
        )
      }

      return decompose(elem).flatMap((decomposed) => {
        if (decomposed.length <= 1 && !dirty) {
          // If `elem` cannot be decomposed, we need to cross the `max` threshold. To
          // minimize "injury", we only allow this when we haven't added anything else
          // to the aggregate (dirty = false).
          return f(s, elem).map((s) => Tuple(s, total, true, input.drop(index + 1)))
        }

        if (decomposed.length <= 1 && dirty) {
          // If the state is dirty and `elem` cannot be decomposed, we stop folding
          // and include `elem` in the leftovers.
          return Effect.sync(Tuple(s, cost, dirty, input.drop(index)))
        }
        // `elem` got decomposed, so we will recurse with the decomposed elements pushed
        // into the chunk we're processing and see if we can aggregate further.
        return fold(
          decomposed + input.drop(index + 1),
          s,
          costFn,
          max,
          decompose,
          f,
          dirty,
          cost,
          0
        )
      })
    })
}

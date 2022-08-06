import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Creates a sink that folds elements of type `In` into a structure of type
 * `S`, until `max` worth of elements (determined by the `costFn`) have been
 * folded.
 *
 * The `decompose` function will be used for decomposing elements that cause
 * an `S` aggregate to cross `max` into smaller elements.
 *
 * Be vigilant with this function, it has to generate "simpler" values or the
 * fold may never end. A value is considered indivisible if `decompose` yields
 * the empty chunk or a single-valued chunk. In these cases, there is no other
 * choice than to yield a value that will cross the threshold.
 *
 * The `foldWeightedDecomposeEffect` allows the decompose function to return a
 * `Effect` value, and consequently it allows the sink to fail.
 *
 * @tsplus static effect/core/stream/Sink.Ops foldWeightedDecompose
 */
export function foldWeightedDecompose<S, In>(
  z: LazyArg<S>,
  costFn: (s: S, input: In) => number,
  max: number,
  decompose: (input: In) => Chunk<In>,
  f: (s: S, input: In) => S
): Sink<never, never, In, In, S> {
  return Sink.suspend(new SinkInternal(go(z(), costFn, decompose, f, false, 0, max)))
}

function go<S, In>(
  s: S,
  costFn: (s: S, input: In) => number,
  decompose: (input: In) => Chunk<In>,
  f: (s: S, input: In) => S,
  dirty: boolean,
  cost: number,
  max: number
): Channel<never, never, Chunk<In>, unknown, never, Chunk<In>, S> {
  return Channel.readWith(
    (chunk: Chunk<In>) => {
      const {
        tuple: [nextS, nextCost, nextDirty, leftovers]
      } = fold(chunk, s, costFn, decompose, f, dirty, cost, max, 0)

      if (leftovers.isNonEmpty) {
        return Channel.write(leftovers) > Channel.succeed(nextS)
      }

      if (cost > max) {
        return Channel.succeed(nextS)
      }

      return go(nextS, costFn, decompose, f, nextDirty, nextCost, max)
    },
    (err) => Channel.fail(() => err),
    () => Channel.succeed(s)
  )
}

function fold<S, In>(
  input: Chunk<In>,
  s: S,
  costFn: (s: S, input: In) => number,
  decompose: (input: In) => Chunk<In>,
  f: (s: S, input: In) => S,
  dirty: boolean,
  cost: number,
  max: number,
  index: number
): Tuple<[S, number, boolean, Chunk<In>]> {
  if (index === input.length) {
    return Tuple(s, cost, dirty, Chunk.empty<In>())
  }

  const elem = input.unsafeGet(index)
  const total = cost + costFn(s, elem)

  if (total <= max) {
    return fold(input, f(s, elem), costFn, decompose, f, true, total, max, index + 1)
  }

  const decomposed = decompose(elem)

  if (decomposed.length <= 1 && !dirty) {
    // If `elem` cannot be decomposed, we need to cross the `max` threshold. To
    // minimize "injury", we only allow this when we haven't added anything else
    // to the aggregate (dirty = false).
    return Tuple(f(s, elem), total, true, input.drop(index + 1))
  }

  if (decomposed.length <= 1 && dirty) {
    // If the state is dirty and `elem` cannot be decomposed, we stop folding
    // and include `elem` in the leftovers.
    return Tuple(s, cost, dirty, input.drop(index))
  }

  // `elem` got decomposed, so we will recurse with the decomposed elements pushed
  // into the chunk we're processing and see if we can aggregate further.
  return fold(
    decomposed + input.drop(index + 1),
    s,
    costFn,
    decompose,
    f,
    dirty,
    cost,
    max,
    0
  )
}

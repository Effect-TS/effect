import { concreteChunkId } from "@tsplus/stdlib/collections/Chunk/definition";

/**
 * Statefully and effectfully maps over the elements of this chunk to produce
 * new elements.
 *
 * @tsplus fluent Chunk mapAccumEffect
 */
export function mapAccumEffect_<A, B, R, E, S>(
  self: Chunk<A>,
  s: S,
  f: (s: S, a: A) => Effect<R, E, Tuple<[S, B]>>
): Effect<R, E, Tuple<[S, Chunk<B>]>> {
  return Effect.suspendSucceed(() => {
    const iterator = concreteChunkId(self)._arrayLikeIterator();
    let dest: Effect<R, E, S> = Effect.succeedNow(s);
    let builder = Chunk.empty<B>();
    let next;
    while ((next = iterator.next()) && !next.done) {
      const array = next.value;
      const length = array.length;
      let i = 0;
      while (i < length) {
        const a = array[i]!;
        dest = dest.flatMap((state) =>
          f(state, a).map(({ tuple: [s, b] }) => {
            builder = builder.append(b);
            return s;
          })
        );
        i++;
      }
    }
    return dest.map((s) => Tuple(s, builder));
  });
}

/**
 * Statefully and effectfully maps over the elements of this chunk to produce
 * new elements.
 *
 * @tsplus static Chunk/Aspects mapAccumEffect
 */
export const mapAccumEffect = Pipeable(mapAccumEffect_);

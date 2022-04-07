import { InternalSetCount } from "@effect/core/io/Metrics/SetCount/operations/_internal/InternalSetCount";

/**
 * Creates a new set count.
 *
 * @tsplus static ets/SetCount/Ops __call
 */
export function make<A>(
  name: string,
  setTag: string,
  tags: Chunk<MetricLabel>,
  aspect: (
    self: SetCount<A>
  ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
): SetCount<A> {
  return new InternalSetCount(name, setTag, tags, aspect);
}

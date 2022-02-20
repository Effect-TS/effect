import { Tuple } from "../definition"

export type MergeTuple<A, B> = A extends Tuple<infer TA>
  ? B extends Tuple<infer TB>
    ? Tuple<[...TA, ...TB]>
    : Tuple<[...TA, B]>
  : B extends Tuple<infer TB>
  ? Tuple<[A, ...TB]>
  : Tuple<[A, B]>

/**
 * @tsplus static ets/TupleOps mergeTuple
 */
export function mergeTuple<A2, A>(_a: A, _b: A2): MergeTuple<A, A2> {
  // @ts-expect-error
  return Tuple.isTuple(_a) && Tuple.isTuple(_b)
    ? Tuple(..._a.tuple, ..._b.tuple)
    : Tuple.isTuple(_a)
    ? Tuple(..._a.tuple, _b)
    : Tuple.isTuple(_b)
    ? Tuple(_a, ..._b.tuple)
    : Tuple(_a, _b)
}

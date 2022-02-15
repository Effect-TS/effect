import type { ForcedArray } from "../../../../data/Utils"
import type { Tuple } from "../definition"
import { TupleInternal } from "./_internal/TupleInternal"

/**
 * Replaces the element in position `I`.
 *
 * @tsplus fluent ets/Tuple update
 */
export function update_<Ks extends readonly unknown[], I extends keyof Ks & number, J>(
  self: Tuple<Ks>,
  i: I,
  f: (_: Ks[I]) => J
): Tuple<
  ForcedArray<{
    [k in keyof Ks]: k extends `${I}` ? J : Ks[k]
  }>
> {
  const len = self.tuple.length
  const r = new Array(len)
  for (let k = 0; k < len; k++) {
    if (k === i) {
      r[k] = f(self.tuple[k])
    } else {
      r[k] = self.tuple[k]
    }
  }
  return new TupleInternal(r) as any
}

/**
 * Replaces the element at position `I`.
 *
 * @ets_data_first update_
 */
export function update<Ks extends readonly unknown[], I extends keyof Ks & number, J>(
  i: I,
  f: (_: Ks[I]) => J
) {
  return (
    self: Tuple<Ks>
  ): Tuple<
    ForcedArray<{
      [k in keyof Ks]: k extends `${I}` ? J : Ks[k]
    }>
  > => self.update(i, f)
}

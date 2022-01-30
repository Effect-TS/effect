import type { ForcedArray } from "../../../../data/Utils"
import type { Tuple } from "../definition"
import { TupleInternal } from "./_internal/TupleInternal"

/**
 * Replaces the element in position `I`.
 *
 * @ets fluent ets/Tuple update
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
  const len = self.value.length
  const r = new Array(len)
  for (let k = 0; k < len; k++) {
    if (k === i) {
      r[k] = f(self.value[k])
    } else {
      r[k] = self.value[k]
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

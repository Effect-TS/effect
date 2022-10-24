import type { STMTypeId } from "@effect/core/stm/STM"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/NonEmptyReadonlyArray"

export type TupleA<T extends NonEmptyReadonlyArray<STM<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [STM<any, any, infer A>] ? A : never
}

/**
 * Like `forEach` + `identity` with a tuple type.
 *
 * @tsplus static effect/core/stm/STM.Ops tuple
 * @category constructors
 * @since 1.0.0
 */
export function tuple<T extends NonEmptyReadonlyArray<STM<any, any, any>>>(
  ...t: T & {
    0: STM<any, any, any>
  }
): STM<
  [T[number]] extends [{ [STMTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [T[number]] extends [{ [STMTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  TupleA<T>
> {
  return STM.collectAll(t) as any
}

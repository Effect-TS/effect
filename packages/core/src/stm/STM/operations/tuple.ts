import type { STMTypeId } from "@effect/core/stm/STM"

type NonEmptyArraySTM = Array<STM<any, any, any>> & { readonly 0: STM<any, any, any> }

export type TupleA<T extends NonEmptyArraySTM> = {
  [K in keyof T]: [T[K]] extends [STM<any, any, infer A>] ? A : never
}

/**
 * Like `forEach` + `identity` with a tuple type.
 *
 * @tsplus static effect/core/stm/STM.Ops tuple
 */
export function tuple<T extends NonEmptyArraySTM>(
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

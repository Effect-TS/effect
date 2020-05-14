import { mapWithIndex_ } from "./mapWithIndex_"

export const map_: <E, A, B>(
  fa: ReadonlyMap<E, A>,
  f: (a: A) => B
) => ReadonlyMap<E, B> = (fa, f) => mapWithIndex_(fa, (_, a) => f(a))

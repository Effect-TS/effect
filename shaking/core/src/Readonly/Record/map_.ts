import { mapWithIndex_ } from "./mapWithIndex_"

export const map_: <A, B>(
  fa: Readonly<Record<string, A>>,
  f: (a: A) => B
) => Readonly<Record<string, B>> = (fa, f) => mapWithIndex_(fa, (_, a) => f(a))

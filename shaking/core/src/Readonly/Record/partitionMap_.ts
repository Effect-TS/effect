import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../../Either"

import { partitionMapWithIndex_ } from "./partitionMapWithIndex_"

export const partitionMap_: <A, B, C>(
  fa: Readonly<Record<string, A>>,
  f: (a: A) => Either<B, C>
) => Separated<Readonly<Record<string, B>>, Readonly<Record<string, C>>> = (fa, f) =>
  partitionMapWithIndex_(fa, (_, a) => f(a))

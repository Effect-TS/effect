import type { Separated } from "fp-ts/lib/Compactable"
import type { Either } from "fp-ts/lib/Either"
import type { Option } from "fp-ts/lib/Option"

import { partitionMap_ } from "./partitionMap_"

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => (fa: Option<A>) => Separated<Option<B>, Option<C>> = (f) => (fa) =>
  partitionMap_(fa, f)

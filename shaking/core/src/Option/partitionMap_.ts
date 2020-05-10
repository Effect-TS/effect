import type { Separated } from "fp-ts/lib/Compactable"
import type { Either } from "fp-ts/lib/Either"
import type { Option } from "fp-ts/lib/Option"

import { map_ } from "./map_"
import { separate } from "./separate"

export const partitionMap_: <A, B, C>(
  fa: Option<A>,
  f: (a: A) => Either<B, C>
) => Separated<Option<B>, Option<C>> = (fa, f) => separate(map_(fa, f))

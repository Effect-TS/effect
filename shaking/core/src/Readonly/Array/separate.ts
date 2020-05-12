import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../../Either/Either"

import { separate_ } from "./separate_"

export const separate: <A, B>(
  fa: readonly Either<A, B>[]
) => Separated<readonly A[], readonly B[]> = (fa) => separate_(fa)

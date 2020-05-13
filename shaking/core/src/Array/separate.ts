import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either/Either"
import { separate as separate_1 } from "../Readonly/Array/separate"

export const separate: <A, B>(
  fa: Either<A, B>[]
) => Separated<A[], B[]> = separate_1 as any

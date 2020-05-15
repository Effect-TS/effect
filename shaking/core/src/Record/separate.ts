import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either"
import { separate as separate_1 } from "../Readonly/Record"

export const separate: <A, B>(
  fa: Record<string, Either<A, B>>
) => Separated<Record<string, A>, Record<string, B>> = separate_1

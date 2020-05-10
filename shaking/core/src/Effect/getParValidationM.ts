import { Semigroup } from "fp-ts/lib/Semigroup"

import { getCauseSemigroup } from "./getCauseSemigroup"
import { getParCauseValidationM } from "./getParCauseValidationM"

export function getParValidationM<E>(S: Semigroup<E>) {
  return getParCauseValidationM(getCauseSemigroup(S))
}

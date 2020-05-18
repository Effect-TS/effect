import { Semigroup } from "fp-ts/lib/Semigroup"

import { getCauseSemigroup } from "./getCauseSemigroup"
import { getCauseValidationM } from "./getCauseValidationM"

export function getValidationM<E>(S: Semigroup<E>) {
  return getCauseValidationM(getCauseSemigroup(S))
}

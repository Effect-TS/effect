import { either } from "fp-ts/lib/Either"

import { effect } from "./effect"

export const sequenceEither = either.sequence(effect)

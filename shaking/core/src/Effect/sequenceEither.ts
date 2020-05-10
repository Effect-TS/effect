import { either } from "../Either/either"

import { effect } from "./effect"

export const sequenceEither = either.sequence(effect)

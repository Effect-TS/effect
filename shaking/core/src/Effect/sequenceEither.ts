import { sequence } from "../Either/sequence"

import { effect } from "./effect"

export const sequenceEither = sequence(effect)

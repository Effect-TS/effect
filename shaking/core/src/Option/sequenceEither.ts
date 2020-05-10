import { either } from "../Either"

import { option } from "./instances"

export const sequenceEither = option.sequence(either)

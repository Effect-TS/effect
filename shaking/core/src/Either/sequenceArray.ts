import { sequence } from "../Array/array"

import { eitherMonad } from "./either"

export const sequenceArray = sequence(eitherMonad)

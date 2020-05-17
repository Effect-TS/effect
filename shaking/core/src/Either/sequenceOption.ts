import { sequence } from "../Option/option"

import { eitherMonadClassic } from "./eitherMonadClassic"

export const sequenceOption = sequence(eitherMonadClassic)

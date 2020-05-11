import { array } from "../Array"

import { eitherMonad } from "./eitherMonad"

export const sequenceArray = array.sequence(eitherMonad)

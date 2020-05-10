import { tree } from "../Tree"

import { optionMonad } from "./monad"

export const sequenceTree = tree.sequence(optionMonad)

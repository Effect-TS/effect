import { tree } from "../Tree"

import { eitherMonad } from "./eitherMonad"

export const sequenceTree = tree.sequence(eitherMonad)

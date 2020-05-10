import { tree } from "fp-ts/lib/Tree"

import { effect } from "./effect"

export const sequenceTree = tree.sequence(effect)

import { tree } from "fp-ts/lib/Tree"

import { parEffect } from "./parEffect"

export const parSequenceTree = tree.sequence(parEffect)

import { tree } from "fp-ts/lib/Tree"

import { parFastEffect } from "./parFastEffect"

export const parFastSequenceTree = tree.sequence(parFastEffect)

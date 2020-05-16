import * as tree from "../Tree"

import { streamEither } from "./streamEither"

export const sequenceTree = tree.sequence(streamEither)

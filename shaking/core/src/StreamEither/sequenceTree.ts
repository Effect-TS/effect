import * as T from "../Tree"

import { streamEither } from "./streamEither"

export const sequenceTree = T.sequence(streamEither)

import * as R from "../Record"

import { streamEither } from "./streamEither"

export const sequenceRecord = R.sequence(streamEither)

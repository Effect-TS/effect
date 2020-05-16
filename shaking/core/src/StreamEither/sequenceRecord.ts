import * as record from "../Record"

import { streamEither } from "./streamEither"

export const sequenceRecord = record.sequence(streamEither)

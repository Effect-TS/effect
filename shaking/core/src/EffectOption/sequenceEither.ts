import * as E from "../Either"

import { effectOption } from "./effectOption"

export const sequenceEither = E.sequence(effectOption)

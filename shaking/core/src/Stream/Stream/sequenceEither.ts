import { sequence } from "../../Either"

import { stream } from "./index"

export const sequenceEither = sequence(stream)

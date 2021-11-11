// ets_tracing: off

import { sequenceF } from "../../Prelude/ForEach"
import { ForEach } from "../instances"

export const sequence = sequenceF(ForEach)

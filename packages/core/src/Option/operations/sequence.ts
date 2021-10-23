// ets_tracing: off

import { sequenceF } from "../../Prelude/ForEach"
import { ForEach } from "../instances/ForEach"

export const sequence = sequenceF(ForEach)

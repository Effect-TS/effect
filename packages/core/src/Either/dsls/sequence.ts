// ets_tracing: off

import { sequenceF } from "../../Prelude/ForEach/index.js"
import { ForEach } from "../instances.js"

export const sequence = sequenceF(ForEach)

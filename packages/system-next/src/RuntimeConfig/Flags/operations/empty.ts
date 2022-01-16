// ets_tracing: off

import * as HS from "../../../Collections/Immutable/HashSet"
import { RuntimeConfigFlags } from ".."

export const empty: RuntimeConfigFlags = new RuntimeConfigFlags(HS.make())

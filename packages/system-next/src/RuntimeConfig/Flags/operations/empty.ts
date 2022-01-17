import * as HS from "../../../Collections/Immutable/HashSet"
import { RuntimeConfigFlags } from "../definition"

export const empty: RuntimeConfigFlags = new RuntimeConfigFlags(HS.make())

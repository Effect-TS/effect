import * as HS from "../../../../collection/immutable/HashSet"
import { RuntimeConfigFlags } from "../definition"

export const empty: RuntimeConfigFlags = new RuntimeConfigFlags(HS.make())

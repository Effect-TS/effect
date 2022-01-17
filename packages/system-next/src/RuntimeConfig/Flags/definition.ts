import type { HashSet } from "../../Collections/Immutable/HashSet"
import type { RuntimeConfigFlag } from "../Flag"

export class RuntimeConfigFlags {
  constructor(readonly flags: HashSet<RuntimeConfigFlag>) {}
}

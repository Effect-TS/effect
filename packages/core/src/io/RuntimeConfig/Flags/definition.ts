import type { HashSet } from "../../../collection/immutable/HashSet"
import type { RuntimeConfigFlag } from "../Flag"

export class RuntimeConfigFlags {
  constructor(readonly flags: HashSet<RuntimeConfigFlag>) {}
}

import type { Option } from "../Option/Option"
import { compact as compact_1 } from "../Readonly/Record"

export const compact: <A>(
  fa: Record<string, Option<A>>
) => Record<string, A> = compact_1

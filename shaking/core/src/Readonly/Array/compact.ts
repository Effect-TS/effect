import type { Option } from "../../Option/Option"

import { compact_ } from "./compact_"

export const compact: <A>(fa: readonly Option<A>[]) => readonly A[] = (fa) =>
  compact_(fa)

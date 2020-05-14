import type { Eq } from "../Eq"
import type { Option } from "../Option"
import { compact as compact_1 } from "../Readonly/Set"

/**
 * @since 2.0.0
 */
export const compact: <A>(E: Eq<A>) => (fa: Set<Option<A>>) => Set<A> = compact_1 as any

import type { Option } from "../Option/Option"
import { lookup as lookup_1 } from "../Readonly/Record"

/**
 * Lookup the value for a key in a record
 *
 * @since 2.0.0
 */
export const lookup: <A>(k: string, r: Record<string, A>) => Option<A> = lookup_1

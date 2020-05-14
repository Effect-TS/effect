import { Eq } from "../Eq"
import * as RM from "../Readonly/Map/elem"

/**
 * Test whether or not a value is a member of a map
 *
 * @since 2.0.0
 */
export const elem: <A>(E: Eq<A>) => <K>(a: A, m: Map<K, A>) => boolean = RM.elem

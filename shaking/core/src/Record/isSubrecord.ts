import type { Eq } from "../Eq"
import { isSubrecord as isSubrecord_1 } from "../Readonly/Record"

/**
 * Test whether one record contains all of the keys and values contained in another record
 *
 * @since 2.0.0
 */
export const isSubrecord: <A>(
  E: Eq<A>
) => (x: Record<string, A>, y: Record<string, A>) => boolean = isSubrecord_1

import { IPure } from "../Support/Common"
import { Sync } from "../Support/Common/effect"

/**
 * An IO has succeeded
 * @param a the value
 */

export function pure<A>(a: A): Sync<A> {
  return new IPure(a) as any
}

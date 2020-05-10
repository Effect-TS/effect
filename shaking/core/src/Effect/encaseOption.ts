import { Option } from "fp-ts/lib/Option"
import { Lazy } from "fp-ts/lib/function"

import { IPureOption } from "../Support/Common"
import { SyncE } from "../Support/Common/effect"

/**
 * Lift an Option into an IO
 * @param o
 * @param onError
 */
export function encaseOption<E, A>(o: Option<A>, onError: Lazy<E>): SyncE<E, A> {
  return new IPureOption(o, onError) as any
}

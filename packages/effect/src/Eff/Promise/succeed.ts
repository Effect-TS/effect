import { succeedNow } from "../Effect/succeedNow"

import { completeWith } from "./completeWith"
import { Promise } from "./promise"

/**
 * Completes the promise with the specified value.
 */
export const succeed = <A>(a: A) => <E>(promise: Promise<E, A>) =>
  completeWith<E, A>(succeedNow(a))(promise)

import { fail as effectFail } from "../Effect/fail"

import { completeWith } from "./completeWith"
import { Promise } from "./promise"

/**
 * Fails the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export const fail = <E>(e: E) => <A>(promise: Promise<E, A>) =>
  completeWith<E, A>(effectFail(e))(promise)

import { succeed as effectSucceed } from "../Effect/core"

import { completeWith } from "./completeWith"
import { Promise } from "./promise"

/**
 * Completes the promise with the specified value.
 */
export const succeed = <A>(a: A) => <E>(promise: Promise<E, A>) =>
  completeWith<E, A>(effectSucceed(a))(promise)

/**
 * Completes the promise with the specified value.
 */
export const succeed_ = <A, E>(promise: Promise<E, A>, a: A) =>
  completeWith<E, A>(effectSucceed(a))(promise)

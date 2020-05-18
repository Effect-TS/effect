import * as T from "../Effect"

import { Ref } from "./Ref"
import { RefImpl } from "./RefImpl"

/**
 * Creates an IO that will allocate a Ref.
 * Curried form of makeRef to allow for inference on the initial type
 */
export const makeRef = <A>(initial: A): T.Sync<Ref<A>> =>
  T.sync(() => new RefImpl(initial))

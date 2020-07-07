import { succeedNow } from "../Effect/succeedNow"
import { Promise } from "../Promise/promise"
import { unsafeDone } from "../Promise/unsafeDone"

export const unsafeCompletePromise = <A>(p: Promise<never, A>, a: A) =>
  unsafeDone(succeedNow(a))(p)

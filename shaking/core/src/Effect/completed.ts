import { Exit } from "../Exit"
import { ICompleted } from "../Support/Common"
import { SyncE } from "../Support/Common/effect"

/**
 * An IO that is completed with the given exit
 * @param exit
 */
export function completed<E = never, A = never>(exit: Exit<E, A>): SyncE<E, A> {
  return new ICompleted(exit) as any
}

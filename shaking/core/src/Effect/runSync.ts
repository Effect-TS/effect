import type { Exit } from "../Exit"
import { pipe } from "../Pipe"
import type { SyncRE } from "../Support/Common/effect"
import { DriverSyncImpl } from "../Support/Driver"

/**
 * Run the given IO syncroniously
 * returns left if any async operation
 * is found
 * @param io
 */
export function runSync<E, A>(io: SyncRE<{}, E, A>): Exit<E, A> {
  return pipe(new DriverSyncImpl<E, A>().start(io), (ei) => {
    if (ei._tag === "Left") {
      throw ei.left
    }
    return ei.right
  })
}

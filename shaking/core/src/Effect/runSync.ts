import { fold as foldEither } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"

import { Exit } from "../Exit"
import { SyncRE } from "../Support/Common/effect"
import { DriverSyncImpl } from "../Support/Driver"

/**
 * Run the given IO syncroniously
 * returns left if any async operation
 * is found
 * @param io
 */
export function runSync<E, A>(io: SyncRE<{}, E, A>): Exit<E, A> {
  return pipe(
    new DriverSyncImpl<E, A>().start(io),
    foldEither(
      (e) => {
        throw e
      },
      (e) => e
    )
  )
}

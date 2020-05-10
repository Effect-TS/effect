import { flatten as flattenArray, filter as filterArray } from "fp-ts/lib/Array"
import { pipe } from "fp-ts/lib/pipeable"

import { Exit, interruptWithError } from "../Exit"
import { Effect } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { completed } from "./completed"
import { result } from "./result"
import { uninterruptibleMask } from "./uninterruptibleMask"

export function combineInterruptExit<S, R, E, A, S2, R2, E2>(
  ioa: Effect<S, R, E, A>,
  finalizer: Effect<S2, R2, E2, Exit<any, any>[]>
): Effect<S | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      exit._tag === "Interrupt"
        ? chain_(result(finalizer), (finalize) => {
            /* istanbul ignore else */
            if (finalize._tag === "Done") {
              const errors = pipe(
                [
                  ...(exit.errors ? exit.errors : []),
                  ...flattenArray(
                    finalize.value.map((x) =>
                      x._tag === "Interrupt" ? (x.errors ? x.errors : []) : []
                    )
                  )
                ],
                filterArray((x): x is Error => x !== undefined)
              )
              return errors.length > 0
                ? completed(interruptWithError(...errors))
                : completed(exit)
            } else {
              throw new Error("BUG: interrupt finalizer should not fail")
            }
          })
        : completed(exit)
    )
  )
}

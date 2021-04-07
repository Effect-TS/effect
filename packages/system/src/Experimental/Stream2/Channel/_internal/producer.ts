import type * as Cause from "../../../../Cause"
import type * as T from "../../../../Effect"

/**
 * Producer-side view of `SingleProducerAsyncInput` for variance purposes.
 */
export interface AsyncInputProducer<Err, Elem, Done> {
  readonly emit: (el: Elem) => T.UIO<unknown>
  readonly done: (a: Done) => T.UIO<unknown>
  readonly error: (cause: Cause.Cause<Err>) => T.UIO<unknown>
}

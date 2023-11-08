import type { Effect } from "./Effect.js"
import type { Exit } from "./Exit.impl.js"
import type { AsyncInputConsumer, AsyncInputProducer } from "./SingleProducerAsyncInput.impl.js"
import type { Either } from "./StreamHaltStrategy.js"

export * from "./internal/Jumpers/SingleProducerAsyncInput.js"
export * from "./SingleProducerAsyncInput.impl.js"

export declare namespace SingleProducerAsyncInput {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./SingleProducerAsyncInput.impl.js"
}
/**
 * An MVar-like abstraction for sending data to channels asynchronously which is
 * designed for one producer and multiple consumers.
 *
 * Features the following semantics:
 *   - Buffer of size 1.
 *   - When emitting, the producer waits for a consumer to pick up the value to
 *     prevent "reading ahead" too much.
 *   - Once an emitted element is read by a consumer, it is cleared from the
 *     buffer, so that at most one consumer sees every emitted element.
 *   - When sending a done or error signal, the producer does not wait for a
 *     consumer to pick up the signal. The signal stays in the buffer after
 *     being read by a consumer, so it can be propagated to multiple consumers.
 *   - Trying to publish another emit/error/done after an error/done have
 *     already been published results in an interruption.
 *
 * @since 2.0.0
 * @category models
 */
export interface SingleProducerAsyncInput<Err, Elem, Done>
  extends AsyncInputProducer<Err, Elem, Done>, AsyncInputConsumer<Err, Elem, Done>
{
  close(): Effect<never, never, unknown>
  take(): Effect<never, never, Exit<Either<Err, Done>, Elem>>
}

import type { Cause } from "../../exports/Cause.js"
import { Chunk } from "../../exports/Chunk.js"
import { Effect } from "../../exports/Effect.js"
import { Option } from "../../exports/Option.js"
import { Queue } from "../../exports/Queue.js"
import type { Take } from "../../exports/Take.js"
import * as take from "../take.js"

/** @internal */
export interface Pull<R, E, A> extends Effect<R, Option<E>, Chunk<A>> {}

/** @internal */
export const emit = <A>(value: A): Effect<never, never, Chunk<A>> => Effect.succeed(Chunk.of(value))

/** @internal */
export const emitChunk = <A>(chunk: Chunk<A>): Effect<never, never, Chunk<A>> => Effect.succeed(chunk)

/** @internal */
export const empty = <A>(): Effect<never, never, Chunk<A>> => Effect.succeed(Chunk.empty<A>())

/** @internal */
export const end = (): Effect<never, Option<never>, never> => Effect.fail(Option.none())

/** @internal */
export const fail = <E>(error: E): Effect<never, Option<E>, never> => Effect.fail(Option.some(error))

/** @internal */
export const failCause = <E>(cause: Cause<E>): Effect<never, Option<E>, never> =>
  Effect.mapError(Effect.failCause(cause), Option.some)

/** @internal */
export const fromDequeue = <E, A>(
  dequeue: Queue.Dequeue<Take<E, A>>
): Effect<never, Option<E>, Chunk<A>> => Effect.flatMap(Queue.take(dequeue), take.done)

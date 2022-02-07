// ets_tracing: off

import "../../Operator/index.js"

import type { Cause } from "../../Cause/core.js"
import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as O from "../../Option/index.js"
import * as Q from "../../Queue/index.js"
import * as T from "../_internal/effect.js"
import type { Take } from "../Take/index.js"

export type Pull<R, E, O> = T.Effect<R, O.Option<E>, A.Chunk<O>>

export function emit<A>(a: A): Pull<unknown, never, A> {
  return T.succeed(A.single(a))
}

export function emitChunk<A>(as: A.Chunk<A>): Pull<unknown, never, A> {
  return T.succeed(as)
}

export function fromDequeue<E, A>(d: Q.Dequeue<Take<E, A>>): Pull<unknown, E, A> {
  return T.chain_(Q.take(d), (_) => T.done(_))
}

export function fail<E>(e: E) {
  return T.fail(O.some(e))
}

export function halt<E>(e: Cause<E>) {
  return T.mapError_(T.halt(e), O.some)
}

export function empty<A>(): Pull<unknown, never, A> {
  return T.succeed(A.empty<A>())
}

export const end = T.fail(O.none)

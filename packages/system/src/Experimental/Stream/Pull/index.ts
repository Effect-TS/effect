// ets_tracing: off

import type * as C from "../../../Cause/index.js"
import * as A from "../../../Collections/Immutable/Chunk/index.js"
import { _A, _E } from "../../../Effect/commons.js"
import * as T from "../../../Effect/index.js"
import * as O from "../../../Option/index.js"
import * as Q from "../../../Queue/index.js"
import * as Take from "../Take/index.js"

export type Pull<R, E, A> = T.Effect<R, O.Option<E>, A.Chunk<A>>

export function emit<A>(a: A): T.UIO<A.Chunk<A>> {
  return T.succeed(A.single(a))
}

export function emitChunk<A>(as: A.Chunk<A>): T.UIO<A.Chunk<A>> {
  return T.succeed(as)
}

export function fromQueue<E, A>(
  d: Q.Dequeue<Take.Take<E, A>>
): T.IO<O.Option<E>, A.Chunk<A>> {
  return T.chain_(Q.take(d), (_) => Take.done(_))
}

export function fail<E>(e: E): T.IO<O.Option<E>, never> {
  return T.fail(O.some(e))
}

export function failCause<E>(c: C.Cause<E>): T.IO<O.Option<E>, never> {
  return T.mapError_(T.halt(c), O.some)
}

export function empty<A>(): T.IO<never, A.Chunk<A>> {
  return T.succeed(A.empty<A>())
}

export const end: T.IO<O.Option<never>, never> = T.fail(O.none)

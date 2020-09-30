import * as T from "../_internal/effect"
import type * as A from "../../Array"
import type { Cause } from "../../Cause/core"
import { pipe } from "../../Function"
import * as O from "../../Option"

export type Pull<R, E, O> = T.Effect<R, O.Option<E>, A.Array<O>>

export const end = T.fail(O.none)

export const fail = <E>(e: E) => T.fail(O.some(e))

export const halt = <E>(e: Cause<E>) => pipe(T.halt(e), T.mapError(O.some))

export const empty = <A>() => T.succeed([] as A.Array<A>)

export const emit = <A>(a: A) => T.succeed([a])

export const emitArray = <A>(as: A.Array<A>) => T.succeed(as)

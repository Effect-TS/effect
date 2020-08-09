import { pipe } from "../../Function"
import * as O from "../../Option"
import * as A from "../../Array"
import { Cause } from "../../Cause/core"
import * as T from "../_internal/effect"

export type Pull<S, R, E, O> = T.Effect<S, R, O.Option<E>, A.Array<O>>

export const end = T.fail(O.none)

export const fail = <E>(e: E) => T.fail(O.some(e))

export const halt = <E>(e: Cause<E>) => pipe(T.halt(e), T.mapError(O.some))

import { pipe } from "fp-ts/lib/pipeable"

import * as O from "../../../Option"
import { Cause } from "../../Cause/cause"
import * as T from "../internal/effect"

export type Pull<S, R, E, O> = T.Effect<S, R, O.Option<E>, O[]>

export const end = T.fail(O.none)

export const fail = <E>(e: E) => T.fail(O.some(e))

export const halt = <E>(e: Cause<E>) => pipe(T.halt(e), T.mapError(O.some))

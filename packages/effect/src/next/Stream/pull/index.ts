import * as O from "../../../Option"
import * as T from "../internal/effect"

export type Pull<S, R, E, O> = T.Effect<S, R, O.Option<E>, O[]>

export const end = T.fail(O.none)

export const fail = <E>(e: E) => T.fail(O.some(e))

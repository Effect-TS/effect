import * as O from "../../../Option"
import * as E from "../internal/exit"

export type Take<E, A> = E.Exit<O.Option<E>, A[]>

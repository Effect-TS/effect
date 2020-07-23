import { fromEffect } from "../Managed"

import { Effect } from "./effect"

export const toManaged = <S, R, E, A>(self: Effect<S, R, E, A>) => fromEffect(self)

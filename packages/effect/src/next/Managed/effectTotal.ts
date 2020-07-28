import * as T from "./deps"
import { fromEffect } from "./fromEffect"

export const effectTotal = <A>(effect: () => A) => fromEffect(T.effectTotal(effect))

import * as T from "./deps"
import { fromEffect } from "./fromEffect"

export const succeedNow = <A>(a: A) => fromEffect(T.succeedNow(a))

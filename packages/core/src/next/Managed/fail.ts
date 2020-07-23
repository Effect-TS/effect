import * as T from "./deps"
import { fromEffect } from "./fromEffect"

export const fail = <E>(e: E) => fromEffect(T.fail(e))

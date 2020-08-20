import type * as T from "./deps"
import { fresh, memo } from "./index"
import type { HasMemoMap } from "./MemoMap"

export class Layer<S, R, E, A> {
  constructor(readonly build: T.Managed<S, R, E, A>) {}

  memo(): Layer<unknown, R & HasMemoMap, E, A> {
    return memo(this)
  }

  fresh(): Layer<S, R, E, A> {
    return fresh(this)
  }
}

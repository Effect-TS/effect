import { fresh, memo } from "./core"
import type * as T from "./deps"
import type { HasMemoMap } from "./MemoMap"

export class Layer<R, E, A> {
  constructor(readonly build: T.Managed<R, E, A>) {}

  memo(): Layer<R & HasMemoMap, E, A> {
    return memo(this)
  }

  fresh(): Layer<R, E, A> {
    return fresh(this)
  }
}

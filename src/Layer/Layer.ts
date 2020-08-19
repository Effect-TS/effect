import { HasMemoMap } from "./MemoMap"
import * as T from "./deps"

import { memo, fresh } from "./index"

export class Layer<S, R, E, A> {
  constructor(readonly build: T.Managed<S, R, E, A>) {}

  memo(): Layer<unknown, R & HasMemoMap, E, A> {
    return memo(this)
  }

  fresh(): Layer<S, R, E, A> {
    return fresh(this)
  }
}

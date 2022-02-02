import type * as T from "../../Effect"

export interface Restorable {
  readonly save: T.UIO<T.UIO<void>>
}

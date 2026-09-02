import * as Context from "../Context.ts"
import type { Random as RandomService } from "../Random.ts"

/** @internal */
export const Random: Context.Reference<RandomService> = Context.Reference<RandomService>("effect/Random", {
  defaultValue: () => ({
    nextIntUnsafe() {
      return Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER + 1)) +
        Number.MIN_SAFE_INTEGER
    },
    nextDoubleUnsafe() {
      return Math.random()
    }
  })
})

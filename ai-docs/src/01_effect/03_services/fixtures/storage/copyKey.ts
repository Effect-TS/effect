// file: src/storage/copyKey.ts
import { Effect, Option } from "effect"
import { get } from "./get.ts"
import { put } from "./put.ts"

// Programs call the operations directly. Each call looks up the current
// implementation when it runs, so an override provided by a test or a
// composition root takes effect without this module knowing about it. Only
// `get.ts` and `put.ts` end up in the import graph of this program.
export const copyKey = Effect.fn("copyKey")(function*(from: string, to: string) {
  const value = yield* get(from)
  if (Option.isSome(value)) {
    yield* put(to, value.value)
  }
  return Option.isSome(value)
})

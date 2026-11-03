// file: src/storage/copyKey.ts
import { Effect, Option } from "effect"
import { Storage } from "./Storage.ts"

// `Storage.only` returns the requested members and requires only their slices,
// so the requirements of this program are
// `Context.Only<Storage, "get"> | Context.Only<Storage, "put">`. A
// `yield* Storage` here would require the full service instead.
export const copyKey = Effect.fn("copyKey")(function*(from: string, to: string) {
  const { get, put } = yield* Storage.only("get", "put")
  const value = yield* get(from)
  if (Option.isSome(value)) {
    yield* put(to, value.value)
  }
  return Option.isSome(value)
})

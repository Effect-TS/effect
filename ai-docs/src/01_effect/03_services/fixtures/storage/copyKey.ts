// file: src/storage/copyKey.ts
import { Effect, Option } from "effect"
import { Storage } from "./Storage.ts"

// `Storage.only(member)` is a key for one member: yielding it reads that member
// and requires only its slice, so the requirements of this program are
// `Context.Only<Storage, "get"> | Context.Only<Storage, "put">`. A
// `yield* Storage` here would require the full service instead.
export const copyKey = Effect.fn("copyKey")(function*(from: string, to: string) {
  const get = yield* Storage.only("get")
  const put = yield* Storage.only("put")
  const value = yield* get(from)
  if (Option.isSome(value)) {
    yield* put(to, value.value)
  }
  return Option.isSome(value)
})

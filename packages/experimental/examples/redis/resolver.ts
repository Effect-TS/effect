import * as Redis from "@effect/experimental/Persistence/Redis"
import { persisted } from "@effect/experimental/RequestResolver"
import * as TimeToLive from "@effect/experimental/TimeToLive"
import { runMain } from "@effect/platform-node/NodeRuntime"
import { Schema } from "@effect/schema"
import { Effect, Exit, PrimaryKey, Array as ReadonlyArray, RequestResolver } from "effect"

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String
}) {}

class GetUserById extends Schema.TaggedRequest<GetUserById>()("GetUserById", Schema.String, User, {
  id: Schema.Number
}) {
  [PrimaryKey.symbol]() {
    return `GetUserById:${this.id}`
  }
  [TimeToLive.symbol](exit: Exit.Exit<User, string>) {
    return Exit.isSuccess(exit) ? 30000 : 0
  }
}

Effect.gen(function*(_) {
  const resolver = yield* _(
    RequestResolver.fromEffectTagged<GetUserById>()({
      GetUserById: (reqs) => {
        console.log("uncached requests", reqs.length)
        return Effect.forEach(reqs, (req) => Effect.succeed(new User({ id: req.id, name: "John" })))
      }
    }),
    persisted("users")
  )

  const users = yield* _(
    Effect.forEach(ReadonlyArray.range(1, 5), (id) => Effect.request(new GetUserById({ id }), resolver), {
      batching: true
    })
  )

  console.log(users)
}).pipe(
  Effect.scoped,
  Effect.provide(Redis.layerResult({})),
  runMain
)

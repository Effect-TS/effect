import * as Redis from "@effect/experimental/Persistence/Redis"
import { persisted } from "@effect/experimental/RequestResolver"
import { runMain } from "@effect/platform-node/NodeRuntime"
import { Array, Effect, Exit, pipe, PrimaryKey, RequestResolver, Schema } from "effect"

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String
}) {}

class GetUserById extends Schema.TaggedRequest<GetUserById>()("GetUserById", {
  failure: Schema.String,
  success: User,
  payload: {
    id: Schema.Number
  }
}) {
  [PrimaryKey.symbol]() {
    return `GetUserById:${this.id}`
  }
}

const program = Effect.gen(function*() {
  const resolver = yield* RequestResolver.fromEffectTagged<GetUserById>()({
    GetUserById: (reqs) => {
      console.log("uncached requests", reqs.length)
      return Effect.forEach(reqs, (req) => Effect.succeed(new User({ id: req.id, name: "John" })))
    }
  }).pipe(persisted({
    storeId: "users",
    timeToLive: (_req, exit) => Exit.isSuccess(exit) ? 30000 : 0
  }))

  const users = yield* Effect.forEach(Array.range(1, 5), (id) => Effect.request(new GetUserById({ id }), resolver), {
    batching: true
  })

  console.log(users)
})

pipe(
  program,
  Effect.scoped,
  Effect.provide(Redis.layerResult({})),
  runMain
)

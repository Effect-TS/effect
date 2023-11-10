import * as it from "effect-test/utils/extend"
import { Effect } from "effect/Effect"
import { Exit } from "effect/Exit"
import { Request } from "effect/Request"
import { RequestResolver as Resolver } from "effect/RequestResolver"
import { describe } from "vitest"

export const userIds: ReadonlyArray<number> = [1, 1]

interface GetNameById extends Request<string, string> {
  readonly _tag: "GetNameById"
  readonly id: number
}
const GetNameById = Request.tagged<GetNameById>("GetNameById")

const UserResolver = Resolver.makeBatched((requests: Array<GetNameById>) =>
  Effect.forEach(requests, (request) =>
    Request.complete(
      request,
      Exit.succeed("ok")
    ), { discard: true })
)

const getUserNameById = (id: number) => Effect.request(GetNameById({ id }), UserResolver)
const getAllUserNames = Effect.forEach([1, 1], getUserNameById, { batching: true })

describe.concurrent("Effect", () => {
  it.it("requests are executed correctly", () =>
    Effect.runPromise(
      Effect.gen(function*($) {
        yield* $(
          getAllUserNames,
          Effect.withRequestCaching(true),
          Effect.withRequestBatching(true)
        )
      })
    ))
})

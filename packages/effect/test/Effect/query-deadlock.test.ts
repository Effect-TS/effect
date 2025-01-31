import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Request from "effect/Request"
import * as Resolver from "effect/RequestResolver"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

export const userIds: ReadonlyArray<number> = [1, 1]

interface GetNameById extends Request.Request<string, string> {
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

describe("Effect", () => {
  it.it("requests are executed correctly", () =>
    Effect.runPromise(
      Effect.gen(function*() {
        yield* pipe(
          getAllUserNames,
          Effect.withRequestCaching(true),
          Effect.withRequestBatching(true)
        )
      })
    ))
})

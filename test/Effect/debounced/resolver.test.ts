import { Effect, pipe, Request, RequestResolver, Schedule, Stream } from "effect"
import * as it from "effect-test/utils/extend"
import { describe, expect } from "vitest"
import { makeDataLoader } from "./resolver.js"

interface TestRequest extends Request.Request<never, string> {
  readonly _tag: "TestRequest"
  val: number
}

const TestRequest = Request.tagged<TestRequest>("TestRequest")

const resolver = (log: Array<any>) =>
  RequestResolver.makeBatched((requests: Array<TestRequest>) =>
    Effect.gen(function*(_) {
      log.push(requests.length)
      yield* _(
        Effect.forEach(
          requests,
          (request) =>
            Request.completeEffect(
              request,
              Effect.succeed(`result_${request.val}`)
            ),
          { concurrency: "unbounded" }
        )
      )
    })
  )

describe("DebouncedResolver", () => {
  it.live("resolves requests in a debounced manner", () =>
    Effect.scoped(
      Effect.gen(function*(_) {
        const { debounced } = yield* _(makeDataLoader(Schedule.fixed("100 millis")))

        const blocks = [] as Array<any>

        const testResolver = resolver(blocks)

        const getDebouncedRequest: (
          request: TestRequest
        ) => Effect.Effect<never, never, string> = (req) =>
          pipe(
            Effect.request(req, testResolver),
            Effect.withRequestCaching(true),
            debounced
          )

        const reqs = yield* _(
          Stream.range(1, 5),
          Stream.map((val) => TestRequest({ val })),
          Stream.runCollect
        )

        const testResult = yield* _(
          Effect.forEach(reqs, getDebouncedRequest, {
            concurrency: "unbounded",
            batching: false
          })
        )

        expect(blocks.length).toEqual(1)
        expect(testResult.length).toEqual(blocks[0])
      })
    ))
})

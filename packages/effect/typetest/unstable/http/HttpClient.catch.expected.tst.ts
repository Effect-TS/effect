import { Effect } from "effect"
import { HttpClient, HttpClientRequest, type HttpClientResponse } from "effect/unstable/http"
import { describe, it } from "tstyche"

const failure = Effect.fail("synthetic failure")
const failed = HttpClient.makeWith(() => failure, Effect.succeed)
const request = HttpClientRequest.get("https://fixture.invalid/catch")

describe("HttpClient.catch expected diagnostics (verification-only)", () => {
  it("rejects invalid actual data-first calls", () => {
    // @ts-expect-error is not assignable to type -- number recovery violates the response invariant
    const numberClient = HttpClient.catch(failed, () => Effect.succeed(123))
    // @ts-expect-error is not assignable to type -- undefined recovery violates the response invariant
    const undefinedClient = HttpClient.catch(failed, () => Effect.succeed(undefined))
    const advertisedNumber: Effect.Effect<HttpClientResponse.HttpClientResponse> = numberClient.execute(request)
    const advertisedUndefined: Effect.Effect<HttpClientResponse.HttpClientResponse> = undefinedClient.execute(request)
    void advertisedNumber
    void advertisedUndefined
  })

  it("already rejects invalid actual data-last calls", () => {
    // @ts-expect-error is not assignable to type -- the existing data-last overload rejects numbers
    HttpClient.catch((_error: string) => Effect.succeed(123))
    // @ts-expect-error is not assignable to type -- the existing data-last overload rejects undefined
    HttpClient.catch((_error: string) => Effect.succeed(undefined))
  })
})

import type { HttpApiError, HttpClientError } from "@effect/platform"
import { HttpApi, HttpApiClient, HttpApiEndpoint, HttpApiGroup, HttpApiMiddleware, HttpClient } from "@effect/platform"
import type { Schema } from "effect"
import { Effect } from "effect"
import type { ParseError } from "effect/ParseResult"
import { describe, expect, it } from "tstyche"

declare const ApiError: Schema.Schema<"ApiError", "ApiErrorEncoded", "ApiErrorR">

declare const Group1Error: Schema.Schema<"Group1Error", "Group1ErrorEncoded", "Group1ErrorR">
declare const EndpointAError: Schema.Schema<"EndpointAError", "EndpointAErrorEncoded", "EndpointAErrorR">
declare const EndpointASuccess: Schema.Schema<"EndpointASuccess", "EndpointASuccessEncoded", "EndpointASuccessR">
declare const EndpointBError: Schema.Schema<"EndpointBError", "EndpointBErrorEncoded", "EndpointBErrorR">
declare const EndpointBSuccess: Schema.Schema<"EndpointBSuccess", "EndpointBSuccessEncoded", "EndpointBSuccessR">

declare const EndpointASecurityError: Schema.Schema<
  "EndpointASecurityError",
  "EndpointASecurityErrorEncoded",
  "EndpointASecurityErrorR"
>
class EndpointASecurity extends HttpApiMiddleware.Tag<EndpointASecurity>()("EndpointASecurity", {
  failure: EndpointASecurityError
}) {}
declare const EndpointBSecurityError: Schema.Schema<
  "EndpointBSecurityError",
  "EndpointBSecurityErrorEncoded",
  "EndpointBSecurityErrorR"
>
class EndpointBSecurity extends HttpApiMiddleware.Tag<EndpointBSecurity>()("EndpointBSecurity", {
  failure: EndpointBSecurityError
}) {}
declare const Group1SecurityError: Schema.Schema<
  "Group1SecurityError",
  "Group1SecurityErrorEncoded",
  "Group1SecurityErrorR"
>
class Group1Security extends HttpApiMiddleware.Tag<Group1Security>()("Group1Security", {
  failure: Group1SecurityError
}) {}
declare const ApiSecurityError: Schema.Schema<
  "ApiSecurityError",
  "ApiSecurityErrorEncoded",
  "ApiSecurityErrorR"
>
class ApiSecurity extends HttpApiMiddleware.Tag<ApiSecurity>()("ApiSecurity", {
  failure: ApiSecurityError
}) {}

const EndpointA = HttpApiEndpoint.post("EndpointA", "/endpoint_a")
  .middleware(EndpointASecurity)
  .addError(EndpointAError)
  .addSuccess(EndpointASuccess)
const EndpointB = HttpApiEndpoint.post("EndpointB", "/endpoint_b")
  .middleware(EndpointBSecurity)
  .addError(EndpointBError)
  .addSuccess(EndpointBSuccess)

const Group1 = HttpApiGroup.make("Group1")
  .middleware(Group1Security)
  .addError(Group1Error)
  .add(EndpointA)
  .add(EndpointB)

declare const Group2Error: Schema.Schema<"Group2Error", "Group2ErrorEncoded", "Group2ErrorR">
declare const EndpointCError: Schema.Schema<"EndpointCError", "EndpointCErrorEncoded", "EndpointCErrorR">
declare const EndpointCSuccess: Schema.Schema<"EndpointCSuccess", "EndpointCSuccessEncoded", "EndpointCSuccessR">

const EndpointC = HttpApiEndpoint.post("EndpointC", "/endpoint_c")
  .addError(EndpointCError)
  .addSuccess(EndpointCSuccess)
const Group2 = HttpApiGroup.make("Group2")
  .addError(Group2Error)
  .add(EndpointC)

const TestApi = HttpApi.make("test")
  .middleware(ApiSecurity)
  .addError(ApiError)
  .add(Group1)
  .add(Group2)

describe("HttpApiClient", () => {
  it("endpoint", () => {
    Effect.gen(function*() {
      const clientEndpointEffect = HttpApiClient.endpoint(TestApi, {
        httpClient: yield* HttpClient.HttpClient,
        group: "Group1",
        endpoint: "EndpointA"
      })
      expect<Effect.Effect.Error<typeof clientEndpointEffect>>().type.toBe<never>()
      expect<Effect.Effect.Context<typeof clientEndpointEffect>>().type.toBe<
        | "ApiErrorR"
        | "Group1ErrorR"
        | "EndpointAErrorR"
        | "EndpointASuccessR"
        | "EndpointASecurityErrorR"
        | "Group1SecurityErrorR"
        | "ApiSecurityErrorR"
      >()

      const clientEndpoint = yield* clientEndpointEffect

      expect(clientEndpoint({ withResponse: false })).type.toBe<
        Effect.Effect<
          "EndpointASuccess",
          | "ApiError"
          | "Group1Error"
          | "EndpointAError"
          | "EndpointASecurityError"
          | "Group1SecurityError"
          | "ApiSecurityError"
          | HttpApiError.HttpApiDecodeError
          | HttpClientError.HttpClientError
          | ParseError
        >
      >()
    })
  })

  it("group", () => {
    Effect.gen(function*() {
      const clientGroupEffect = HttpApiClient.group(TestApi, {
        httpClient: yield* HttpClient.HttpClient,
        group: "Group1"
      })

      expect<Effect.Effect.Error<typeof clientGroupEffect>>().type.toBe<never>()

      expect<Effect.Effect.Context<typeof clientGroupEffect>>().type.toBe<
        | "ApiErrorR"
        | "Group1ErrorR"
        | "EndpointAErrorR"
        | "EndpointASuccessR"
        | "EndpointBErrorR"
        | "EndpointBSuccessR"
        | "EndpointASecurityErrorR"
        | "EndpointBSecurityErrorR"
        | "Group1SecurityErrorR"
        | "ApiSecurityErrorR"
      >()

      const clientGroup = yield* clientGroupEffect

      expect(clientGroup.EndpointA({ withResponse: false })).type.toBe<
        Effect.Effect<
          "EndpointASuccess",
          | "ApiError"
          | "Group1Error"
          | "EndpointAError"
          | "EndpointASecurityError"
          | "Group1SecurityError"
          | "ApiSecurityError"
          | HttpApiError.HttpApiDecodeError
          | HttpClientError.HttpClientError
          | ParseError
        >
      >()
    })
  })

  it("make", () => {
    Effect.gen(function*() {
      const clientApiEffect = HttpApiClient.make(TestApi)

      expect<Effect.Effect.Error<typeof clientApiEffect>>().type.toBe<never>()

      expect<Effect.Effect.Context<typeof clientApiEffect>>().type.toBe<
        | "ApiErrorR"
        | "Group1ErrorR"
        | "EndpointAErrorR"
        | "EndpointASuccessR"
        | "EndpointBErrorR"
        | "EndpointBSuccessR"
        | "EndpointASecurityErrorR"
        | "EndpointBSecurityErrorR"
        | "Group1SecurityErrorR"
        | "ApiSecurityErrorR"
        | "Group2ErrorR"
        | "EndpointCErrorR"
        | "EndpointCSuccessR"
        | HttpClient.HttpClient
      >()

      const clientApi = yield* clientApiEffect

      expect(clientApi.Group1.EndpointA({ withResponse: false })).type.toBe<
        Effect.Effect<
          "EndpointASuccess",
          | "ApiError"
          | "Group1Error"
          | "EndpointAError"
          | "EndpointASecurityError"
          | "Group1SecurityError"
          | "ApiSecurityError"
          | HttpApiError.HttpApiDecodeError
          | HttpClientError.HttpClientError
          | ParseError
        >
      >()
    })
  })
})

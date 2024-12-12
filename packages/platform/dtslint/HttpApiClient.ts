import { HttpApi, HttpApiClient, HttpApiEndpoint, HttpApiGroup, HttpApiMiddleware } from "@effect/platform"
import type { Schema } from "effect"
import { Effect } from "effect"

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

// -------------------------------------------------------------------------------------
// HttpApiClient.endpoint
// -------------------------------------------------------------------------------------

Effect.gen(function*() {
  const clientEndpointEffect = HttpApiClient.endpoint(TestApi, "Group1", "EndpointA")
  // $ExpectType never
  type _clientEndpointEffectError = Effect.Effect.Error<typeof clientEndpointEffect>
  // $ExpectType "ApiErrorR" | "Group1ErrorR" | "EndpointAErrorR" | "EndpointASuccessR" | "EndpointASecurityErrorR" | "Group1SecurityErrorR" | "ApiSecurityErrorR" | HttpClient<HttpClientError, Scope>
  type _clientEndpointEffectContext = Effect.Effect.Context<typeof clientEndpointEffect>

  const clientEndpoint = yield* clientEndpointEffect

  // $ExpectType Effect<"EndpointASuccess", "ApiError" | "Group1Error" | "EndpointAError" | "EndpointASecurityError" | "Group1SecurityError" | "ApiSecurityError" | HttpApiDecodeError | HttpClientError, never>
  const _endpointCall = clientEndpoint({ withResponse: false })
})

// -------------------------------------------------------------------------------------
// HttpApiClient.group
// -------------------------------------------------------------------------------------

Effect.gen(function*() {
  const clientGroupEffect = HttpApiClient.group(TestApi, "Group1")
  // $ExpectType never
  type _clientGroupEffectError = Effect.Effect.Error<typeof clientGroupEffect>
  // $ExpectType "ApiErrorR" | "Group1ErrorR" | "EndpointAErrorR" | "EndpointASuccessR" | "EndpointBErrorR" | "EndpointBSuccessR" | "EndpointASecurityErrorR" | "EndpointBSecurityErrorR" | "Group1SecurityErrorR" | "ApiSecurityErrorR" | HttpClient<HttpClientError, Scope>
  type _clientGroupEffectContext = Effect.Effect.Context<typeof clientGroupEffect>

  const clientGroup = yield* clientGroupEffect

  // $ExpectType Effect<"EndpointASuccess", "ApiError" | "Group1Error" | "EndpointAError" | "EndpointASecurityError" | "Group1SecurityError" | "ApiSecurityError" | HttpApiDecodeError | HttpClientError, never>
  const _endpointCall = clientGroup.EndpointA({ withResponse: false })
})

// -------------------------------------------------------------------------------------
// HttpApiClient.make
// -------------------------------------------------------------------------------------

Effect.gen(function*() {
  const clientApiEffect = HttpApiClient.make(TestApi)
  // $ExpectType never
  type _clientApiEffectError = Effect.Effect.Error<typeof clientApiEffect>
  // $ExpectType "ApiErrorR" | "Group1ErrorR" | "EndpointAErrorR" | "EndpointASuccessR" | "EndpointBErrorR" | "EndpointBSuccessR" | "EndpointASecurityErrorR" | "EndpointBSecurityErrorR" | "Group1SecurityErrorR" | "ApiSecurityErrorR" | "Group2ErrorR" | "EndpointCErrorR" | "EndpointCSuccessR" | HttpClient<HttpClientError, Scope>
  type _clientApiEffectContext = Effect.Effect.Context<typeof clientApiEffect>

  const clientApi = yield* clientApiEffect

  // $ExpectType Effect<"EndpointASuccess", "ApiError" | "Group1Error" | "EndpointAError" | "EndpointASecurityError" | "Group1SecurityError" | "ApiSecurityError" | HttpApiDecodeError | HttpClientError, never>
  const _endpointCall = clientApi.Group1.EndpointA({ withResponse: false })
})

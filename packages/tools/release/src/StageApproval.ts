import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import type * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import { ReleaseError } from "./Errors.ts"
import { REGISTRY, type StagedItem, StagedItemSchema, stageRequest } from "./Registry.ts"
import { optionalSecret } from "./Secrets.ts"

/** Environment variable holding the maintainer token used to approve. */
export const APPROVE_TOKEN = "NPM_APPROVE_TOKEN"

const decodeStagedItem = Schema.decodeUnknownEffect(Schema.fromJsonString(StagedItemSchema))

const OtpChallengeBody = Schema.fromJsonString(
  Schema.Struct({ authUrl: Schema.String, doneUrl: Schema.String })
)

const decodeOtpChallengeBody = Schema.decodeUnknownEffect(OtpChallengeBody)

/**
 * The two registry calls that make a staged version public, kept apart from
 * the read-only `Registry` because they need a different credential.
 *
 * Verified against pnpm 11.20's bundled `stage/approve.js` and the npm docs:
 *
 * - `viewStaged`: `GET /-/stage/<id>` with `Authorization: Bearer <token>`,
 *   `npm-auth-type: web`, `npm-command: stage`. 404 is `none`; any other
 *   non-200 status is a `ReleaseError`.
 * - `approve`: `POST /-/stage/<id>/approve` with the same headers plus
 *   `npm-otp: <otp>`. A 401 whose body carries `authUrl`/`doneUrl` or whose
 *   `www-authenticate` header mentions `otp` is the registry's proof-of-presence
 *   challenge; it fails with a `ReleaseError` that says the OTP was rejected
 *   or missing. Any other non-2xx status fails with the status and body text.
 *
 * The token comes from `NPM_APPROVE_TOKEN` (a maintainer's granular token on
 * a 2FA account; OIDC trust tokens and stage-only tokens cannot approve). A
 * missing token fails before any request. The OTP never appears in an error
 * message, a log line or a URL.
 */
export class StageApproval extends Context.Service<StageApproval, {
  readonly viewStaged: (id: string) => Effect.Effect<Option.Option<StagedItem>, ReleaseError>
  readonly approve: (id: string, otp: Redacted.Redacted<string>) => Effect.Effect<void, ReleaseError>
}>()("@effect/release/StageApproval") {
  static readonly layer: Layer.Layer<StageApproval, never, HttpClient.HttpClient> = Layer.effect(
    StageApproval,
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient

      // Read once, while the layer's configuration is in scope; a missing token
      // fails each call (before any request), not the layer.
      const configured = yield* optionalSecret(APPROVE_TOKEN).pipe(Effect.orDie)
      const token: Effect.Effect<Redacted.Redacted<string>, ReleaseError> = Option.isNone(configured)
        ? Effect.fail(new ReleaseError({ message: `${APPROVE_TOKEN} is not set; approving staged versions needs it` }))
        : Effect.succeed(configured.value)

      const execute = (id: string, request: HttpClientRequest.HttpClientRequest) =>
        Effect.gen(function*() {
          const bearer = yield* token
          return yield* client.execute(request.pipe(stageRequest(bearer))).pipe(
            Effect.mapError((cause) =>
              new ReleaseError({ message: `Request for staged package ${id} to ${request.url} failed`, cause })
            )
          )
        })

      const bodyText = (response: HttpClientResponse.HttpClientResponse) =>
        response.text.pipe(Effect.orElseSucceed(() => ""))

      const isOtpChallenge = (response: HttpClientResponse.HttpClientResponse, text: string) =>
        decodeOtpChallengeBody(text).pipe(
          Effect.as(true),
          Effect.orElseSucceed(() => response.headers["www-authenticate"]?.toLowerCase().includes("otp") === true)
        )

      const viewStaged = Effect.fn("StageApproval.viewStaged")(function*(id: string) {
        const url = new URL(`-/stage/${id}`, REGISTRY).href
        const response = yield* execute(id, HttpClientRequest.get(url))
        if (response.status === 404) return Option.none<StagedItem>()
        if (response.status !== 200) {
          return yield* new ReleaseError({ message: `Unexpected status ${response.status} from ${url}` })
        }
        const text = yield* bodyText(response)
        const item = yield* decodeStagedItem(text).pipe(
          Effect.mapError((cause) => new ReleaseError({ message: `Unexpected staged item shape from ${url}`, cause }))
        )
        return Option.some<StagedItem>(item)
      })

      const approve = Effect.fn("StageApproval.approve")(function*(id: string, otp: Redacted.Redacted<string>) {
        const url = new URL(`-/stage/${id}/approve`, REGISTRY).href
        const response = yield* execute(
          id,
          HttpClientRequest.post(url).pipe(HttpClientRequest.setHeaders({ "npm-otp": Redacted.value(otp) }))
        )
        if (response.status >= 200 && response.status < 300) return
        const text = yield* bodyText(response)
        if (response.status === 401 && (yield* isOtpChallenge(response, text))) {
          return yield* new ReleaseError({
            message: `The registry required a one-time password it did not accept while approving staged package ${id}`
          })
        }
        return yield* new ReleaseError({
          message: `Failed to approve staged package ${id} (status ${response.status})${
            text.trim() === "" ? "" : `: ${text.trim()}`
          }`
        })
      })

      return StageApproval.of({ viewStaged, approve })
    })
  )
}

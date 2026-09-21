import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import type * as Redacted from "effect/Redacted"
import type * as HttpClient from "effect/unstable/http/HttpClient"
import type { ReleaseError } from "./Errors.ts"
import { notImplementedEffect } from "./NotImplemented.ts"
import type { StagedItem } from "./Registry.ts"

/** Environment variable holding the maintainer token used to approve. */
export const APPROVE_TOKEN = "NPM_APPROVE_TOKEN"

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
    notImplementedEffect("StageApproval.layer")
  )
}

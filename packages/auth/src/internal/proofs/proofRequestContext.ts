import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"

import type { ProofUnavailable } from "./errors.ts"

/** Resolve a host-verified identity when a request needs proof admission.
 * Auth HTTP supplies the current socket peer by default. Raw callers and trusted
 * proxy integrations provide a resolver per invocation. Never accept these keys
 * in operation payloads or install a caller in a shared auth Layer.
 */
export class ProofRequestContext extends Context.Service<
  ProofRequestContext,
  Effect.Effect<
    {
      readonly networkKey: Redacted.Redacted<string>
      readonly deviceKey?: Redacted.Redacted<string>
    },
    ProofUnavailable
  >
>()("@effect/auth/ProofRequestContext") {}

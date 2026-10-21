import * as Context from "effect/Context"
import type * as Redacted from "effect/Redacted"

/** Host-verified opaque network identity. Supply per invocation; never accept this in RPC payloads. */
export class PhoneRequestContext extends Context.Service<
  PhoneRequestContext,
  { readonly networkKey: Redacted.Redacted<string> }
>()("@effect/auth/PhoneRequestContext") {}

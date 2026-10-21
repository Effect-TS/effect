import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

import { encodeUtf8, payloadEncryption } from "../encryption/payload.ts"
import { OAuthUnavailable } from "../signInErrors.ts"
import type { OAuthTransactionKeyring } from "../transactionKeyring.ts"
import { ConfigurationError, Envelope, FlowContext, Payload, Protector, Unavailable } from "./models.ts"

/** Callback-server-only keys. Participating environments never receive these keys. */
export const protectorLayer = (keys: OAuthTransactionKeyring) =>
  Layer.effect(
    Protector,
    payloadEncryption(
      {
        context: FlowContext,
        plaintext: Payload,
        envelope: Envelope,
        format: "oauth-proxy-xchacha20poly1305-v1",
        maximumPlaintextBytes: 131072,
        aad: Effect.fnUntraced(function*(context, keyId) {
          const encoded = yield* Schema.encodeEffect(
            Schema.fromJsonString(
              Schema.Tuple([
                Schema.Literal("effect-auth/oauth-proxy/v1"),
                Schema.String,
                FlowContext
              ])
            )
          )(["effect-auth/oauth-proxy/v1", keyId, context]).pipe(
            Effect.mapError(() => OAuthUnavailable.make({}))
          )

          return yield* encodeUtf8(encoded, 16384)
        }),
        validate: (_context, payload) => Effect.succeed(payload)
      },
      keys
    ).pipe(
      Effect.map((protector) =>
        Protector.of({
          seal: (context, payload) =>
            protector.seal(context, payload).pipe(Effect.mapError(() => Unavailable.make({}))),
          open: (context, envelope) =>
            protector.open(context, envelope).pipe(Effect.mapError(() => Unavailable.make({})))
        })
      ),
      Effect.mapError(() => ConfigurationError.make({}))
    )
  )

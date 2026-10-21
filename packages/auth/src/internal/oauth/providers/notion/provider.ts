import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import type { ProviderDefinition } from "../../providerDefinition.ts"
import { OAuthProviderKey } from "../../schema.ts"
import { OAuthProtocolRejected, type OAuthUnavailable } from "../../signInErrors.ts"
import { provider as oauthProvider } from "../shared/layer.ts"
import {
  OpenIdConnectConfigurationError,
  type PlainOAuthIdentity,
  type PlainOAuthIdentityDecoder
} from "../shared/models.ts"
import type { Requirements } from "../shared/oidc.ts"
import { resolveOptions } from "../shared/options.ts"
import { NotionPerson } from "./profile.ts"

export const notionProviderKey = OAuthProviderKey.make("notion")
const issuer = "https://api.notion.com"

const text = Schema.String.check(Schema.isMaxLength(256))
const url = Schema.String.check(Schema.isMaxLength(2048))
const id = Schema.NonEmptyString.check(Schema.isMaxLength(64))

const TokenIdentity = Schema.Struct({
  owner: Schema.Struct({
    type: Schema.Literal("user"),
    user: Schema.Struct({
      object: Schema.optionalKey(Schema.Literal("user")),
      id,
      name: Schema.optionalKey(Schema.NullOr(text)),
      avatar_url: Schema.optionalKey(Schema.NullOr(url)),
      type: Schema.optionalKey(Schema.Literals(["person", "bot"])),
      person: Schema.optionalKey(NotionPerson)
    })
  }),
  bot_id: Schema.optionalKey(id),
  workspace_id: Schema.optionalKey(id),
  workspace_name: Schema.optionalKey(Schema.NullOr(text)),
  workspace_icon: Schema.optionalKey(Schema.NullOr(url))
})

// oxlint-disable-next-line no-restricted-properties -- Notion token identity is an untyped receipt boundary; tokens are not copied into providerData.
const decodeToken = Schema.decodeUnknownEffect(TokenIdentity)

export const decodeNotionIdentity: PlainOAuthIdentityDecoder = Effect.fnUntraced(function*(
  body: unknown
): Effect.fn.Return<PlainOAuthIdentity, OAuthProtocolRejected> {
  const value = yield* decodeToken(body).pipe(
    Effect.mapError(() => OAuthProtocolRejected.make({}))
  )

  const user = value.owner.user

  if (user.type === "bot") return yield* OAuthProtocolRejected.make({})
  const displayName = user.name?.trim()
  const email = user.person?.email

  return {
    subject: user.id,
    profile: {
      ...(displayName === undefined || displayName === "" ? {} : { displayName }),
      ...(user.avatar_url === undefined || user.avatar_url === null
        ? {}
        : { avatarUrl: user.avatar_url }),
      ...(email === undefined ? {} : { email }),
      providerData: {
        ...user,
        ...(value.bot_id === undefined ? {} : { bot_id: value.bot_id }),
        ...(value.workspace_id === undefined ? {} : { workspace_id: value.workspace_id }),
        ...(value.workspace_name === undefined || value.workspace_name === null
          ? {}
          : { workspace_name: value.workspace_name }),
        ...(value.workspace_icon === undefined || value.workspace_icon === null
          ? {}
          : { workspace_icon: value.workspace_icon })
      }
    }
  }
})

const Registration = Schema.Struct({
  clientId: Schema.NonEmptyString,
  clientSecret: Schema.toType(Schema.RedactedFromValue(Schema.NonEmptyString)),
  configurationGeneration: Schema.optionalKey(Schema.Int),
  issuance: Schema.optionalKey(Schema.Literals(["active", "retired"]))
})

export type ProviderRegistration = typeof Registration.Type

export type ProviderOptions = {
  /** Per-request timeout in seconds, from 1 to 30. Defaults to 10. */
  readonly timeoutSeconds?: number
} & (ProviderRegistration | { readonly registrations: ReadonlyArray<ProviderRegistration> })

/** Sign in with Notion through shared plain OAuth. Identity is owner.user on the
 * token response. Token requests use HTTP Basic and JSON bodies. PKCE is not
 * sent. Notion does not advertise RFC 9207 iss; the HTTP host must give it a
 * distinct callback. /v1/users/me is the bot and is not used. No retained API
 * access is installed. Credentials are captured when the host builds its Layer;
 * supply HttpClient and crypto in that Scope. */
export const provider = (
  options: ProviderOptions
): ProviderDefinition<OpenIdConnectConfigurationError | OAuthUnavailable, Requirements> => ({
  configure: (binding) =>
    resolveOptions(Effect.fnUntraced(function*() {
      const registrations = yield* Schema.decodeEffect(Schema.Array(Registration))(
        "registrations" in options ? options.registrations : [options]
      ).pipe(Effect.mapError(() => OpenIdConnectConfigurationError.make({ reason: "provider" })))

      return yield* oauthProvider<never>({
        registrations: registrations.map((registration) => ({
          ...registration,
          protocol: "oauth" as const,
          issuer,
          responseIssuerMode: "unsupported" as const,
          authorizationEndpoint: "https://api.notion.com/v1/oauth/authorize",
          tokenEndpoint: "https://api.notion.com/v1/oauth/token",
          pkceS256: false,
          tokenBodyFormat: "json" as const,
          tokenEndpointAuthMethod: "client_secret_basic" as const,
          authorizationParameters: { owner: "user" },
          scopes: [],
          identitySource: {
            from: "token" as const,
            decodeIdentity: decodeNotionIdentity
          }
        })),
        ...(options.timeoutSeconds === undefined
          ? {}
          : { timeoutSeconds: options.timeoutSeconds })
      }).configure(binding)
    }))
})

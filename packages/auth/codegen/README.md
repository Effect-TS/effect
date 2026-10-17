# Provider schema generation

Provider profiles use official upstream schemas and SDK declarations, with a
shared generated OpenID Connect profile. Consumers keep using each provider's
`Client`, `Profile`, `make` and `layer`; the generator and upstream SDKs are
maintenance dependencies only.

From the repository root:

```sh
pnpm --filter @effect/auth codegen:providers
pnpm --filter @effect/auth codegen:providers:check
pnpm --filter @effect/auth exec node codegen/bin.ts --help
```

Both generation commands download the URLs in `sources.json` and verify the
full-source SHA-256 digests. They require network access. `check` compares the
13 generated modules without changing repository files. Root `pnpm codegen`
also regenerates them. Builds and consumers use the checked-in output under
`src/oauth/providers/internal/generated/`, behind the private export boundary.

The Effect CLI uses `NodeRuntime`, `NodeServices`, `NodeHttpClient` and
`NodeCrypto` for scoped file access, formatter processes, HTTP and digests.
It has no direct Node imports. Root `pnpm check` checks the maintenance code too.
The `typescript-compiler` alias supplies the SDK syntax reader; the separate
`typescript` development dependency keeps package build commands on the same
native compiler version as the repository root.

## Coverage

| Providers                                                           | Generated source                                                      |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Auth0, Cognito, Hugging Face, Keycloak, Okta, Vercel, Zitadel, Zoom | OpenID Connect Core's standard claims and address table               |
| Apple, GitLab, LINE, Railway, Roblox                                | Shared OpenID claims, with explicit provider extensions               |
| Google                                                              | Shared OpenID claims and Google's `TokenPayload` SDK declaration      |
| Microsoft                                                           | Shared OpenID claims and MSAL's `TokenClaims` declaration             |
| Slack                                                               | Shared OpenID claims and the Slack SDK's OpenID user-info declaration |
| GitHub                                                              | REST API `private-user` OpenAPI component                             |
| Figma                                                               | `/v1/me` OpenAPI response                                             |
| Kick                                                                | Public API's `GetUser` Swagger definition                             |
| Strava                                                              | Official Swagger `SummaryAthlete` definition                          |
| X                                                                   | `User` component from the official XDK OpenAPI input                  |
| Dropbox                                                             | Official SDK's `users.FullAccount` declaration                        |
| Notion                                                              | Official SDK's user declarations and OAuth token response             |
| Linear                                                              | Official GraphQL schema and the local `viewer` operation              |
| Atlassian                                                           | Explicit `/me` profile; no suitable official schema sourced           |

24 of the 25 providers therefore use generated definitions, directly or through
the shared OpenID profile. Provider-specific claims without a suitable official
machine-readable source remain explicit: Apple's boolean-string flags and
account claims, GitLab groups, LINE's `amr`, Railway's `sid`, and Roblox's custom
claims. Atlassian's `/me` fields also remain explicit. Community typings are not
generation inputs.

## Updating upstream inputs

`sources.json` records the source URLs, revisions, full-source digests and
licenses. Most URLs are pinned to Git commits. Kick and Strava publish their
schemas at fixed URLs; a changed response fails digest verification until an
intentional update. X uses its repository snapshot because the live schema
endpoint returns scope arrays in varying order.

For an update, review the new source, license and digest, update the manifest,
then regenerate. Review the generated diff and relevant provider tests together.
Do not edit generated modules. Retain source attribution and license notices in
`../THIRD_PARTY_NOTICES.md`, which is included in the published package.

All sources are verified, rendered and formatted before generated modules are
written. The GraphQL generator receives Linear's schema through a scoped
temporary file, removed when the command finishes. Other inputs stay in memory.
No upstream source snapshot is checked in or shipped.

## Source shapes and auth policy

`readers.ts` reads OpenAPI/Swagger references, TypeScript declarations and the
structured OpenID specification tables. It resolves only local references and
explicitly supplied SDK files; it never executes downloaded SDK code. Unsupported
or recursive models fail generation. `profiles.ts` selects named upstream models
and uses the repository's JSON Schema renderer. The upstream model supplies the
field inventory, including new fields, without a second hand-maintained list.

Most models are emitted as separate field schemas. Providers select the fields
in their public profile and apply their existing string bounds, required fields,
nullability and optionality. Upstream formats and length constraints do not
silently change auth policy. Separate exports let bundlers remove unused fields.
These internal field schemas are not complete API-response validators.

GitHub emits its complete pinned profile with a local validation overlay; only
`id` is required, while nested plan fields keep their existing requirements.
OpenID emits the shared optional profile, omitting the protocol's `sub` field.
Both retain the existing UTF-16 string bounds and safe integer limits. Changes to
their upstream field inventories are visible in the generated diff for review.

Linear's authored `linear.graphql` operation remains the sole API field
selection. The GraphQL generator checks it against the official schema and
supplies the query and field schemas. Auth's transport and compatibility decoder
continue to handle code exchange and profile validation.

The provider API, request behavior, token verification, cancellation and failure
classification stay the same. Generated schemas do not authenticate identities,
retry code exchanges, expose raw claims in errors or expand public profiles to
include every upstream field.

## Verification

The schema expansion in `7643dccadb0deb90ac0d53768ee03cf00f174cdb` was compared
with `91a67a57bc5ee446ebd4cd8f99a02b3afd00258a`.
An isolated comparison of the shared OpenID profile and nine changed provider
profiles matched acceptance and decoded values across 10,830 cases, including
missing fields, nested fields, unknown fields, nullability and string/number
boundaries. CLI probes confirmed that a late digest mismatch, an unsupported
schema reference and stale generated output fail without writing repository
files, with temporary files cleaned up.

The repository's `bundle-compare-selected` workflow measured fixtures exporting
each provider's `Client`, `layer`, `make` and `Profile` from built output. These
are complete minified and gzipped bundles, including shared Effect code, rather
than the incremental cost in an existing application. Sizes use decimal KB.

| Provider  | Before (KB) | After (KB) | Change (KB) |
| --------- | ----------- | ---------- | ----------- |
| Auth0     | 59.39       | 59.58      | +0.19       |
| Dropbox   | 38.05       | 38.13      | +0.08       |
| Figma     | 37.90       | 37.91      | +0.01       |
| Google    | 59.43       | 59.63      | +0.20       |
| Kick      | 38.00       | 38.02      | +0.02       |
| Microsoft | 59.57       | 59.80      | +0.22       |
| Notion    | 38.19       | 38.26      | +0.07       |
| Slack     | 59.47       | 59.68      | +0.21       |
| Strava    | 38.31       | 38.35      | +0.04       |
| X         | 38.00       | 38.02      | +0.02       |

Before bundling, generated JavaScript grows from 14,104 to 45,626 bytes and total
package JavaScript grows from 294,200 to 326,291 bytes, excluding declarations and
source maps. Generation tools, downloaded sources and SDK implementations are
not included in those runtime files.

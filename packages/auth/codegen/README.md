# Provider schema generation spike

GitHub and Linear exercise the existing `@effect/openapi-generator` and
`@effect/graphql-generator` against real provider payloads. Consumers keep using
`GitHub.Client`, `Linear.Client`, `Profile`, `make` and `layer`; generators and
upstream schema files are development inputs, not runtime dependencies.

From the repository root:

```sh
pnpm --filter @effect/auth codegen:providers
pnpm --filter @effect/auth codegen:providers:check
pnpm --filter @effect/auth exec node codegen/bin.ts --help
```

Both commands fetch the pinned source URLs and verify their SHA-256 digests.
They require network access. `check` compares the three generated modules without
changing repository files. Root `pnpm codegen` also regenerates them. Output lives
under `src/oauth/providers/internal/generated/`, behind the package's existing
private export boundary. Builds and consumers use the checked-in generated modules.

The Effect CLI runs through `NodeRuntime` with `NodeServices`, `NodeHttpClient`
and `NodeCrypto` layers for file access, scoped formatter processes, downloads
and digests. Root `pnpm check` also checks the maintenance command's TypeScript.

## Updating upstream inputs

`sources.json` records immutable upstream URLs, full-source SHA-256 digests and
licenses. For an upstream update, review the new commit, license and digest,
update the manifest, then regenerate:

```sh
pnpm --filter @effect/auth codegen:providers
```

Review the manifest and generated output diffs together. Do not edit generated
modules by hand. Source verification, generation and formatting finish before
any generated module is written.

Generation takes GitHub's complete `private-user` schema, including nested
fields. The upstream schema is the field inventory; no local allowlist duplicates
it. Updating the pin makes upstream field additions visible in the generated diff.
Unknown response fields outside the pinned schema are still omitted at runtime.

For Linear, the complete upstream SDL is fetched during generation. The operation in
`src/oauth/providers/internal/generated/linear.graphql` is the sole selection of
fields requested from the API. The GraphQL generator validates it against the
pinned schema and emits only the types it uses. It reads the SDL from a scoped
temporary file that is removed when the command finishes. GitHub's schema stays
in memory. Neither upstream source snapshot is checked in or shipped.

## Auth policy remains local

The upstream models are stricter than the existing auth profiles. The GitHub
generation overlay therefore keeps only `id` required, preserves bounded safe
integers and strings, omits unknown fields, and keeps URL/date fields as strings.
The renderer adapts JSON Schema's code-point length checks to the existing UTF-16
code-unit limits. Nested plan fields remain required. Linear's provider applies
the same existing length bounds and optional/nullable profile policy to generated
field schemas.

The generated Linear operation supplies the query text; its strict result
decoder and GraphQL client are not used for code exchange. The existing auth
transport still owns request limits, scope lifetime, cancellation, token
handling, and failure classification. Any GraphQL `errors` member remains
unavailable; invalid successful profile claims remain rejected. Neither provider
retries an authorization-code exchange or exposes raw profile data in errors.

## Measured result

The initial spike at `93349c3ba45a0b3ee30451e114a35a7da0ef3be9` was compared with
the pre-spike commit `0aa7f1ba3cc5d8b19b22ed74392456308dc1a0f4`, using the
repository's `bundle-compare-selected` workflow and the built
`Client`, `layer`, `make`, and `Profile` exports for each provider:

| Provider | Before (gzip) | After (gzip) | Change            |
| -------- | ------------- | ------------ | ----------------- |
| GitHub   | 38.36 KB      | 38.56 KB     | +0.20 KB (+0.52%) |
| Linear   | 38.07 KB      | 38.58 KB     | +0.50 KB (+1.32%) |

These are complete provider bundles, including their shared Effect dependencies,
not the incremental cost in an application that already imports Effect. The
fixtures imported the built provider modules directly because the scratchpad
workspace does not depend on `@effect/auth`.

In that measurement, unminified provider JavaScript plus its generated modules
grew from 11,263 to 20,831 bytes for GitHub and from 4,469 to 6,224 bytes for
Linear. GitHub's generated checks repeat annotations and bounds; Linear adds a
generated operation and shared scalar module. Neither generator ships to consumers.

An ad hoc comparison against the previous decoders matched 1,507 GitHub and 194
Linear boundary cases. Committed provider tests cover the compatibility policy,
and type tests preserve the consumer profile shapes. Isolated CLI probes verified
that invalid upstream digests, stale output, invalid queries and formatter
failures leave files unchanged. Additional probes generated new top-level and
nested GitHub fields and a new Linear query field without updating another field
list.

Generation is most useful for larger profiles with maintained official schemas.
For Linear's six fields, the benefit is checking the query against the upstream
schema; the hand-authored compatibility policy is still about the same size.

## Scope of the experiment

This demonstrates reproducible generation for one REST profile and one GraphQL
selection. It does not generate token handling, OIDC claims, scopes or identity
policy, and it does not establish that every provider should use generation.
The maintenance and bundle costs should be weighed against a provider's profile
size and the quality of its official schema.

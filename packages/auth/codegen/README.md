# Provider schema generation spike

GitHub and Linear exercise the existing `@effect/openapi-generator` and
`@effect/graphql-generator` against real provider payloads. Consumers keep using
`GitHub.Client`, `Linear.Client`, `Profile`, `make` and `layer`; generators and
upstream schema files are development inputs, not runtime dependencies.

From the repository root:

```sh
pnpm --filter @effect/auth codegen:providers
pnpm --filter @effect/auth codegen:providers:check
```

Generation is offline. `check` verifies the pinned local inputs and compares the
three generated modules without writing files. Root `pnpm codegen` also regenerates
them. Output lives under `src/oauth/providers/internal/generated/`, behind the
package's existing private export boundary.

## Updating upstream inputs

`sources.json` records immutable upstream URLs, full-source SHA-256 digests and
licenses. To reproduce the local excerpts from those sources:

```sh
pnpm --filter @effect/auth codegen:providers:import
pnpm --filter @effect/auth codegen:providers
```

Only `import` uses the network. It verifies both full-source digests before
writing the excerpts and their digests. For an upstream update, review the new
commit, license and full-source digest, change `sources.json`, then run these
commands. Review the input and output diffs together. Do not edit the excerpts
or generated modules by hand.

The importer keeps GitHub's selected `private-user` fields and Linear's selected
`Query.viewer` / `User` fields. Linear interface metadata and descriptions are
irrelevant to this concrete query and are omitted. Its operation is authored in
`src/oauth/providers/internal/generated/linear.graphql`. Selecting fields
explicitly prevents an upstream addition from silently expanding the public
profile.

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

Compared with the pre-spike commit `0aa7f1ba3cc5d8b19b22ed74392456308dc1a0f4`,
using the repository's `bundle-compare-selected` workflow and the built
`Client`, `layer`, `make`, and `Profile` exports for each provider:

| Provider | Before (gzip) | After (gzip) | Change            |
| -------- | ------------- | ------------ | ----------------- |
| GitHub   | 38.36 KB      | 38.56 KB     | +0.20 KB (+0.52%) |
| Linear   | 38.07 KB      | 38.58 KB     | +0.50 KB (+1.32%) |

These are complete provider bundles, including their shared Effect dependencies,
not the incremental cost in an application that already imports Effect. The
fixtures imported the built provider modules directly because the scratchpad
workspace does not depend on `@effect/auth`.

The two pinned excerpts total 7,110 bytes. Unminified provider JavaScript plus its
generated modules grows from 11,263 to 20,831 bytes for GitHub and from 4,469 to
6,224 bytes for Linear. GitHub's generated checks repeat annotations and bounds;
Linear adds a generated operation and shared scalar module. Neither generator
ships to consumers.

An ad hoc comparison against the previous decoders matched 1,507 GitHub and 194
Linear boundary cases. Committed provider tests cover the compatibility policy,
and type tests preserve the consumer profile shapes. The maintenance command was
also checked against a modified input, stale output and missing query: each
failed without overwriting output.

Generation is most useful for larger profiles with maintained official schemas.
For Linear's six fields, the benefit is checking the query against the upstream
schema; the hand-authored compatibility policy is still about the same size.

## Scope of the experiment

This demonstrates reproducible generation for one REST profile and one GraphQL
selection. It does not generate token handling, OIDC claims, scopes or identity
policy, and it does not establish that every provider should use generation.
The maintenance and bundle costs should be weighed against a provider's profile
size and the quality of its official schema.

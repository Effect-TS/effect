# Third-party notices

This package is licensed under the [MIT license](LICENSE).

Selected JOSE and OAuth/OIDC contracts and fixtures are adapted from the pinned
upstream snapshots below, along with the attributed form-encoding adaptation.
The runtime uses Effect's native services; no upstream SDK is a runtime dependency.
The npm `jose` package is used only for tests and independent interoperation.

Public failures are exposed through [JoseError](src/jose/JoseError.ts) and
[OAuthError](src/oauth/OAuthError.ts).

## Yielded Auth provider integrations

Provider configuration, profile schemas, receipt handling, client-secret signing,
discovery supplements, and shared failure propagation are adapted from
[yielded-dev/auth](https://github.com/yielded-dev/auth/tree/cb09bb198773a7994add1dbfaa67d93a0918ddb9),
commit `cb09bb198773a7994add1dbfaa67d93a0918ddb9`.
The source files under `packages/auth/src/oauth/providers/` include the provider
and profile modules for `apple`, `atlassian`, `auth0`, `cognito`, `dropbox`, `figma`,
`github`, `gitlab`, `google`, `huggingface`, `keycloak`, `kick`, `line`, `linear`,
`microsoft`, `notion`, `okta`, `railway`, `roblox`, `slack`, `strava`, `vercel`, `x`,
`zitadel`, and `zoom`; GitHub and Strava's `protocol.ts`; and
`shared/{configuration,discovery,models,oidcTenant,preset,privateKeyJwt,profile,protocol}.ts`.
Shared cancellation fixes and regressions are adapted from
`packages/oauth/src/internal/{ownership,transport}.ts` and
`packages/oauth/test/failure-propagation.test.ts` in the same snapshot.

The local adaptation is in `src/oauth/providers/`, `src/oauth/OAuthProvider.ts`,
and `src/internal/{ownership,transport}.ts`, with coverage in
`test/oauth/providers/`, `test/oauth/failure-propagation.test.ts`, and
`typetest/oauth/providers/`. It uses the local OAuth and signed OIDC implementations,
with scoped Effect services and private typed profiles. Durable transactions,
sessions, account linking, persistence, registration rotation, and connected-grant
refresh workflows are not included. Microsoft subjects consistently use `oid:tid`
alongside the verified concrete issuer; the source's multitenant durable subject
prefix is not part of this API.

### yielded-dev/auth — MIT

```text
MIT License

Copyright (c) 2026 Daniel van der Merwe

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## JOSE contracts

Selected public contract tests and the P-256 fixture in [test/jose/](test/jose/) are adapted from
[panva/jose](https://github.com/panva/jose/tree/505a55b8f73536082367b2614cb77e927ba96ec1),
v6.2.12, commit `505a55b8f73536082367b2614cb77e927ba96ec1` (Filip Skokan).
The selected source contracts are adapted to the supported profile:

| Upstream tests                                                                                                                   | Local tests                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `test/jws/compact.verify.test.ts`, `test/jws/flattened.verify.test.ts`, `test/jws/crit.test.ts`, `test/jws/restrictions.test.ts` | `test/jose/protocols.test.ts`, `test/jose/compact-validation.test.ts`, `test/jose/key-policy.test.ts` |
| `test/jwk/jwk2key.test.ts`, `test/jwk/key_input.test.ts`                                                                         | `test/jose/key-policy.test.ts`, `test/jose/protocols.test.ts`                                         |
| `test/jwt/verify.test.ts`                                                                                                        | `test/jose/claims.test.ts`, `test/jose/jwt-verification.test.ts`                                      |
| `test/jwks/local.test.ts`, `test/jwks/remote.test.ts`                                                                            | `test/jose/jwks.test.ts`, `test/jose/jwks-recovery.test.ts`, `test/jose/fixtures.ts`                  |
| `test/jwe/compact.encrypt.test.ts`, `test/jwe/compact.decrypt.test.ts`, `test/jwe/flattened.decrypt.test.ts`                     | `test/jose/protocols.test.ts`, `test/jose/compact-validation.test.ts`                                 |

Only applicable public behavior is adapted; flattened-format tests supply shared
header and authentication-tag validation, not JSON serialization support. Tests
use independent interoperation against that release, plus Effect-specific
policy capture, scoped cancellation and bounded-waiter regressions. This is not
a full upstream suite port or a claim of full upstream compatibility.

The source implementation informs claim validation, protected-header policy, and
key selection in `src/jose/Jwt.ts`, `src/jose/Jws.ts`, `src/jose/Jwk.ts`, `src/jose/Jwks.ts`, and
`src/jose/Jwe.ts`; these implementations are written for Effect services and Schema.
No panva/jose runtime implementation is bundled or required.

The wire formats follow RFC 7515, RFC 7516, RFC 7517, RFC 7518, RFC 7519,
and RFC 8037; policy follows RFC 8725. No RFC code or example vectors are copied.
Cryptographic primitives use Effect’s native algorithm services; JWE nonces use `SecureRandom`.

### panva/jose — MIT

The MIT License (MIT)

Copyright (c) 2018 Filip Skokan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## OAuth and OpenID Connect contracts

The case mappings identify selected assertions and fixtures for the OAuth
authorization-code + S256 profile. They do not represent complete ports of
the upstream suites. Local case names below are exact; paths are package-relative.

### openid-client 6.8.8

Version: **6.8.8**. Commit: **`04c59826121f736afc71fe005439c961d5fb6f3b`**.

| Pinned upstream file and case                                                                                                                                                                          | Local adaptation                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [test/token-response.test.ts](https://github.com/panva/openid-client/blob/04c59826121f736afc71fe005439c961d5fb6f3b/test/token-response.test.ts), `expiresIn returns zero for an already expired token` | [test/oauth/protocol.test.ts](test/oauth/protocol.test.ts), `distinguishes complete invalid_grant400 from ambiguous or malformed receipts`: zero-lifetime assertion only. |

The local `expiresIn` value is the decoded lifetime; the upstream helper's
elapsed-time/countdown implementation is not included.

```text
The MIT License (MIT)

Copyright (c) 2016 Filip Skokan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### oauth4webapi 3.8.8

Version: **3.8.8**. Commit: **`916b97952dbf431d8b72f369840de54f5a286e4d`**.

Runtime adaptation: [src/index.ts, `formUrlEncode`](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/src/index.ts#L1867),
used by upstream `ClientSecretBasic`, is adapted as
[src/oauth/OAuth.ts, `basicComponent`](src/oauth/OAuth.ts). It form-encodes each credential
component before joining them with a colon, including escaped punctuation and
`+` for spaces. The MIT license below covers this adaptation as well as the
selected test contracts.

| Pinned upstream file and cases                                                                                                                                                                                                                                                                                    | Local adaptation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [test/client_auth.test.ts](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/test/client_auth.test.ts): `client_secret_basic`, `client_secret_basic (appendix b)`, `client_secret_post`, `none`                                                                                 | [test/oauth/protocol.test.ts](test/oauth/protocol.test.ts): `authenticates Basic/Post/None once and preserves private raw provider receipts`, including the Appendix B punctuation fixture.                                                                                                                                                                                                                                                                                                                                                                     |
| [test/discovery.test.ts](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/test/discovery.test.ts): `discoveryRequest() - oidc with a pathname`, `processDiscoveryResponse()`                                                                                                   | [test/oauth/protocol.test.ts](test/oauth/protocol.test.ts): `discovers the exact issuer including its trailing slash and rejects substituted metadata`, selecting pathname and exact-issuer assertions.                                                                                                                                                                                                                                                                                                                                                         |
| [test/authorization_code.test.ts](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/test/authorization_code.test.ts): `authorizationCodeGrantRequest()`, `authorizationCodeGrantRequest() w/ Extra Parameters`, `processAuthorizationCodeResponse()`                            | [test/oauth/protocol.test.ts](test/oauth/protocol.test.ts): `authenticates Basic/Post/None once and preserves private raw provider receipts`; `distinguishes complete invalid_grant400 from ambiguous or malformed receipts`, selecting request fields, extra parameters, token values and malformed-response checks.                                                                                                                                                                                                                                           |
| [test/refresh_token.test.ts](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/test/refresh_token.test.ts): `refreshTokenGrantRequest()`, `processRefreshTokenResponse() without ID Tokens`                                                                                     | [test/oauth/protocol.test.ts](test/oauth/protocol.test.ts): `refreshes, fetches the installed profile and revokes with separately installed credentials`, selecting refresh request fields and token receipt parsing.                                                                                                                                                                                                                                                                                                                                           |
| [test/revocation.test.ts](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/test/revocation.test.ts): `revocationRequest()`, `processRevocationResponse()`                                                                                                                      | [test/oauth/protocol.test.ts](test/oauth/protocol.test.ts): `refreshes, fetches the installed profile and revokes with separately installed credentials`; `bounds bodies, refuses redirects and unexpected URLs, and never repeats failed exchange/revocation`, selecting request fields, empty HTTP 200 success and failed responses.                                                                                                                                                                                                                          |
| [test/authorization_code.test.ts](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/test/authorization_code.test.ts): `processAuthorizationCodeResponse() nonce checks`, `processAuthorizationCodeResponse() auth_time checks`, `processAuthorizationCodeResponse() azp checks` | [test/oauth/Oidc-verification.test.ts](test/oauth/Oidc-verification.test.ts): `rejects authenticated wrong issuer/aud/azp/time/nonce/hash claims with no clock tolerance`, selecting nonce, authentication-age and authorized-party checks.                                                                                                                                                                                                                                                                                                                     |
| [test/auth_time.test.ts](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/test/auth_time.test.ts): `authorization code auth_time with ${JSON.stringify(options)}`                                                                                                              | [test/oauth/Oidc-verification.test.ts](test/oauth/Oidc-verification.test.ts): `rejects authenticated wrong issuer/aud/azp/time/nonce/hash claims with no clock tolerance`, selecting the maximum-age rejection. The upstream explicit-skip variants are not ported.                                                                                                                                                                                                                                                                                             |
| [test/jwt_claims.test.ts](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/test/jwt_claims.test.ts): `${process.name}() validates required ID Token claims`, `${name} validates required ID Token claims`, `${name} ID Token policy checks`                                    | [test/oauth/Oidc-verification.test.ts](test/oauth/Oidc-verification.test.ts): `verifies signed OIDC claims/hashes, retains profile extensions and clamps authentication time to captured start`; `rejects authenticated wrong issuer/aud/azp/time/nonce/hash claims with no clock tolerance`; `verifies signatures before definite claim rejection and keeps key/signature faults ambiguous`. These adapt claim fixtures and selected nonce/azp/signature checks to signed RS256 tokens; upstream grant, hybrid and detached-signature matrices are not ported. |

The PKCE verifier/challenge vector in [test/oauth/protocol.test.ts](test/oauth/protocol.test.ts),
`uses RFC7636 S256 and fresh private 32-byte transaction secrets`, comes from
[RFC7636 Appendix B](https://www.rfc-editor.org/rfc/rfc7636.html#appendix-B).

The original effect-auth package supplies the strict single-audience policy,
signature-before-rejection classification, hash bindings, captured authentication
time, refresh continuity, private receipts, no retries, and scoped cleanup.
The refresh-continuity case is guided by
[OpenID Connect Core 12.2](https://openid.net/specs/openid-connect-core-1_0.html#RefreshTokenResponse).
The cancellation seam came from its former
`packages/auth-openid-client/test/protocol.test.ts`. Metadata immutability, bounded
JSON, tenant key authority, and close-active-operation regressions are local cases.

```text
The MIT License (MIT)

Copyright (c) 2022 Filip Skokan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

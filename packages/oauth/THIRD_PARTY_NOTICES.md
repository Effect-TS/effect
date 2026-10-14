# Third-party notices

This package is licensed under the [MIT license](LICENSE).

Selected OAuth/OIDC contracts were adapted into Effect tests from the pinned
upstream snapshots below. The native runtime uses Effect, and
includes the attributed form-encoding adaptation below. Neither upstream SDK is
a runtime dependency.

The case mappings identify selected assertions and fixtures for the OAuth
authorization-code + S256 profile. They do not represent complete ports of
the upstream suites. Local case names below are exact; paths are package-relative.

## openid-client 6.8.8

Version: **6.8.8**. Commit: **`04c59826121f736afc71fe005439c961d5fb6f3b`**.

| Pinned upstream file and case                                                                                                                                                                          | Local adaptation                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [test/token-response.test.ts](https://github.com/panva/openid-client/blob/04c59826121f736afc71fe005439c961d5fb6f3b/test/token-response.test.ts), `expiresIn returns zero for an already expired token` | [test/protocol.test.ts](test/protocol.test.ts), `distinguishes complete invalid_grant400 from ambiguous or malformed receipts`: zero-lifetime assertion only. |

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

## oauth4webapi 3.8.8

Version: **3.8.8**. Commit: **`916b97952dbf431d8b72f369840de54f5a286e4d`**.

Runtime adaptation: [src/index.ts, `formUrlEncode`](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/src/index.ts#L1867),
used by upstream `ClientSecretBasic`, is adapted as
[src/OAuth.ts, `basicComponent`](src/OAuth.ts). It form-encodes each credential
component before joining them with a colon, including escaped punctuation and
`+` for spaces. The MIT license below covers this adaptation as well as the
selected test contracts.

| Pinned upstream file and cases                                                                                                                                                                                                                                                         | Local adaptation                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [test/client_auth.test.ts](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/test/client_auth.test.ts): `client_secret_basic`, `client_secret_basic (appendix b)`, `client_secret_post`, `none`                                                      | [test/protocol.test.ts](test/protocol.test.ts): `authenticates Basic/Post/None once and preserves private raw provider receipts`, including the Appendix B punctuation fixture.                                                                                                                                            |
| [test/discovery.test.ts](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/test/discovery.test.ts): `discoveryRequest() - oidc with a pathname`, `processDiscoveryResponse()`                                                                        | [test/protocol.test.ts](test/protocol.test.ts): `discovers the exact issuer including its trailing slash and rejects substituted metadata`, selecting pathname and exact-issuer assertions.                                                                                                                                |
| [test/authorization_code.test.ts](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/test/authorization_code.test.ts): `authorizationCodeGrantRequest()`, `authorizationCodeGrantRequest() w/ Extra Parameters`, `processAuthorizationCodeResponse()` | [test/protocol.test.ts](test/protocol.test.ts): `authenticates Basic/Post/None once and preserves private raw provider receipts`; `distinguishes complete invalid_grant400 from ambiguous or malformed receipts`, selecting request fields, extra parameters, token values and malformed-response checks.                  |
| [test/refresh_token.test.ts](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/test/refresh_token.test.ts): `refreshTokenGrantRequest()`, `processRefreshTokenResponse() without ID Tokens`                                                          | [test/protocol.test.ts](test/protocol.test.ts): `refreshes, fetches the installed profile and revokes with separately installed credentials`, selecting refresh request fields and token receipt parsing.                                                                                                                  |
| [test/revocation.test.ts](https://github.com/panva/oauth4webapi/blob/916b97952dbf431d8b72f369840de54f5a286e4d/test/revocation.test.ts): `revocationRequest()`, `processRevocationResponse()`                                                                                           | [test/protocol.test.ts](test/protocol.test.ts): `refreshes, fetches the installed profile and revokes with separately installed credentials`; `bounds bodies, refuses redirects and unexpected URLs, and never repeats failed exchange/revocation`, selecting request fields, empty HTTP 200 success and failed responses. |

The PKCE verifier/challenge vector in [test/protocol.test.ts](test/protocol.test.ts),
`uses RFC7636 S256 and fresh private 32-byte transaction secrets`, comes from
[RFC7636 Appendix B](https://www.rfc-editor.org/rfc/rfc7636.html#appendix-B).

The original effect-auth package supplies private receipts, no retries and scoped
cleanup. The cancellation seam came from its former
`packages/auth-openid-client/test/protocol.test.ts`. Metadata immutability,
bounded JSON and close-active-operation regressions are local cases. Signed
ID-token verification, signature tests, and JOSE code are not included in this port.

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

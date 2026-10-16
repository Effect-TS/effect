# Third-party notices

This package is licensed under the [MIT license](LICENSE).

Selected JOSE and OAuth/OIDC contracts and fixtures are adapted from the pinned
upstream snapshots below, along with the attributed form-encoding adaptation.
The runtime uses Effect's native services; no upstream SDK is a runtime dependency.
The npm `jose` package is used only for tests and independent interoperation.

Public failures are exposed through [JoseError](src/jose/JoseError.ts) and
[OAuthError](src/oauth/OAuthError.ts).

## Generated provider schemas

The private modules in `src/oauth/providers/internal/generated/` derive field
schemas from these official sources. Full input digests are recorded in
`codegen/sources.json`. Upstream sources are downloaded and verified during
generation; upstream snapshots and SDK implementations are not distributed.
Auth-specific field selection, bounds, optionality, identity and error policies
are maintained separately. Upstream descriptions and examples are omitted.

| Input           | Source                                                                                                                                                                                                                   | Revision / version                         | License / terms                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `github`        | [github/rest-api-description](https://raw.githubusercontent.com/github/rest-api-description/798498bd7d7350b26597b07cdcbb075d2eb0fa8a/descriptions/api.github.com/api.github.com.2026-03-10.json)                         | `798498bd7d7350b26597b07cdcbb075d2eb0fa8a` | [License / terms](https://github.com/github/rest-api-description/blob/798498bd7d7350b26597b07cdcbb075d2eb0fa8a/LICENSE.md)                  |
| `linear`        | [linear/linear](https://raw.githubusercontent.com/linear/linear/9dd2ed80f93ae596f4f7fa21aa7cf80895c58514/packages/sdk/src/schema.graphql)                                                                                | `9dd2ed80f93ae596f4f7fa21aa7cf80895c58514` | [License / terms](https://github.com/linear/linear/blob/9dd2ed80f93ae596f4f7fa21aa7cf80895c58514/LICENSE)                                   |
| `openid`        | [openid/connect](https://raw.githubusercontent.com/openid/connect/ba6bbf1dc37d7ce207028d1dc7b14f5082f7c471/openid-connect-core-1_0.xml)                                                                                  | `ba6bbf1dc37d7ce207028d1dc7b14f5082f7c471` | [License / terms](https://github.com/openid/connect/blob/ba6bbf1dc37d7ce207028d1dc7b14f5082f7c471/openid-connect-core-1_0.xml)              |
| `figma`         | [figma/rest-api-spec](https://raw.githubusercontent.com/figma/rest-api-spec/7ec6254f6b8b49eb13136349ff4d83bf69bd7e72/openapi/openapi.yaml)                                                                               | `7ec6254f6b8b49eb13136349ff4d83bf69bd7e72` | [License / terms](https://github.com/figma/rest-api-spec/blob/7ec6254f6b8b49eb13136349ff4d83bf69bd7e72/LICENSE)                             |
| `dropbox`       | [dropbox/dropbox-sdk-js](https://raw.githubusercontent.com/dropbox/dropbox-sdk-js/969f919d5055ad6e666f19e09d1ab00082040d64/types/dropbox_types.d.ts)                                                                     | `969f919d5055ad6e666f19e09d1ab00082040d64` | [License / terms](https://github.com/dropbox/dropbox-sdk-js/blob/969f919d5055ad6e666f19e09d1ab00082040d64/LICENSE)                          |
| `notion-common` | [makenotion/notion-sdk-js](https://raw.githubusercontent.com/makenotion/notion-sdk-js/0ffdbba3004b27438ca72df769412268e4fdede1/src/api-endpoints/common.ts)                                                              | `0ffdbba3004b27438ca72df769412268e4fdede1` | [License / terms](https://github.com/makenotion/notion-sdk-js/blob/0ffdbba3004b27438ca72df769412268e4fdede1/LICENSE)                        |
| `notion-oauth`  | [makenotion/notion-sdk-js](https://raw.githubusercontent.com/makenotion/notion-sdk-js/0ffdbba3004b27438ca72df769412268e4fdede1/src/api-endpoints/oauth.ts)                                                               | `0ffdbba3004b27438ca72df769412268e4fdede1` | [License / terms](https://github.com/makenotion/notion-sdk-js/blob/0ffdbba3004b27438ca72df769412268e4fdede1/LICENSE)                        |
| `google`        | [googleapis/google-auth-library-nodejs](https://raw.githubusercontent.com/googleapis/google-auth-library-nodejs/a95b8272197f35453d1647eed85be475d51474c9/src/auth/loginticket.ts)                                        | `a95b8272197f35453d1647eed85be475d51474c9` | [License / terms](https://github.com/googleapis/google-auth-library-nodejs/blob/a95b8272197f35453d1647eed85be475d51474c9/LICENSE)           |
| `microsoft`     | [AzureAD/microsoft-authentication-library-for-js](https://raw.githubusercontent.com/AzureAD/microsoft-authentication-library-for-js/4d1e6f9516df2d0d21b8537010bbd8afd5bffe4c/lib/msal-common/src/account/TokenClaims.ts) | `4d1e6f9516df2d0d21b8537010bbd8afd5bffe4c` | [License / terms](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/4d1e6f9516df2d0d21b8537010bbd8afd5bffe4c/LICENSE) |
| `slack`         | [slackapi/node-slack-sdk](https://raw.githubusercontent.com/slackapi/node-slack-sdk/1fabb452808d6c643a779c7fa8af36a34077c9ac/packages/web-api/src/types/response/OpenIDConnectUserInfoResponse.ts)                       | `1fabb452808d6c643a779c7fa8af36a34077c9ac` | [License / terms](https://github.com/slackapi/node-slack-sdk/blob/1fabb452808d6c643a779c7fa8af36a34077c9ac/LICENSE)                         |
| `slack-client`  | [slackapi/node-slack-sdk](https://raw.githubusercontent.com/slackapi/node-slack-sdk/1fabb452808d6c643a779c7fa8af36a34077c9ac/packages/web-api/src/WebClient.ts)                                                          | `1fabb452808d6c643a779c7fa8af36a34077c9ac` | [License / terms](https://github.com/slackapi/node-slack-sdk/blob/1fabb452808d6c643a779c7fa8af36a34077c9ac/LICENSE)                         |
| `kick`          | [Kick Public API](https://api.kick.com/swagger/doc.json)                                                                                                                                                                 | `1.0.0`                                    | [License / terms](https://www.apache.org/licenses/LICENSE-2.0)                                                                              |
| `strava`        | [Strava API](https://developers.strava.com/swagger/athlete.json)                                                                                                                                                         | `3.0.0`                                    | [License / terms](https://www.strava.com/legal/api)                                                                                         |
| `x`             | [xdevplatform/xdk](https://raw.githubusercontent.com/xdevplatform/xdk/84c26540df30c0b798e50e34151c56d5d262ba1c/specs/openapi.json)                                                                                       | `84c26540df30c0b798e50e34151c56d5d262ba1c` | [License / terms](https://github.com/xdevplatform/xdk/blob/84c26540df30c0b798e50e34151c56d5d262ba1c/LICENSE)                                |

### MIT-licensed sources

The MIT license below applies to the selected GitHub, Linear, Figma, Dropbox,
Notion, Microsoft and Slack sources, and to the XDK repository. Their notices are:

```text
Copyright (c) 2020 GitHub
Copyright (c) 2019 Linear
Copyright (c) 2023 Figma
Copyright (c) 2020 Dropbox Inc., http://www.dropbox.com/
Copyright 2021 Notion Labs, Inc.
Copyright (c) Microsoft Corporation. All rights reserved.
Copyright (c) 2014- Slack Technologies, LLC
Copyright (c) 2024 XDK Project

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

The XDK OpenAPI document also identifies the
[X Developer Agreement](https://docs.x.com/developer-terms/agreement) and
[Developer Policy](https://docs.x.com/developer-terms/policy) as the terms for
using the X API.

### OpenID Connect

The shared OpenID profile is derived from the standard claims table and address
claim definition in the pinned OpenID Connect Core source above. This adaptation
implements those claims and does not imply endorsement by the OpenID Foundation.
The source's notices follow:

```text
Copyright (c) 2025 The OpenID Foundation.

The OpenID Foundation (OIDF) grants to any Contributor, developer,
implementer, or other interested party a non-exclusive, royalty free,
worldwide copyright license to reproduce, prepare derivative works from,
distribute, perform and display, this Implementers Draft or Final
Specification solely for the purposes of (i) developing specifications, and
(ii) implementing Implementers Drafts and Final Specifications based on such
documents, provided that attribution be made to the OIDF as the source of the
material, but that such attribution does not indicate an endorsement by the
OIDF.

The technology described in this specification was made available from
contributions from various sources, including members of the OpenID Foundation
and others. Although the OpenID Foundation has taken steps to help ensure that
the technology is available for distribution, it takes no position regarding
the validity or scope of any intellectual property or other rights that might
be claimed to pertain to the implementation or use of the technology described
in this specification or the extent to which any license under such rights
might or might not be available; neither does it represent that it has made
any independent effort to identify any such rights. The OpenID Foundation and
the contributors to this specification make no (and hereby expressly disclaim
any) warranties (express, implied, or otherwise), including implied warranties
of merchantability, non-infringement, fitness for a particular purpose, or
title, related to this specification, and the entire risk as to implementing
this specification is assumed by the implementer. The OpenID Intellectual
Property Rights policy requires contributors to offer a patent promise not to
assert certain patent claims against other contributors and against
implementers. The OpenID Foundation invites any interested party to bring to
its attention any copyrights, patents, patent applications, or other
proprietary rights that may cover technology that may be required to practice
this specification.
```

### Strava

Strava publishes Swagger model descriptions for
[client generation](https://developers.strava.com/docs/#client-code), including
the athlete model used here. These descriptions identify no separate open source
license; the [Strava API Agreement](https://www.strava.com/legal/api) governs the
API materials. The generated module uses model field names and JSON types, with
local auth policy, and does not reproduce upstream prose or examples.

### Apache-2.0 sources

The Google Auth Library source carries `Copyright 2014 Google LLC`. Kick's
published Swagger document identifies Apache-2.0 in `info.license`. Selected
model definitions from both are adapted into Effect Schema under this license:

```text
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```

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

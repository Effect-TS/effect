# GitHub GraphQL schema fixtures

Vendored copies of GitHub's public GraphQL schema, used as the acceptance fixture for the generator (EFF-1828). Both files are pinned to a commit and must be byte-identical to upstream; the digests below are what the tests and the refresh procedure check against.

| File                  | Upstream                                                                                 | Pinned commit                              | SHA-256                                                            | Bytes     |
| --------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------ | --------- |
| `schema.docs.graphql` | [github/docs](https://github.com/github/docs) `src/graphql/data/fpt/schema.docs.graphql` | `b93d24a586415cb392f05738d2092cf4887510c5` | `4b11889444f390414dbce052da9f09771e0eb155c1981e2d22c012d73cdfe768` | 1,562,049 |
| `schema.json`         | [octokit/graphql-schema](https://github.com/octokit/graphql-schema) `schema.json`        | `597478f99cfd3d425e9fcac757d97e851ed48720` | `bbdb03f4006f4e34964d67d55385f1c8c47c4cacd507ccdc38af2544247ecddd` | 4,970,156 |

The two files describe different schema snapshots (the SDL is synced from GitHub almost daily, the octokit introspection JSON was last regenerated on 2025-02-27). Tests pin them separately and never assert that they agree.

## Licenses

- `schema.docs.graphql` is distributed by GitHub under the MIT License (`LICENSE-CODE` in github/docs, "Copyright 2026 GitHub"). The file lives under `src/`, which that license covers; the repository's CC-BY-4.0 license applies only to its `assets`, `content` and `data` folders.
- `schema.json` is distributed under the MIT License (`LICENSE.md` in octokit/graphql-schema, "Copyright (c) 2017 Gregor Martynus").

Both notices are reproduced here in full:

```text
MIT License

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

## Refreshing

Pick a new commit for each upstream file, download it at that exact commit, record the new commit and digest in the table above, and update the counts pinned in `test/GitHubFixture.test.ts`. Never download from a branch name.

```sh
cd packages/tools/graphql-generator/test/fixtures/github
curl -sSL -o schema.docs.graphql "https://raw.githubusercontent.com/github/docs/<commit>/src/graphql/data/fpt/schema.docs.graphql"
curl -sSL -o schema.json "https://raw.githubusercontent.com/octokit/graphql-schema/<commit>/schema.json"
sha256sum schema.docs.graphql schema.json
```

Both files are excluded from `dprint` so the vendored bytes stay verifiable against upstream.

## Operations

`operations/*.graphql` are not vendored. They are hand-written executable documents against the pinned SDL, used by the printer round-trip tests and later by the generator snapshots.

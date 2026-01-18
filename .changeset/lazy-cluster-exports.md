---
"@effect/platform-bun": patch
"@effect/platform-node": patch
---

Remove eager exports of cluster modules from main index

These modules depend on @effect/rpc and @effect/cluster which are optional peer
dependencies. Eagerly exporting them from the main index causes import failures
when users have mismatched versions of these optional dependencies, or when
package managers resolve them to incompatible versions.

Users who need clustering can still import directly:
- `import * as BunClusterHttp from "@effect/platform-bun/BunClusterHttp"`
- `import * as BunClusterSocket from "@effect/platform-bun/BunClusterSocket"`
- `import * as NodeClusterHttp from "@effect/platform-node/NodeClusterHttp"`
- `import * as NodeClusterSocket from "@effect/platform-node/NodeClusterSocket"`

This prevents the common error where importing `{ BunHttpServer }` or
`{ NodeHttpServer }` fails due to transitive dependency resolution issues
with @effect/rpc.

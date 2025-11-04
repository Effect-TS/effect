---
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/cluster": minor
"@effect/rpc": patch
"@effect/workflow": minor
---

backport @effect/cluster from effect v4

@effect/cluster no longer requires a Shard Manager, and instead relies on the
`RunnerStorage` service to track runner state.

To migrate, remove any Shard Manager deployments and use the updated layers in
`@effect/platform-node` or `@effect/platform-bun`.

# Breaking Changes

- `ShardManager` module has been removed
- `EntityNotManagedByRunner` error has been removed
- Shard locks now use database advisory locks, which requires stable sessions
  for database connections. This means load balancers or proxies that rotate
  connections may cause issues.
- `@effect/platform-node/NodeClusterSocketRunner` is now
  `@effect/cluster/NodeClusterSocket`
- `@effect/platform-node/NodeClusterHttpRunner` is now
  `@effect/cluster/NodeClusterHttp`
- `@effect/platform-bun/BunClusterSocketRunner` is now
  `@effect/cluster/BunClusterSocket`
- `@effect/platform-bun/BunClusterHttpRunner` is now
  `@effect/cluster/BunClusterHttp`

# New Features

- `RunnerHealth.layerK8s` has been added, which uses the Kubernetes API to track
  runner health and liveness. To use it, you will need a service account with
  permissions to read pod information.

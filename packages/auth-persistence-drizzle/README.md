# @effect/auth-persistence-drizzle

Drizzle bindings, table mappings, and migration helpers for Effect Auth. This
package connects Drizzle tables to `@effect/auth-persistence`; driver modules
supply transactions or atomic batches.

Import mapping helpers from the root and a driver from its explicit module, such
as `/Postgres` or `/SqliteBun`. Install `drizzle-orm` and the corresponding Effect
SQL driver. Supply `Digest` and `SecureRandom` from `effect/crypto` to persistence
construction and transaction coordinators, for example with `NodeCrypto.layer`
from `@effect/platform-node` or `BunCrypto.layer` from `@effect/platform-bun`. Composed drivers expose `AuthPersistence`; explicit driver modules
also expose lower-level factories.

The supported Drizzle release is `drizzle-orm@1.0.0-rc.4`. Bun projects can apply
the verified patch with
[`@effect/drizzle-effect-v4-patch`](../drizzle-effect-v4-patch/README.md):

```sh
bunx --package @effect/drizzle-effect-v4-patch effect-drizzle-patch patch
```

For other package managers, apply the
[Effect compatibility patch](../drizzle-effect-v4-patch/patches/drizzle-orm@1.0.0-rc.4.patch)
and commit the patch configuration and lockfile. It updates Drizzle’s Effect
schema API names and SQL import paths. This repository registers the patch in
`pnpm-workspace.yaml`.

Applications own subjects, policy, claims, delivery, and database connections.
Drizzle Kit generates migrations from managed or application-declared tables.
Provide `AuthPersistence.migrationsLayer({ migrationsFolder })` explicitly to
apply those files before starting auth.

D1 also supports managed tables through `AuthPersistence.make(auth).managed(...)`.
Supply the primary D1 binding through `D1Client.layer` and apply generated SQL
with `AuthPersistence.migrationsLayer({ migrations })` using bundled SQL,
or with your existing D1 migration runner. Its composed services use atomic batches.
OAuth sign-in and retained provider access use the same managed composition.
Password provisioning returns subject values through `Persistence.Provisioning`;
the library commits the account and credentials together.

SQLite/D1 and PostgreSQL driver modules also expose `OAuthProxyPersistence` for
callback proxy storage.

Durable Object SQLite uses Effect SQL’s asynchronous transaction owner. Use
`SqliteDo.databaseLayer` or `SqliteDo.makeDatabase(existingDrizzle)` so cryptography
can suspend inside the owned transaction; arbitrary raw Drizzle outer
transactions are unsupported.

Acquire a driver’s services once per database configuration. Run coordinated
operations through that driver’s `coordinate*` function so it owns the SQL
transaction or D1 batch; nested or externally owned transactions are rejected.

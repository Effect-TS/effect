# @effect/auth-persistence

Effect SQL persistence and shared storage contracts for `@effect/auth`.

Import the named `AuthPersistence` facade and provide an explicit `SqlClient`,
`SecureRandom`, and `Digest` to its layer. Managed storage requires a stable
`prefix`; retain the existing prefix when connecting an existing database.
Drizzle integrations live in `@effect/auth-persistence-drizzle`.

The composed layer covers password sign-in and management, email verification
and changes, phone sign-in, passkey sign-in and management, OAuth sign-in with
optional retained access, and connected accounts with stateful sessions on
PostgreSQL and SQLite. OAuth-only definitions also support stateless sessions
without a session table; identity authority and OAuth flows remain durable.
Other stateless combinations and state-assisted sessions require explicit
persistence services.

`OAuthPersistence` supplies provider sign-in, registration, login linking and
unlinking, and retained grants through explicit table mappings with interactive
transactions. Provide `SqlClient`, `SecureRandom`, `Digest`, and lifecycle hooks.
Applications own subjects, policy, claims, delivery, encryption keys, and migrations.

`OAuthServerPersistence` supplies consent and grant storage for OAuth servers.
`OAuthProxyPersistence` stores encrypted callback attempts on SQLite/D1 or
PostgreSQL. Both stores require standalone commits. `BrowserLoginPersistence`
stores browser login attempts through the shared commit coordinator.

Adapter authors use typed table mappings and `NativeSqlTables` from
`@effect/auth-persistence/Adapter`. Use the explicit coordinators when auth and
application writes must share one commit. Separate transaction owners cannot
provide an atomic commit. Request-scoped database drivers must retain the
current request's SQL connection.

The opt-in `@effect/auth-persistence/Testing` module provides isolated, non-durable
password and session storage. `Testing.services()` supplies portable password
hashing, a shared KDF admission limit, message digests, and secure randomness.
Pass a `seed` only for reproducible tests. `Testing.layer()` uses the Effect clock,
including `TestClock`, and requires application claims and authentication policy.
See [the in-memory test](test/Testing.test.ts) for complete composition.

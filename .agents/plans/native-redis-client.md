# Native Redis client implementation and testing plan

Replace the external Redis driver used by `@effect/platform-node/NodeRedis`
with a general-purpose, dependency-free Effect Redis client. Standalone,
Cluster, and Sentinel support are required in the first release before the
node-redis dependency is removed. Persistence consumers provide compatibility
coverage; they do not define the general client's capabilities.

Status: implementation and local validation complete in the separate
`@effect/redis` package. The real-server matrix targets
Redis 7.2.6 and 8.10.2. RESP2 is the default and RESP3 is opt-in. The persistence
adapter supports standalone and Sentinel and explicitly rejects Cluster work.

## Current implementation and migration

`packages/platform/node/src/NodeRedis.ts` now provides the native client and
Node transport. The former node-redis client, Promise-based `use`, and external
configuration types are replaced by Effect operations and `NodeRedis.Options`.
The external driver peer and development dependencies have been removed after
both real-server acceptance gates passed.

`packages/effect/src/persistence/Redis.ts` is already driver-independent. Its
Lua cache and subscription adapter can consume the general client, provided
reply decoding and execution affinity are handled correctly.

Postgres provides useful independent codec, physical connection, and scripted
server test patterns in `packages/sql/pg`. Redis needs its own reply ordering,
push delivery, topology, and persistent connection-state contracts.

## Architecture and contracts

Use a portable Redis engine above an injected scoped connector. Node owns TCP,
TLS, and Unix socket acquisition through `node:net` and `node:tls`. Avoid
importing the existing NodeSocket module directly: its `ws` re-export introduces
an external dependency into the Redis import path.

Public modules live in the separately published `@effect/redis` package under
`packages/redis/src/`: `RedisClient`, `RedisConnection`, `RedisCommand`,
`RedisError`, `RedisProtocol`, `RedisSubscription`, and `RedisTransaction`.
Topology controllers and the transport contract implementation stay internal.
The package has only an Effect peer dependency. No Redis implementation lives
in core `effect`. `packages/platform/node/src/NodeRedis.ts` remains the Node
connector and layer entrypoint, with the existing persistence service adapted
above the general client.

The implemented interfaces cover:

- Binary-safe command arguments accepting strings and `Uint8Array`.
- Lossless RESP2/RESP3 reply representation, including integer precision,
  attributes, push frames, map keys, binary strings, and nested server errors.
- Raw execution returning a defined reply type; typed command descriptors
  provide argument encoding, routing metadata, and checked reply decoding.
- Routing metadata expressed as key indexes in the argument vector. Unknown
  and module commands accept explicit metadata. Keyless commands support
  explicit node selection or broadcast; commands such as `SCAN` are node-local.
- Shared execution, pipelines, dedicated scoped sessions, transactions,
  blocking operations, and subscription modes.
- Connector acquisition, session generation, unsolicited push delivery,
  topology resolution, and advertised-endpoint remapping.
- Standalone, Cluster, and Sentinel configuration. Sentinel discovery and
  Redis data nodes have independently configurable authentication and TLS.
- Error reasons distinguishing unsent work, server rejection, and uncertain
  outcomes after transmission.
- Protocol selection, supported server versions, queue and byte limits,
  subscription overflow behavior, timeouts, and bounded shutdown.

Arbitrary command support does not require reproducing every node-redis
convenience method. Typed helpers should build on the command descriptor API.
Mode-changing commands such as `MONITOR`, `CLIENT REPLY OFF`, `HELLO`, and
subscriptions require explicit handling; ordinary multiplexed execution cannot
assume that every command produces exactly one ordinary reply.

## Required connection and topology behavior

Register pending reply ownership before submission. Interruption before
submission can remove a queued command; after submission its reply must still
be consumed. A Node `write()` result of `false` means accepted bytes under
backpressure, not an unwritten command. Pushes never consume ordinary pending
command entries.

Disconnect fails uncertain in-flight operations. Reconnect serves future work
and never automatically replays uncertain mutations, scripts, or `EXEC`.
Dedicated scoped sessions isolate transactions, `WATCH`, blocking commands,
and persistent connection state. Discard a session whose state is unknown.
Transactions never resume on a replacement connection. Canceling a blocking
operation can destroy its dedicated connection without blocking shared traffic.

Cluster must support discovery, seed failure, hash-slot routing, TLS, IPv6,
endpoint remapping, bounded redirects, and refresh after topology changes.
Use `CLUSTER SHARDS` with an appropriate `CLUSTER SLOTS` fallback for supported
versions. Apply credentials to every discovered node.

Implement Redis CRC16 and exact binary hash-tag rules: use the first opening
brace and first following closing brace only when their contents are nonempty.
An empty first pair means hashing the entire key, without searching later
pairs. Include `foo{}{bar}` and `foo{{bar}}` as fixtures.

Reject known cross-slot operations before submission. Transactions and
scripts/functions use declared key affinity. `MOVED` updates routing; `ASK`
does not permanently change ownership. `ASKING` and its redirected command
must execute together on the same exclusive physical connection. Cluster
pipelines execute each slot's commands sequentially, including redirect
recovery, while different slot groups run concurrently. This preserves
same-slot order at the cost of same-slot pipeline throughput. Results retain
caller order; there is no global execution order across nodes.

Script availability is server-local. Callers handling `NOSCRIPT` must load and
retry on the actual execution node using a reservation. The generic client
does not automatically reload scripts. Functions must exist on their nodes.
Ordinary Pub/Sub and sharded Pub/Sub have different routing: sharded channels
follow slot ownership and must re-register after migration or failover.

Sentinel must discover the named service across multiple seeds, validate the
selected data node's role, recover from stale discovery, retire old sessions,
and initialize replacement connections. Scoped polling (five seconds by
default) and connection failures trigger rediscovery. Role validation
provides no fencing guarantee, and asynchronous replication provides no
lossless-failover guarantee. Ambiguous commands must not be replayed.

Subscriptions complete acquisition only after registration acknowledgements.
Reconnect restores subscriptions, with documented Pub/Sub delivery gaps.
Shutdown prevents new submission, stops retry loops, settles waiters, and
releases connections within a documented bound.

## Parallel implementation waves

Four active agent slots are available, including the coordinator. Keep three
subagents active alongside an integration owner. Assign further bounded work
as agents finish. Every worker owns implementation and focused tests.

| Wave                  | Subagent A                                                        | Subagent B                                             | Subagent C                                               | Coordinator                                                      |
| --------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------- |
| 1 Foundations         | RESP codec and independent protocol tests                         | Node connector and transport tests                     | Scripted server and standalone/Cluster/Sentinel fixtures | Public API, errors, routing metadata, interface freeze           |
| 2 Engine and topology | Physical session: ordering, backpressure, interruption, reconnect | Cluster discovery, hashing, routing, redirects         | Sentinel discovery, role checks, failover                | Command descriptors, scripting, standalone facade                |
| 3 Features            | Reservations, transactions, pipelines, blocking/session modes     | Channel, pattern, sharded Pub/Sub and pushes           | Independent fault and conformance tests                  | NodeRedis layers, persistence adapter, API migration             |
| 4 Acceptance          | Real Cluster resharding/failover tests and fixes                  | Real Sentinel promotion/authentication tests and fixes | Standalone/security/binary/Streams tests and comparisons | Integration review, exports, docs, packaging, dependency removal |

The critical path is contracts, physical session, topology composition, and
real acceptance tests. Cluster and Sentinel workers can build discovery,
routing, and controller tests against frozen session interfaces while the
physical session implementation proceeds.

Give each agent exclusive implementation and test files. A single owner
maintains shared session primitives. The coordinator owns shared interfaces,
manifests, export maps, generated barrels, lockfile, release note, and existing
NodeRedis integration edits. Cross-component changes go through the owning
agent. Freeze editing before checks that can modify multiple files.

## Testing strategy

Redis engine tests and their real/scripted server fixtures live in
`packages/redis/test`. Real-server suites call `RedisClient.make` directly with
an injected Node connector; deterministic topology tests use in-memory
connectors. Test-only aliases allow reuse of the Node connector without a
package dependency cycle. `packages/platform/node/test` owns only Node socket
transport, URL/options mapping, and the existing persistence integration.

| Layer                       | Acceptance coverage                                                                                                                                                                                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Protocol                    | Independent byte goldens for supported RESP2/3 types; every byte split; concatenated frames; binary payloads; null/empty distinctions; integer precision; attributes/pushes; nested errors; malformed and oversized frames; bounded nesting and allocation; returned byte stability |
| Deterministic lifecycle     | Interrupt before/after write; replies stay aligned; push interleaving; write backpressure; capacity limits; stale socket events; disconnect after execution but before reply; no uncertain replay; cleanup during handshake/reconnect/blocking operations                           |
| Generic standalone          | Strings, hashes, lists, sets, sorted sets, Streams, scripting/functions, arbitrary commands, binary results, pipelines, WATCH/MULTI/EXEC, blocking isolation, authentication, database selection, TCP/TLS/Unix sockets                                                              |
| Pub/Sub                     | Channel, pattern, and sharded messages; acknowledgement readiness; unsubscribe; buffering policy; reconnect/resubscribe; shutdown of waiting consumers                                                                                                                              |
| Cluster                     | Three primaries and three replicas; discovery; binary/hash-tag routing; CROSSSLOT; dynamic script/stream keys; MOVED/ASK; real slot migration; promotion; endpoint remapping; transactions; per-node scripts; sharded subscription recovery                                         |
| Sentinel                    | Primary, two replicas, and three Sentinels with quorum two; separate credentials/TLS; unavailable/stale discovery endpoints; verified promotion; old-session retirement; subscription recovery; uncertain in-flight mutations                                                       |
| Compatibility and packaging | Existing persistence suites; intended compiler inference/rejection contracts; migration from client/use; compiled consumer without an installed Redis driver                                                                                                                        |

Use independent protocol fixtures and a small test-side request parser rather
than reusing the production codec as its own oracle. Property tests generate
semantic values, independently encoded frames, and arbitrary chunk partitions.
Specify support for RESP3 streamed forms before claiming complete decoding.

Scripted server tests use barriers and controlled transport events for exact
ordering. Provide an injectable transport seam for backpressure and connection
generation tests. TestClock controls client timeout and retry logic, but does
not advance Redis's clock. Real expiry, migration, and promotion tests use
server state and readiness checks rather than fixed sleeps.

Verify sockets, command fibers, subscription consumers, and retry loops have
terminated before fixture cleanup forcibly destroys resources. Ensure scope
closure finishes even with an indefinitely blocking command.

Pin actual patch versions and image digests for the declared minimum and
selected supported Redis release lines. Run RESP2/RESP3 and required topology
coverage across the applicable matrix. Fixtures need independent networks,
usable advertised addresses, and explicit health/quorum barriers. Setup
failures fail the suite rather than turning it into skipped coverage.

Use `it` for pure tests, `it.effect` for Effect tests, and live tests where real
socket/wall-clock behavior requires them. Follow local `@effect/vitest` assert
and Scope conventions. Add Tstyche coverage only for intended inference,
assignability, rejection, or other compiler contracts.

## Persistence adapter compatibility

The existing persistence adapters are not automatically Cluster-safe.
Arbitrary-key MGET/DEL, multi-key Lua operations without shared hash tags, and
node-local KEYS require an explicit policy. Key-format changes or splitting
atomic scripts require a separate migration design. Until that policy is
implemented and tested, do not advertise those adapters as Cluster-compatible.
This does not relax the generic client's first-release Cluster requirement.

Decode the general client's replies into the existing adapter's expected
strings, numbers, arrays, and nulls. Its current keyless SCRIPT LOAD and routed
EVALSHA sequence needs execution-node affinity if used with Cluster. Test cold
script caches on multiple nodes and after Sentinel promotion.

## Validation and release gates

Vitest excludes integration files unless `EFFECT_INTEGRATION_TESTS=1` and permits
zero-test success. Current CI enables integration tests, but dedicated Redis
gates should set the flag explicitly. `--passWithNoTests=false` does not detect
every missing suite in a partially successful invocation.

Run portable core, standalone, Cluster, and Sentinel suites separately.
Validate machine-readable reports against an expected-file manifest: every
required suite must execute tests, with no infrastructure-derived skips. Keep
Redis topology tests outside Effect's existing `test/cluster-integration`
directory and its separate project gate.

The mandatory runner verifies an explicit suite manifest and rejects skipped,
missing, or empty suites. Run it against each server version:

```sh
REDIS_SERVER_BIN=/path/to/redis-server node scripts/test-redis.mjs
pnpm test-types packages/redis/typetest/RedisClient.tst.ts
pnpm check
pnpm jsdocs --check
pnpm lint
```

Add the remaining feature/security/fault suites to the expected manifest and
focused commands. Run targeted `pnpm test-types <filename>` and documentation
example doctests where their contracts apply. Run required `pnpm lint-fix`
after coordinating file ownership. Register `@effect/redis` in source and
published export maps as a separate package, and generate marked barrels with
`pnpm codegen`.

Build and test an isolated consumer against emitted JavaScript and published
exports on the advertised minimum Node version and current CI Node. The
manifest currently advertises Node 18 while CI uses Node 26; current-runtime
tests alone do not establish minimum-runtime compatibility.

Only after all gates pass, remove the required redis peer and refresh the
lockfile with root pnpm install. Published source and declarations must expose
no node-redis types, and the consumer must import and operate without a Redis
driver installed. Finalize one consolidated changeset describing API and
behavioral migration.

An independent node-redis comparison fixture may remain development-only.
Compare equivalent protocol, credentials, binary decoding, topology, and
workloads using fresh or reset namespaces. It supplements protocol goldens and
fault tests. Performance comparisons should measure repeated equivalent runs
for sequential commands, concurrency, pipelines, large binary replies, and
Pub/Sub, including throughput and latency. Set thresholds from measured
baselines rather than inventing them.

## Implementation checklist

- [x] Freeze API, reply, routing, transport, topology, and failure contracts.
- [x] Declare supported Redis versions, protocol default, and adapter policy.
- [x] Complete foundation implementations and independent fixtures.
- [x] Complete physical session, Cluster, and Sentinel engines.
- [x] Complete stateful operations, Pub/Sub, and general command support.
- [x] Migrate NodeRedis and verify persistence compatibility.
- [x] Pass all required standalone, Cluster, Sentinel, and fault suites.
- [x] Verify compiled consumer imports, minimum runtime, and dependency removal.
- [x] Complete documentation, generated exports, and release note.

## Validation record

The final code review covered protocol/physical sessions, client/topology,
subscriptions/transactions, the Node connector/layer, public API conventions,
package surfaces, CI, and release policy. Review corrections include immediate
cleanup after failed client acquisition, bounded redirect configuration,
binary argument/routing snapshots, client-owned subscription termination,
binary acknowledgement correlation, RESP numeric grammar, transaction control
preflight and attribute decoding, typed timeout/reconnect validation, and a
bounded initial PING with immediate transport cleanup on acquisition failure.

Tests are consolidated by public module: six Redis unit suites and three Redis
integration suites, plus NodeRedis unit and integration suites. Cluster and
Sentinel scenarios live in RedisClient suites; subscription and transaction
scenarios live beside their respective modules. Fixtures are shared helpers,
not standalone suites, and duplicate sharded-subscription coverage was removed.

- The mandatory manifest runner passed all 11 suites and 178 tests, with no
  skips, on both Redis 7.2.6 and 8.10.2 using local server binaries.
- Root type checking, public JSDoc validation, and targeted type tests passed;
  the type tests cover TypeScript 5.9.3 and 6.0.3.
- Root build and affected-package rebuilds passed. Release declaration checks
  exposed file-level `@internal` comments stripping required imports; those
  comments were corrected before the final package build.
- An isolated packed consumer passed on Node 18.20.5 and Node 24.21.0 against
  Redis 7.2.6, covering RESP2/3, binary values, pipelines, transactions, every
  public Redis entrypoint, blocked internal exports, and absence of node-redis.
  Packed declarations passed with `skipLibCheck: false`, including a second
  pass using `stripInternal: true` output.
- Root `pnpm install` removed node-redis and its unused transitive packages.
  Remaining peer warnings concern existing Babel/TypeScript tooling; no Redis
  peer warning or unrelated dependency resolution change was introduced.
- NodeRedis migration and operational defaults are documented in
  `packages/platform/node/REDIS.md`; one consolidated changeset covers both
  published packages.
- The new CI job runs the same mandatory gate using digest-pinned Redis 7.2.6
  and 8.10.2 images. Local actionlint validation passed with existing custom
  runner labels excluded. Docker is unavailable in this environment, so the
  Docker fixture backend and GitHub-hosted execution remain unverified locally.
- No comparative performance benchmark was run; no performance equivalence to
  node-redis is claimed. Cluster pipelines preserve same-slot order by running
  those commands sequentially through redirects.

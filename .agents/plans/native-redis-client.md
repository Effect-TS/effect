# Native Redis client implementation and testing plan

Replace the external Redis driver used by `@effect/platform-node/NodeRedis`
with a general-purpose, dependency-free Effect Redis client. Standalone,
Cluster, and Sentinel support are required in the first release before the
node-redis dependency is removed. Persistence consumers provide compatibility
coverage; they do not define the general client's capabilities.

Status: NodeRedis, BunRedis, and DenoRedis all use the shared native engine.
Frozen runtime HEAD `e0f359e27` establishes parity in all eight reference
workloads under the unchanged 5% overhead margin. A separate matched comparison
supports approximately 5.7% lower sequential elapsed time than `3d1f7569f`.
Actual runtime tests and clean six-package strict/stripped consumer checks
passed. Final-source hosted CI is pending at publication of this checkpoint.
Exact settings, intervals, source hashes, and retained reports are recorded in
`native-redis-throughput.md`. Earlier sections below record historical
checkpoints; the final validation section supersedes their acceptance status.
RESP2 is the default and RESP3 is opt-in.
Persistence supports standalone, Cluster, and Sentinel; Cluster uses
per-identity hash tags for atomic multi-key operations.

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

The transport requires a persistent scoped `run(onBytes)` consumer and writes
accepting UTF-8 strings, byte arrays, or ordered vectors of either. The Node data
handler delivers stable byte ranges synchronously; interruption unregisters its
consumer and callback failure closes the transport. Default byte writes snapshot at admission, while
private immutable frames transfer without another copy. Custom Duplex inputs
are copied before delivery. The public parser continues to copy caller input;
the internal physical-session parser may retain transferred stable ranges.
Binary replies can share bounded storage through disjoint byte ranges without
overlapping sibling values or changing earlier replies during later reads.

Concrete sessions without command deadlines register private synchronous
submission in a WeakMap. Cached standalone typed commands capture and encode
arguments before their caller first yields and decode replies directly into
that caller. Decoder defects do not escape into the shared receive loop.
Configured deadlines, Sentinel, Cluster, and explicit-node routing retain the
normal execution path. These implementation paths introduce no optional public
operations or runtime-specific engine hooks.

Redis protocol and topology logic live in `@effect/redis`. Shared platform
construction and the byte transport live in
`@effect/platform-node-shared/NodeRedis`. NodeRedis, BunRedis, and DenoRedis
provide independent runtime tags for the same general client and persistence
services. Bun and Deno use their Node compatibility socket APIs; both have
migrated off their former Redis clients. The Deno `@db/redis` dependency and
unused transitive packages are removed. All three modules expose native
`Options`, `make`, `layer`, and `layerConfig`; raw `client`/Promise-based
`use` migrate to native Effect operations. Migration details are in
`packages/platform/node/REDIS.md`.

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
pipelines batch commands per destination node without awaiting individual
replies. Node batches and redirect recovery progress independently. Uniform
redirects are retried as ordered batches, with ASKING paired with each command.
Results retain caller order; mixed successful and redirected commands cannot
provide a global execution order across nodes without replaying successes.

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

Cluster persistence uses stable hash tags per cache namespace, queue, and rate
limiter identity. Related keys and queue locks share one slot; unrelated
identities can distribute across nodes. Standalone and Sentinel retain their
existing layouts. Moving existing data to Cluster requires migrating keys to
the tagged layout. Queue lock renewal batches preserve the existing standalone
behavior and group by queue in Cluster.

Persistence Redis services always provide scan, send, subscribe, and eval, with
explicit boolean Cluster state. Redis.make requires scanning and Lua hashing
implementations. Node, Deno, and Bun adapters supply these operations explicitly;
the native Cluster layer scans all primary nodes. Reply decoding is validated
and errors remain in the persistence error channel. Only configuration and
event-dependent data fields remain optional.

Decode the general client's replies into the existing adapter's expected
strings, numbers, arrays, and nulls. Cluster computes Lua SHA1 digests locally;
EVALSHA cache misses use EVAL on the execution node. Only actual NOSCRIPT
responses trigger fallback, not Lua errors containing the word. Test cold
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
- [ ] Establish parity for all eight workloads on the final performance source.

## Validation record

The latest validated runtime is local commit
`784071a66c11f0daaef1a5e4c6c6a6af2e7db71d` (Streamline Redis integer parsing
and reply completion). Review covered protocol and physical sessions,
client/topology, subscriptions/transactions, the Node connector and persistence
layer, public API contracts, package surfaces, and release policy. Follow-up
corrections preserve bounded acquisition and shutdown, binary argument/routing
snapshots, reply ownership after cancellation, no uncertain replay, atomic batch
admission, independent per-node progress, and exclusive transaction sessions.

Tests are consolidated by public module: six native Redis unit suites and three
native integration suites, plus NodeRedis unit and integration suites. Cluster
and Sentinel cases live in RedisClient suites; subscription and transaction
cases live beside their modules. Shared fixtures are helpers, not separate suites.

### Current local correctness and packaging evidence

- Both mandatory Redis manifests passed all 11 suites and 276 tests without
  skips on Redis 7.2.6 and 8.10.2 using local server binaries. Coverage includes
  standalone, Cluster, Sentinel, persistence compatibility, ownership,
  backpressure, cancellation, and vectored writes.
- Root lint-fix, type checking, public JSDoc checks, and focused runtime/public
  type tests passed, including 135 focused runtime tests. Public type coverage
  ran on TypeScript 5.9.3 and 6.0.3.
  The existing core persistence Redis suite passed its nine tests.
- Exact Bun 1.4.0 passed all nine native Redis suites and 153 tests without skips,
  including all three real-server integration suites against Redis 7.2.6.
  A prior optional additional Node transport suite run under Bun passed 25 of 27
  tests. Two TLS tests failed with `SSLV3_ALERT_HANDSHAKE_FAILURE`; a direct
  `node:tls` echo probe using the same Ed25519 certificate/key reproduced the
  failure on Bun 1.4.0 without Redis and succeeded on Node 24.21.0. Native-suite
  and TCP smoke success do not establish complete Bun TLS coverage.
- Fresh builds and tarballs of `effect`, `@effect/redis`,
  `@effect/platform-node-shared`, and `@effect/platform-node` passed isolated
  strict NodeNext consumption with `skipLibCheck: false`. All eight public
  Redis entrypoints and 17 declarations passed, including a separate pass with
  emitted `stripInternal: true` declarations. Internal exports remain blocked.
- Compiled TCP smoke tests passed Node 18.20.5, Node 24.21.0, Bun 1.4.0, and
  Deno 2.9.4 against Redis 8.10.2 with RESP2 and RESP3. They verify shared and
  distinct 4 KiB payloads, mixed vector pipelines, repeated Effects after source
  mutation, one logical corked batch and observed multi-chunk `_writev`
  batching. Existing small single-write pipelines, reserved sessions,
  transactions, Pub/Sub, persistence SCAN, Lua caching, and NOSCRIPT recovery
  also passed. Artifacts: `/tmp/effect-redis-integer-packed-wz510k/report.json`.
- The package audit confirms that `@effect/redis` has only an Effect peer
  dependency, no runtime dependencies, and no external Redis client in the
  isolated installation. Root dependency removal eliminated node-redis and its
  unused transitive packages without unrelated dependency resolution changes.
  NodeRedis migration/defaults are documented in `packages/platform/node/REDIS.md`.
  One consolidated changeset covers `@effect/redis`, `@effect/platform-node`,
  `effect`, `@effect/platform-bun`, and `@effect/platform-deno`.

The validated transport accepts strings, bytes, and ordered vectors with exact
UTF-8 byte accounting. Ordinary input copies at admission; private immutable
frames transfer without recopying. Large binary inputs share a private slab only
for exact input-object identities within one invocation. Distinct views and
subsequent Effect executions receive independent current snapshots. Bounded
text-frame caching compares argument values on each invocation. Node vectors
submit every accepted part before waiting for drain, preserving FIFO and never
replaying an accepted prefix. Structural tests withhold responses until complete
node batches, ASKING/command pairs, and MULTI/EXEC batches arrive.

### Historical hosted CI and publication status

Hosted [run 36783609269](https://github.com/Effect-TS/effect/actions/runs/36783609269)
passed all ten jobs at `9f03aae4df4e178cd3582e83e0fd8a3b19f8c1a4`, including
Node, Bun, Deno, Redis 7/8, types, documentation, lint, build, and bundle checks.
That run does not cover the later performance commits through `784071a66`.
They have the local validation recorded above. Final-source hosted CI is pending
at publication of this checkpoint; its current status is available on
[draft PR 8638](https://github.com/Effect-TS/effect/pull/8638/checks).

The Redis CI job uses the same mandatory manifest runner and digest-pinned
Redis 7.2.6 and 8.10.2 images. Local actionlint validation passed with existing
custom runner labels excluded. Docker is unavailable locally; server binaries
provided the local matrix, while the older hosted run exercised Docker fixtures.
Keep the PR draft until the performance target and final-source gates pass.

### Historical performance acceptance checkpoint

The final full reference comparison completed on frozen `784071a66` against
isolated `redis@5.0.1`: eight workloads, 19 paired fresh-process rounds,
3,000 ms target, 500 ms warmup, and the existing 5% overhead acceptance margin.
All correctness checks passed and source remained stable. Seven workloads
establish parity; sequential requests remain inconclusive (native/reference
ratio 1.050066, 95% interval 0.995848–1.071013). `--require-parity` exited 1.
Correctness and package gates are complete; overall performance acceptance is
incomplete. Final-source hosted CI is pending at this checkpoint. The complete report is
`tmp/runtimeperf/results/redis-parity-784071a66.json`.

Matched sequential comparisons support the retained combined changes:
`a63ab5ff9` to `2e3e4726c` had head/base ratio 0.939367 (95% interval
0.916050–0.966462), and `2e3e4726c` to `784071a66` had ratio 0.933629
(0.909175–0.967907). Both used 13 pairs, 1,500 ms targets, 500 ms warmups,
identical workers, alternating order, and stable isolated source. They measure
combined changes without attributing gains to individual optimizations or
establishing reference parity.

The preceding full reference run at `2e3e4726c` established parity in seven
workloads, with sequential requests regressing (1.091, 1.070–1.127). The later
sequential-only `784071a66` screen was inconclusive (1.035, 1.002–1.082).
The writer-yield candidate `4999664fd` was removed at `7b289e71b` after both its
reference screen and matched comparison were inconclusive; its fairness test
remains. Exact settings, source hashes, all intervals, and retained report paths
are consolidated in `native-redis-throughput.md`.

The retained implementation uses bounded text-frame/metadata caches, immutable
binary snapshots and vectors, exclusive transaction leases, complete safe-integer
parsing with exact int64 fallback, and private completion values. Public reply,
callback, decoding, pipeline, deadline, package, and transport contracts remain
unchanged by the latest parser/completion optimizations. The encoder and metadata
caches each retain one entry independently, so intervening batches can retain
two distinct text frames, each bounded to 4,096 wire bytes.

Keep the PR draft until final performance acceptance passes and obtain successful
final-source hosted CI before release. Any further runtime change requires
focused correctness, both mandatory Redis manifests, fresh packed consumers,
and stable measurements before updating acceptance claims.

## Bun and Deno migration validation checkpoint

All three runtime modules now expose `Options`, `make`, `layer`, and
`layerConfig` through `@effect/platform-node-shared/NodeRedis`. Each runtime
retains its own service identity and provides the same client under the generic
Redis tag, together with the persistence service. The external Deno driver and
its unused dependencies are removed. The one consolidated changeset includes
all six affected packages and documents the raw-client/options/error migration.

Validation on the migrated source:

- Redis 7.2.6 and 8.10.2: both mandatory 11-file manifests passed 276 tests
  without skips. Logs are `/tmp/native-redis-runtime-migration-redis7.log` and
  `/tmp/native-redis-runtime-migration-redis8.log`.
- Bun 1.4.0: both module-named files passed all 10 tests without skips,
  including configured service identity, scoped cleanup, interrupted/failed
  acquisition, binary RESP2/3, transactions, Pub/Sub, Lua/SCAN, Cluster,
  Sentinel, Unix sockets, and trusted/untrusted/wrong-host RSA TLS.
  Report: `/tmp/native-redis-bun-migration-verified.json`.
- Deno 2.9.4: the existing module-named integration file passed all 28 tests
  without skips, including persistence compatibility, native commands,
  topology bindings, Unix sockets, and Ed25519 TLS trust/hostname validation.
  Explicit source/test `deno check --no-lock --node-modules-dir=manual`
  passed. Report: `/tmp/native-redis-deno-binding-report.json`.
- Root `pnpm lint-fix`, `pnpm check`, and `pnpm jsdocs --check` passed.
  A full local `deno check .` encountered generated package AI docs from
  local builds; explicit affected source/test checking passed instead. Fresh
  hosted CI remains required. Deno's automatic root workspace edit was removed.
- Six fresh builds/tarballs passed all 12 public Redis entrypoints with
  `skipLibCheck: false`, including stripped declarations from Redis, shared,
  Node, Bun, and Deno packages. The isolated install has no external Redis
  driver. Compiled NodeRedis passed Node 18.20.5/24.21.0, BunRedis passed Bun
  1.4.0, and DenoRedis passed Deno 2.9.4 with RESP2/3, distinct tags, shared
  client identity, layer/config constructors, vectors/mutation safety, batching,
  transactions, Pub/Sub, persistence SCAN, and Lua/NOSCRIPT recovery.
  All six generated output directories were cleaned before a forced build.
  Tarball JS/declaration paths match current source exactly, with no stale
  core Redis modules or former Node transport. This supersedes the earlier
  local tarballs.
  Artifact: `/tmp/effect-redis-clean-runtimes-packed-edPdvQ/report.json`.

Bun's known Ed25519 TLS fixture failure remains separate from the passing RSA
TLS coverage. Benchmark results above describe the prior recorded baseline;
this migration does not establish a new full performance acceptance result.

## Final performance improvement and validation, October 1, 2026

Frozen runtime HEAD `e0f359e27f23c6786f12127019ae93014cfbb47f` passes all
eight reference workloads with the unchanged 5% margin; `--require-parity`
exited 0. The final run uses 29 alternating fresh-process pairs, 3,000 ms
targets, 500 ms warmups, and the existing deterministic 95% paired bootstrap.
Sequential native/reference elapsed ratio is 0.982232 (0.946523–0.996101).
Binary SET ratio is 1.030023 (1.007511–1.044111), within the margin.
The measured environment is Node 24.21.0, Redis 7.2.6, Linux 6.18.54,
Xeon Platinum 8272CL, loopback TCP, and RESP2. Other runtime/protocol/network
performance remains unmeasured.

The matched committed-source comparison from `3d1f7569f` to `e0f359e27`
supports approximately 5.7% lower sequential elapsed time: ratio 0.942555,
95% interval 0.895564–0.967508. This measures the combined changes, not
individual optimizations. Singleton pending, outgoing, and inflight storage
avoid collection churn; bounded command classification caching compares current
values; idle string writes avoid asynchronous registration. Accepted writes
reserve ownership before callback registration, retaining FIFO, interruption,
backpressure, and uncertain-outcome behavior. Batch admission retains direct
Set/array loops and microtask coalescing. New regression coverage lives in the
normal RedisClient and NodeRedis test files. Independent review found no
concrete remaining defects.

Final-source validation:

- `pnpm lint-fix`, `pnpm check`, focused 116 tests, and `git diff --check`
  passed. Logs: `/tmp/native-redis-sequential-lint.log`,
  `/tmp/native-redis-sequential-check.log`, and
  `/tmp/native-redis-sequential-candidates-tests.log`.
- Redis 7.2.6 and 8.10.2 each passed the mandatory 11-file manifest with
  281 executed tests and no skips. Logs:
  `/tmp/native-redis-e0f359e27-redis7.log` and
  `/tmp/native-redis-e0f359e27-redis8.log`.
- Actual Bun 1.4.0 passed 96 tests across both BunRedis files and the
  RedisClient/RedisConnection files, including the runtime's RSA TLS coverage;
  no failures or skips. Report: `/tmp/native-redis-bun-e0f359e27.json`.
- Actual Deno 2.9.4 passed all 28 integration tests without skips and explicit
  affected source/test `deno check`. Logs:
  `/tmp/effect-redis-parity-e0f359e27-deno-check.log` and
  `/tmp/effect-redis-parity-e0f359e27-deno-test.log`; manifest:
  `/tmp/effect-redis-parity-e0f359e27-deno-report.json`.
- All six package output directories were cleaned and rebuilt before fresh
  packing. Exact source-to-tarball JS/declaration audits found no missing or
  stale modules. All 12 public entrypoints and 107 stripped declarations
  passed strict checks. Isolated compiled smokes passed on Node 18.20.5 and
  24.21.0, Bun 1.4.0, and Deno 2.9.4, covering RESP2/3, binary vectors,
  mutation safety, batching, transactions, Pub/Sub, tags/layers/configuration,
  persistence SCAN, and Lua/NOSCRIPT recovery. No external Redis driver was
  installed; internal exports stayed blocked; 609 source/manifest hashes
  remained stable. Report:
  `/tmp/effect-redis-e0f359-clean-packed-3SDCYL/report.json`.

The complete final reference and matched reports, settings, fingerprints,
and earlier inconclusive measurements are recorded in
`native-redis-throughput.md`. Runtime source SHA-256 is
`f7ddb6f6b9d4490d54c26e9723bb23cb773296423743c27a74998a6cd5653d57`.
Benchmarks ran without concurrent local builds or tests; all fixtures and
temporary worktrees were cleaned up before final validation.

Hosted CI passed all ten jobs on the preceding migration commit `3d1f7569f`
([run 36827400062](https://github.com/Effect-TS/effect/actions/runs/36827400062)).
Final-source hosted CI is pending at publication; its result will be recorded
in [draft PR 8638](https://github.com/Effect-TS/effect/pull/8638).
Keep the PR draft as requested. Runtime changes require renewed evidence;
documentation-only finalization leaves the frozen runtime unchanged.

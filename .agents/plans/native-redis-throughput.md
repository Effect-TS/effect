# Native Redis throughput investigation

Measured on September 30, 2026, after replacing sequential Cluster pipeline
submission with batches, batching transactions, separating connection
acquisition by endpoint, coalescing physical writes, and reducing codec and
Effect allocations. Native results represent the working tree on
`feat/native-redis-client` for draft PR #8638, including the follow-up changes.

## Method

- Node.js 24.21.0, Intel Xeon Platinum 8272CL at 2.60 GHz, Redis 7.2.6 over
  loopback TCP. RESP2, no TLS or authentication for both implementations.
- Reference: `redis@5.0.1` installed in an isolated `/tmp` directory. This
  comparison adds no workspace or runtime dependency.
- Fresh standalone and six-node Cluster fixtures (three primaries and three
  replicas), with setup and connection acquisition outside measured callbacks.
- INCR commands with matching key lengths and equivalent slot placement.
  Pipeline batches contain 128 commands; each measured round executes 40 batches
  (5,120 commands). Multiple-slot batches distribute keys across the Cluster.
- One complete warmup round followed by five measured paired rounds, alternating
  which implementation runs first. The table reports commands per second using
  median elapsed time. Sequential rounds contain 1,000 commands; transaction
  rounds contain 24 transactions of 128 commands (3,072 commands).
- Native uses `RedisClient.pipeline`; the reference issues concurrent `incr`
  calls with `Promise.all`, allowing node-redis automatic pipelining. The raw
  connection case uses one pre-acquired native reservation. The transaction case
  compares `RedisTransaction.execute` with node-redis `multi().exec()`.
- Every result is checked, and final server counters are verified against exact
  expected totals after all rounds. Connections and fixtures close on completion.

## Final exploratory results

| Workload                         | Native commands/s | node-redis commands/s | Native/reference elapsed time |
| -------------------------------- | ----------------: | --------------------: | ----------------------------: |
| Standalone pipeline              |           158,537 |               250,056 |                         1.58x |
| Standalone raw reserved pipeline |           210,069 |               270,144 |                         1.29x |
| Cluster pipeline, same slot      |           136,878 |               207,151 |                         1.51x |
| Cluster pipeline, multiple slots |           153,899 |               199,723 |                         1.30x |
| Standalone sequential commands   |            11,031 |                17,487 |                         1.59x |
| Standalone transactions          |            97,210 |               273,522 |                         2.81x |

The native client now submits each node's commands before waiting for replies,
including same-slot batches. Scripted tests withhold replies until the entire
batch arrives, proving that batching does not rely on favorable loopback timing.
MULTI, queued commands, and EXEC are also submitted in one flight.

## Interpretation and remaining work

These measurements do **not** establish throughput parity with node-redis. The
native implementation remains slower in this sample, despite eliminating the
deliberate extra round trips. Remaining differences include Effect execution,
checked results, lossless bigint integer replies, routing, and byte ownership.
The measurements do not attribute the remaining gap to any single factor.

The transaction comparison includes a significant API difference: the native
helper opens a fresh dedicated connection for each transaction, while the
reference queues transactions on an existing connection. The raw reserved
pipeline case separates some connection and client routing costs; it does not
measure a reusable transaction helper.

Results are exploratory: one host, one server version, small INCR replies,
loopback latency, five rounds, and possible concurrent compilation or formatting
activity. No statistical parity or regression classification was performed.
These numbers do not cover TLS, large binary values, RESP3, remote latency,
redirect-heavy migration, Sentinel failover, or replica reads. A dedicated paired
performance harness across those workloads remains necessary before promising
performance equivalence.

The temporary probe was run with plain `node` from `scratchpad` and removed.
The script, raw timings, and an earlier CPU profile are retained locally under
`/tmp/effect-redis-throughput.eciYQR`; the final measurements are in
`results-final-ascii-sync.log`. The reference installation is isolated there.

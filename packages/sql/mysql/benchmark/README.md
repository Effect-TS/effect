# MySQL benchmarks

## MysqlClient

`MysqlClient.ts` measures complete queries through the client, including Effect execution, pool checkout, the MySQL
wire protocol, and result decoding, and runs the same workloads through `@effect/sql-mysql2` for comparison. It covers
a parameterized one-row query, a 100-row result, a single-statement transaction, and 20 concurrent queries through a
ten-connection pool. The transaction is there because `BEGIN`, `COMMIT`, and the savepoint statements reach the
connection through a different path from the statements between them, so a change to that path is invisible to every
other workload here.

A MySQL Testcontainer starts automatically, so a container runtime is the only external requirement.

Run it from the repository root:

```sh
pnpm --filter @effect/sql-mysql benchmark:client
```

To use an existing MySQL server instead, set `MYSQLCLIENT_BENCHMARK_URL` to its connection URI. Keep the same server,
Node version, and machine load when comparing revisions.

Two numbers from different machines are not comparable, and on anything but Linux the container is usually the reason:
the server runs inside a virtual machine on macOS and Windows, so every round trip crosses a virtualised network, and
the workloads that wait on one — the single-row query and the transaction — measure that boundary as much as they
measure the client.

## Where the time goes

Measured on macOS against the container, so treat the absolute numbers as
machine-local. Against `@effect/sql-mysql2`, this client is ahead on the
single-row query (1.06x), the transaction (1.04x) and 20 concurrent queries
(1.04x), and behind on the 100-row read (0.85x).

The 100-row gap is the only one worth explaining, and it is not decode.
`MysqlCodec.ts` puts decoding a 100-row result at about 21us against a whole
query of about 195us — roughly a ninth of it — and a CPU profile of the same
workload is 86% idle, with this package accounting for under a seventh of the
active time. The client is waiting, not computing.

What is left is per-row rather than per-query: the single-row query costs
about 131us and the 100-row query about 195us, so the marginal row costs this
client roughly 0.65us against `mysql2`'s 0.27us. A result set of 100 rows is
100 packets, and each one is handed from the parser to the reply reader
through a queue, so the most likely candidate is that handoff rather than any
single expensive step. That is a hypothesis with a number attached, not a
finding: it has not been isolated, and a previous attempt to attribute the gap
to per-row Effect steps was measured and disproved.

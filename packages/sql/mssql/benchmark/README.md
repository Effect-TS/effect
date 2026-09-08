# Native TDS verification and benchmarks

Run from the repository root after `pnpm install`. The benchmark-only tedious
dependency does not appear in the runtime dependency graph.

## Live SQL Server

Use a dedicated SQL Server 2022 Docker container. On ARM hosts the official image
runs under amd64 emulation. This example exposes SQL Server only on localhost and
accepts Microsoft's container EULA. The password below is for disposable local
tests, not deployments.

```sh
docker run --detach --name effect-native-mssql-test --platform linux/amd64 \
  -e ACCEPT_EULA=Y -e 'MSSQL_SA_PASSWORD=Effect_Tds_Test_7426!' \
  -p 127.0.0.1:14339:1433 mcr.microsoft.com/mssql/server:2022-latest
docker logs effect-native-mssql-test
```

After the server reports that it is ready for client connections:

```sh
EFFECT_INTEGRATION_TESTS=1 MSSQL_PORT=14339 pnpm test --run packages/sql/mssql/test
node packages/sql/mssql/benchmark/TdsClient.ts
node packages/sql/mssql/benchmark/TdsCodec.ts
FRAGMENT_BYTES=4096 node packages/sql/mssql/benchmark/TdsCodec.ts
```

`MSSQL_HOST`, `MSSQL_PORT`, and `MSSQL_PASSWORD` override the local connection.
Live benchmarks use SQL authentication as `sa` with TLS and explicitly trust the
disposable container's certificate. Tests create and remove their own objects;
do not point them at a production database.

## Method

`TdsClient.ts` compares a native session and tedious 20.0.0 in the same process.
Both use Effect callbacks, TLS, identical session settings and row-object
conversion. Results and session defaults must match before timing. Each workload
warms both drivers for 300 ms, then measures five alternating pairs of 750 ms.
`BENCH_ROUNDS` and `BENCH_DURATION_MS` control those values. Transactions count
one begin/insert/rollback cycle as an operation; the native driver uses SQL
batches for transaction control and tedious uses its transaction API.

`TdsCodec.ts` reuses the DONEPROC payload/workload from
`tedious/benchmarks/token-parser/done-token.js`, with identical chunks and a
callback per token. It verifies token counts and alternates seven pairs after
warmup. `TOKEN_COUNT`, `REPEATS`, `BENCH_ROUNDS`, and `FRAGMENT_BYTES` control it.
This is a narrow parser microbenchmark, not a complete codec performance claim.

## Local results, 2026-09-08

Node 24.20.0, SQL Server 2022 CU26 (16.0.4265.3), Linux amd64 container under
Docker on an ARM Mac. This was not an isolated performance host. Raw samples
are in [results.jsonl](./results.jsonl); differences are median paired throughput
changes, not the ratio of independent medians.

| Workload                  | Native operations/s | Tedious operations/s | Paired change |
| ------------------------- | ------------------: | -------------------: | ------------: |
| Parameterized SELECT      |               2,265 |                2,044 |        +10.8% |
| 100 rows × 3 columns      |               1,186 |                1,062 |         +9.3% |
| 100 rows × 20 columns     |               1,057 |                  966 |        +11.6% |
| Large Unicode result      |                 856 |                  919 |         −0.7% |
| Begin / insert / rollback |                 351 |                  319 |        +11.0% |
| DONEPROC tokens           |           9,037,162 |            4,951,068 |        +83.5% |

Samples contain substantial outliers. A codec run briefly overlapped the tail
of the live run, and unrelated host activity was not controlled. Treat these
numbers as directional evidence and rerun longer, isolated trials before making
release claims. No latency percentiles, memory/GC measurements, remote-server
results, or concurrent pool load are established by this harness.

## Coverage and remaining validation

Tests cover packet/token fragmentation and bounds, NTLMv2 published vectors and
a simulated exchange, SSRP discovery, routing, retries, cancellation races and
timeouts. Live SQL tests cover TLS, SQL authentication, scalar/LOB/TVP codecs,
procedures, output parameters, errors, transactions and public adapter behavior.
Existing persistence/cache/queue integration tests also run against the container.

Windows-domain NTLM interoperability and Extended Protection, Azure/Entra
authentication, and other SQL Server versions remain outside verified coverage.

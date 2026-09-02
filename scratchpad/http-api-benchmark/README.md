# Effect HttpServer vs Hono filesystem benchmark

This exploratory benchmark compares Effect's plain `HttpRouter` server and Hono while serving the same small document
API on Node.js.
It deliberately avoids no-op or tiny synchronous handlers.

Each measured request does all of the following:

- routes and validates a document id
- parses or serializes JSON
- reads or writes a 16 KiB document with asynchronous `node:fs/promises`
- transfers the complete response body over a keep-alive HTTP/1.1 connection

The default workload is 80% `GET /documents/:id` and 20% `PUT /documents/:id` at 32 concurrent connections.
Reads and writes use disjoint pre-seeded files so concurrent writes cannot make reads observe partially replaced content.

## Run

From the repository root:

```sh
node scratchpad/http-api-benchmark/run.ts
```

A quicker smoke run:

```sh
node scratchpad/http-api-benchmark/run.ts --rounds=1 --warmup=0.5 --duration=1
```

Record raw data for later comparison:

```sh
node scratchpad/http-api-benchmark/run.ts --json=scratchpad/http-api-benchmark/results.json
```

Run `node scratchpad/http-api-benchmark/run.ts --help` for all tuning options. Use `--read-percent=100` or
`--read-percent=0` to isolate reads or writes. `BENCH_TMPDIR` can place the corpus on a specific filesystem.

## Fairness controls

- Both implementations use the same functions in `shared.ts`, including identical `readFile` and `writeFile` calls.
- Both implementations use the same manually written id and payload validation predicates.
- Both run in fresh child processes on Node's HTTP server stack and receive the same request bodies and concurrency.
- Both enforce the same id, JSON object, non-empty content, and 64 KiB maximum-length rules.
- Correctness probes verify reads, writes, persistence, invalid ids, and invalid payloads before each timed run.
- Timed requests check status and response size, and the correctness probes run again after each measured interval. Any
  invalid measured response aborts the comparison instead of contributing to the reported throughput.
- Corpus creation, server startup, correctness checks, and warmup are outside the measured interval.
- Each framework gets a fresh temporary corpus. The runner removes the corpus and closes the server after every run.
- Paired rounds alternate Effect-first and Hono-first order to reduce systematic thermal and ordering bias.
- Effect tracing and request logging are disabled; the Hono server has no telemetry configured.
- The client consumes every response. Server CPU and event-loop utilization are measured in the child, independently
  from the load-generator process.

## Interpretation

The benchmark measures an in-process development-style JSON API whose useful work is asynchronous filesystem I/O. It
includes each framework's normal routing and request/response behavior. Both implementations parse JSON, apply the same
explicit validation checks, and serialize plain response objects without schema decoding or encoding.

`writeFile` completion does not imply durable media persistence because the benchmark does not call `fsync`. Reads are
also likely to hit the operating-system page cache after warmup. This is intentional: the workload exercises realistic
asynchronous boundaries without turning the comparison into a storage-device benchmark.

Results remain sensitive to Node version, CPU scaling, filesystem, background activity, payload size, read/write mix,
and concurrency. Use the same machine and settings, run all paired rounds, inspect variability, and do not use a single
run as evidence of a general performance claim. For lower-noise publication-quality measurements, pin processes to
dedicated cores where the operating system permits it and generate load from a separate machine.

The built-in generator is closed-loop: each connection sends its next request only after receiving the previous
response. Its latency percentiles therefore describe response time at fixed concurrency and do not correct for
coordinated omission. Use an open-loop external load generator as an additional test when evaluating latency under a
fixed arrival rate.

# hostperf

Runs a small set of Effect runtime benchmarks in Node.js, Bun, Chromium and
WebKit, writes a JSON report and optionally compares it with an earlier report.
A full run takes under a minute; a filtered run on one host takes a few seconds.

## Cases

| Case                                        | One operation                                                  |
| ------------------------------------------- | -------------------------------------------------------------- |
| `Effect/yield`                              | `Effect.yieldNow`                                              |
| `Effect/forkJoin`                           | fork a child fiber and join it                                 |
| `Queue/queueTake`                           | offer and take one item through a bounded queue of 16          |
| `Pool/get and release (fixed pool)`         | `Effect.scoped(Pool.get(pool))` on an idle pool of 4           |
| `Pool/poolUseContended`                     | `Pool.use` from one of 8 fibers sharing a pool of 4            |
| `HashMap/set n fresh string keys + get all` | set one new string key, then read it back                      |
| `Schema/decode struct (valid)`              | `Schema.decodeUnknownSync` of a nested struct                  |
| `app/app-untraced`                          | one request through two services, a layer and a caught failure |

Cases are defined in `cases.ts`. Each one validates its result before and
after timing.

## Usage

```sh
pnpm hostperf                         # all cases, all hosts
pnpm hostperf Pool Effect/yield       # cases whose name contains a filter
pnpm hostperf --host node,chromium    # a subset of hosts
pnpm hostperf --rounds 1              # quicker, less reliable comparisons
pnpm hostperf --list                  # case names
```

To check a change, record a baseline before it and compare after it:

```sh
git switch main
pnpm hostperf --out tmp/hostperf/main.json
git switch my-branch
pnpm hostperf --baseline tmp/hostperf/main.json
```

The comparison prints `median(baseline) / median(current)` per host and case,
so values above 1 mean the current tree is faster. The 95% interval comes from
a bootstrap that resamples rounds and then the samples inside them, so noise
between processes counts as well as noise between samples. A case is marked
`faster` or `slower` only when the whole interval is more than 5% away from 1.
Reports are only comparable when they come from the same machine and settings.

Browsers come from Playwright. Install them once with
`pnpm exec playwright install chromium-headless-shell webkit`. Bun must be on
`PATH`; the Nix dev shell provides it.

## Measurement

`cases.ts`, `harness.ts` and `entry.ts` are bundled once with Vite into
`tmp/hostperf/bundle/hostperf.js`, so every host runs the same code. Each case
then runs in a fresh process (Node.js, Bun) or a fresh browser context, so JIT
state from one case does not leak into the next. Every round runs every case
once, in that fresh setting.

For each case and round the harness:

1. runs and validates the case once, then keeps running it until the warmup
   time has passed;
2. picks a batch size so one batch takes at least `--sample-ms`;
3. times `--samples` batches, stopping early once the round has used
   `--max-case-ms` and has at least 3 samples;
4. validates the last result.

Pages are served from an intercepted `http://localhost` origin with
cross-origin isolation headers, which gives browsers their finest
`performance.now()` resolution. The report records the resolution each host
actually had.

| Option          | Default | Meaning                              |
| --------------- | ------- | ------------------------------------ |
| `--rounds`      | 3       | fresh processes or pages per case    |
| `--samples`     | 10      | timed batches per case and round     |
| `--sample-ms`   | 10      | target duration of one batch         |
| `--warmup-ms`   | 100     | warmup per case and round            |
| `--max-case-ms` | 1000    | time after which a round stops early |

## Report

Reports are written to `tmp/hostperf/results/<timestamp>.json` unless `--out`
is given:

```json
{
  "schemaVersion": 1,
  "createdAt": "2026-11-27T20:30:00.000Z",
  "git": { "sha": "8245e5a2...", "dirty": true },
  "settings": { "samples": 10, "sampleMs": 10, "warmupMs": 100, "maxCaseMs": 1000, "minSamples": 3, "rounds": 3 },
  "durationMs": 33800,
  "hosts": [
    {
      "host": "node",
      "runtime": "Node.js v26.13.0",
      "timerResolutionMs": 0.0002,
      "durationMs": 9400,
      "cases": [
        {
          "name": "Effect/yield",
          "operations": 100,
          "medianNs": 1331.2,
          "minNs": 1302.5,
          "maxNs": 1398.0,
          "rounds": [
            { "batchSize": 77, "samples": [1331.2, 1329.9], "durationMs": 312 }
          ]
        }
      ],
      "errors": []
    }
  ]
}
```

`samples` are nanoseconds per operation, and the case medians cover the samples
of every round. A host that fails to start, or a case that throws, is listed in
`errors` and makes the command exit with code 1. The other hosts still run.

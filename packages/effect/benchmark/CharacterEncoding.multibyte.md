# Retained multibyte optimization

Only experiment 2 is enabled. Buffer UTF-16LE and direct CP1251-to-UTF8 experiments
have been removed. No runtime detection, new dependencies, or public API changes.

Simple table-only codecs use a dedicated encoder loop. GB18030 ranges and
multi-character sequences retain their existing encoder paths. Encoder and decoder
capacities are derived once from mappings, including encode-only additions and
decode-only entries/subtrees. Decoder capacity is at least one UTF-16 unit per
input byte for malformed input; GB18030 encoding reserves four bytes per code unit.

## Fresh measurements

Baseline `4ad6253ca`, macOS ARM64; Node 24.20.0, Bun 1.4.0, Deno 2.9.6.
Same-process baseline/candidate comparison, five alternating 150 ms rounds after
250 ms warmups. Approximately 64 KiB UTF-8-equivalent text; 4,093-byte stream
chunks. Runtime processes run sequentially. Outputs are checked before timing.
Rates are median MiB/s; percentages are medians of paired changes. These are
microbenchmarks, not application-wide gains; small changes may be noise.

| Workload           |               Node |                 Bun |                Deno |
| ------------------ | -----------------: | ------------------: | ------------------: |
| cp932/encode       | 419 → 590 (+42.4%) | 768 → 1112 (+45.3%) | 771 → 1125 (+46.8%) |
| cp932/decode       |  203 → 207 (+1.7%) |  332 → 407 (+20.8%) |   280 → 277 (-0.4%) |
| cp932-ascii/encode | 169 → 255 (+52.5%) |  305 → 471 (+54.4%) |  269 → 391 (+45.3%) |
| cp932-ascii/decode |  132 → 134 (+1.4%) |  267 → 310 (+16.7%) |   182 → 186 (+1.1%) |
| gb18030/encode     |  269 → 280 (+3.7%) |   420 → 438 (+3.5%) |   322 → 322 (+0.6%) |
| gb18030/decode     |  185 → 182 (-1.5%) |  286 → 328 (+14.6%) |   228 → 231 (+1.5%) |
| big5hkscs/encode   |  339 → 345 (+1.1%) |   490 → 513 (+3.2%) |   419 → 432 (+2.6%) |
| big5hkscs/decode   |  198 → 198 (+0.4%) |  326 → 385 (+18.1%) |   269 → 268 (-0.3%) |
| cp932->utf8/stream |  129 → 135 (+3.2%) |  254 → 294 (+16.2%) |   160 → 162 (+1.1%) |

Raw samples: [Node](./CharacterEncoding.multibyte-node.jsonl),
[Bun](./CharacterEncoding.multibyte-bun.jsonl), [Deno](./CharacterEncoding.multibyte-deno.jsonl).
The main reproducible gain is the simple encoder; decoder/streaming gains vary.

## Validation

- 114 targeted tests pass with Vitest launched on Node, Bun, and Deno.
- 542,336 differential checks pass against the baseline on Node.
- Added tests cover allocation sizes, encode-only additions, astral mappings,
  split/unpaired surrogates, strict failures, skipped decoder subtrees, and sequences.
- `pnpm lint-fix`, `pnpm --filter effect check`, and `git diff --check` pass.
- Full `pnpm check` is blocked by the existing unused `metadata` parameter in
  `packages/effect/typetest/Schedule.tst.ts:80`.

## Reproduction

Extract the baseline into a new temporary directory, then run from the repository root:

```sh
encoding_baseline=$(mktemp -d)
git archive 4ad6253ca packages/effect/src | tar -x -C "$encoding_baseline"
ENCODING_BASELINE="$encoding_baseline" BENCH_FILTER='cp932|gb18030|big5' node packages/effect/benchmark/CharacterEncoding.multibyte.ts
ENCODING_BASELINE="$encoding_baseline" BENCH_FILTER='cp932|gb18030|big5' bun packages/effect/benchmark/CharacterEncoding.multibyte.ts
ENCODING_BASELINE="$encoding_baseline" BENCH_FILTER='cp932|gb18030|big5' npx --yes deno run -A packages/effect/benchmark/CharacterEncoding.multibyte.ts
ENCODING_BASELINE="$encoding_baseline" node packages/effect/benchmark/CharacterEncoding.multibyte-differential.ts
```

The harness also supports `BENCH_ROUNDS`, `BENCH_DURATION_MS`, `BENCH_SIZE`, and
`BENCH_CHUNK_SIZE`. Omitting the filter includes Unicode and single-byte controls.

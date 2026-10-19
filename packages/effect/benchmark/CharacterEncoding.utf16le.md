# UTF-16LE Buffer encoding

UTF-16LE encoding now uses the available global `Buffer.from` implementation.
When Buffer is absent it retains the JavaScript DataView loop. The branch does
not depend on the runtime name or version. UTF-16BE and UTF-16 decoding are unchanged.
Strict surrogate validation, incremental state, and BOM handling remain outside
the conversion fast path. Results remain plain Uint8Array values. An exact-sized
Buffer backing store can be viewed directly; pooled/sliced backing stores are copied
to avoid exposing unrelated bytes through the returned array's `.buffer`.

## Deno status

[Deno issue #36803](https://github.com/denoland/deno/issues/36803) and
[PR #36804](https://github.com/denoland/deno/pull/36804) address the slow UTF-16LE
Buffer path. The fix writes UTF-16 code units through V8 directly into aligned
little-endian destinations, with a safe fallback for unaligned destinations.

**At measurement time the Deno PR is open and unmerged. Released Deno 2.9.6 still
regresses with this Effect optimization enabled.** There is deliberately no
version/runtime guard; the fixed-build results below require the proposed Deno fix.
This is not evidence that existing Deno releases have already been fixed.

## Fresh results

Baseline Effect commit: `ccb487d06` (multibyte optimization already applied).
Candidate: that baseline plus the UTF-16LE Buffer path. macOS ARM64 / Apple M2 Max.
Node 24.20.0, Bun 1.4.0, Deno 2.9.6.

Each runtime runs the baseline and candidate in one process: five alternating
150 ms rounds after 250 ms warmups per implementation. Runtime processes run
sequentially. Approximately 64 KiB UTF-8-equivalent source text and 4,093-byte
stream chunks. Values are median MiB/s, baseline → candidate. Percentages are
medians of paired changes, not ratios of rounded displayed medians.

| Runtime                |        UTF-16LE encode | Encode + full-byte checksum | UTF8 → UTF-16LE stream |
| ---------------------- | ---------------------: | --------------------------: | ---------------------: |
| Node 24.20.0           | 486 → 13912 (+2715.8%) |          134 → 185 (+38.2%) |    304 → 666 (+121.0%) |
| Bun 1.4.0              |   938 → 5436 (+480.4%) |        642 → 1383 (+114.3%) |     341 → 479 (+40.4%) |
| Deno 2.9.6 released    |     740 → 213 (-71.3%) |          278 → 145 (-47.9%) |     336 → 154 (-54.9%) |
| Deno local, before fix |     747 → 214 (-71.4%) |          281 → 145 (-48.3%) |     371 → 159 (-56.9%) |
| Deno local, with fix   | 757 → 16538 (+2081.5%) |          287 → 421 (+46.6%) |     373 → 725 (+96.4%) |

The UTF-8 encode control's paired change stays within ±0.5% on every runtime.
One-shot encoding consumes output lengths; the checksum variant scans every
output byte in JavaScript. Streaming consumes output chunks without collecting
them. Output equality is checked before timing. These are warm microbenchmarks,
not application-wide speedup claims or measurements of I/O/cold-start behavior.

The two local Deno binaries use the same Rust 1.95.0 `release-lite` build settings
(`CARGO_INCREMENTAL=0`, `CARGO_PROFILE_RELEASE_LITE_DEBUG=0`):

- Before: Deno main `336da420f4343cbb1dcbd5eed9d075ff555ed6ee`.
- Fixed: `dbbcc3461a1cd4c9d042990609572aa89302b74a` from PR #36804.

Published and locally built Deno binaries have different build settings; use the
matched local pair to isolate the Deno change. Both local binaries report 2.9.6,
so version metadata alone does not establish that the fix is present.

## Earlier benchmark results

The earlier confirmation run used Effect baseline `4ad6253ca`, the same workload
sizes and five-round timing method. It measured all three original experiments;
only the Buffer experiment affected these UTF-16 workloads.

| Runtime           |        UTF-16LE encode | Encode + full-byte checksum | UTF8 → UTF-16LE stream |
| ----------------- | ---------------------: | --------------------------: | ---------------------: |
| Node              | 498 → 13773 (+2630.3%) |          135 → 186 (+36.5%) |    309 → 694 (+126.8%) |
| Bun               |   934 → 5299 (+468.6%) |        659 → 1444 (+119.0%) |     349 → 494 (+42.2%) |
| Deno, without fix |     767 → 220 (-71.4%) |          283 → 146 (-48.4%) |     345 → 163 (-53.2%) |

The fresh results reproduce the original Node/Bun gains and released-Deno
regression. The patched Deno build changes the outcome to a gain, including the
checksum and streaming workloads, rather than only improving a raw allocation benchmark.

## Validation

- 116 targeted tests pass with Vitest launched on Node, Bun, released Deno,
  and the patched Deno build.
- Added coverage for every raw UTF-16 code unit, small/large result buffers,
  plain Uint8Array prototypes, backing-store isolation, strict validation,
  split surrogates, empty chunks, and BOM handling.
- An isolated Node probe without global Buffer passes; the probe was removed.
- `pnpm lint-fix`, `pnpm --filter effect check`, and `git diff --check` pass.
- Full `pnpm check` still fails on the pre-existing unused `metadata` parameter
  at `packages/effect/typetest/Schedule.tst.ts:80`.

## Reproduction and raw samples

```sh
encoding_baseline=$(mktemp -d)
git archive ccb487d06 packages/effect/src | tar -x -C "$encoding_baseline"
ENCODING_BASELINE="$encoding_baseline" ENCODING_BASELINE_REV=ccb487d06 BENCH_FILTER='utf16|^utf8/encode$' node packages/effect/benchmark/CharacterEncoding.multibyte.ts
```

Replace `node` with `bun`, `deno run -A`, or a chosen local Deno binary followed
by `run -A`. The same Effect baseline/candidate code is used on every runtime.

Raw samples: [Node](./CharacterEncoding.utf16le-node.jsonl),
[Bun](./CharacterEncoding.utf16le-bun.jsonl),
[released Deno](./CharacterEncoding.utf16le-deno-release.jsonl),
[local Deno before fix](./CharacterEncoding.utf16le-deno-before.jsonl),
[local Deno with fix](./CharacterEncoding.utf16le-deno-fixed.jsonl).

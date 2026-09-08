# Native character encoding (draft)

The implementation lives at `packages/effect/src/CharacterEncoding.ts` and is
imported as `effect/CharacterEncoding`. This follows the requested core source
location; it is **not a separately published `@effect/encoding` package**. Package
placement is an explicit review question for this draft.

## Usage

```ts
import * as CharacterEncoding from "effect/CharacterEncoding"
import * as Effect from "effect/Effect"
import * as Utf8 from "effect/encoding/Utf8"
import * as Windows1251 from "effect/encoding/Windows1251"
import * as Stream from "effect/Stream"

const program = Effect.gen(function*() {
  const bytes = yield* CharacterEncoding.encode("Привет", Windows1251.encoding)
  const text = yield* CharacterEncoding.decode(bytes, Windows1251.encoding)
  return text
})

// Chunks are converted on demand. A multibyte character may straddle chunks.
const source = Stream.make(Uint8Array.of(0xcf), Uint8Array.of(0xf0, 0xe8))
const utf8 = source.pipe(
  CharacterEncoding.transcodeStream(Windows1251.encoding, Utf8.encoding, {
    decode: { fatal: true },
    encode: { fatal: true }
  })
)
```

`encode` and `decode` report `CharacterEncodingError` in the Effect error channel.
`encodeUnsafe` / `decodeUnsafe` and incremental `makeEncoderUnsafe` /
`makeDecoderUnsafe` serve synchronous protocol-codec use cases and throw the same
error type. Incremental instances must not be shared between conversions.

Stream operators create fresh codec state for each run, including repeated runs
of the same stream description. They preserve pending byte sequences and UTF-16
surrogate pairs across chunks, flush on normal completion, and do not flush on
upstream failure or cancellation. Source errors and requirements are preserved.
Memory is proportional to an upstream batch and codec tables, not the whole input.
Streams may emit empty chunks while awaiting a complete character.

## Explicit codecs and optional registries

`CharacterEncoding` imports no codecs or mapping tables. Every conversion takes
an `Encoding` descriptor from an explicit import, not a globally resolved string.
Each of the 94 codec modules imports only its own mapping data and shared codec
machinery. Unicode codecs need no legacy mapping data.

The selected mapping data loads with its module. The larger typed lookup arrays
and decoding tries are constructed lazily on first conversion and cached by the
descriptor; every encoder/decoder still receives fresh incremental state.
There are no dynamic imports or asynchronous loading requirements.

For runtime labels, build a registry from exactly the codecs the application needs:

```ts
const registry = CharacterEncoding.makeRegistry([
  Utf8.encoding,
  Windows1251.encoding
])

const program = Effect.gen(function*() {
  const encoding = yield* registry.resolve("windows-1251")
  return yield* CharacterEncoding.encode("Привет", encoding)
})

registry.resolveUnsafe("cp1251") // Same descriptor as Windows1251.encoding
registry.encodingExists("cp932") // false: not included in this registry
```

Registries are isolated and include normalized aliases only for their supplied
codecs. Unknown labels fail with `CharacterEncodingError` and operation `resolve`;
conflicting aliases throw when constructing a registry. Resolution never loads
additional codecs or constructs lookup tables.

Applications deliberately supporting all encodings can opt in:

```ts
import * as All from "effect/encoding/All"

const encoding = All.resolveUnsafe("Shift_JIS")
const decoded = CharacterEncoding.decode(bytes, encoding)
```

`All` imports every codec and exposes `registry`, `encodings`, `resolve`,
`resolveUnsafe`, and `encodingExists`. Do not import it in a selective entry point.
The core operators never import `All` back. Neither the ordinary codec modules
nor `All` are re-exported from the core operators.

This provides selective bundling by keeping unused mappings outside the import
graph, rather than expecting a bundler to infer encodings from string arguments.
The first draft's string-taking conversion API and core `encodings` /
`encodingExists` exports have been replaced by these explicit codec and registry APIs.

## Scope and compatibility

- 94 canonical encodings: UTF-8, explicit UTF-16LE/BE and UTF-32LE/BE, 81
  single-byte encodings, and eight multibyte codecs (Shift-JIS, CP936, CP949,
  CP950, GBK, GB18030, EUC-JP and Big5-HKSCS), plus mapping-table aliases.
- All conversion code is local TypeScript with Uint8Array inputs/outputs. No
  runtime dependency on iconv-lite, native bindings, or Node streams is added.
  Optional global Buffer fast paths encode UTF-16LE and convert already-decoded
  UTF-16 code units into a string; portable fallbacks handle environments without
  Buffer. UTF-16LE encoding returns plain Uint8Array values and copies pooled
  backing stores to avoid exposing unrelated bytes. Strict validation, cross-chunk
  state and BOM handling are preserved; UTF-16 decoding is unchanged.
- Replacement mode is the default. `fatal: true` rejects unrepresentable or
  malformed input. Unicode BOMs are stripped by default when decoding; encoding
  adds a BOM only with `addBOM: true`.
- UTF-16 decoding follows TextDecoder's replacement/strict semantics, matching
  the local iconv-lite 1.0 alpha rather than 0.7.x's preservation of malformed
  surrogate code units and its ignored trailing odd byte. Encoding preserves
  raw UTF-16 code units in replacement mode; strict mode rejects lone surrogates.
- Automatic UTF-16/UTF-32 endian detection, UTF-7, CESU-8, Base64/hex pseudo-codecs,
  transliteration, and node-iconv's wider set of stateful encodings are **not**
  implemented. Unknown encodings fail explicitly. This is not a drop-in
  compatibility-complete replacement for either benchmark baseline.
- Mapping data is statically imported only through selected codec modules;
  codec lookup tables are constructed lazily and cached. Importing `All` opts
  into all mapping data. Further compression and sharing of overlapping multibyte
  tables remain optimization topics.

## Provenance and regeneration

Mapping tables were imported from the user's local iconv-lite checkout at
`2472166ea5a4825ca091b9550713c403852a566b` (`1.0.0-alpha.2`). Full MIT attribution is
included in each generated data file. Conversion algorithms use iconv-lite's
table format and single-byte/multibyte table-driven approach, with new typed
conversion state and Effect integration. The source checkout is not modified.

```sh
node scripts/generate-character-encoding.ts /path/to/iconv-lite
pnpm lint-fix
pnpm test --run packages/effect/test/CharacterEncoding.test.ts
```

## Benchmark reproduction

The native comparator is `node-iconv` (`iconv` on npm). Its compiled bindings are installed in a
separate benchmark environment, not added to Effect's runtime or CI dependencies.

```sh
npm install --prefix /tmp/encoding-bench iconv@3.0.1 iconv-lite@0.7.3
ICONV_BENCH_ROOT=/tmp/encoding-bench \
  node packages/effect/benchmark/CharacterEncoding.ts

# Also compare with the supplied upstream checkout:
ICONV_BENCH_ROOT=/tmp/encoding-bench ICONV_LITE_PATH=/path/to/iconv-lite \
  node packages/effect/benchmark/CharacterEncoding.ts
```

The harness verifies equal output before timing. It compares synchronous
encode/decode APIs separately from complete streaming pipelines. Streaming
compares Effect Stream transcoding with iconv-lite's Node decode+encode streams
and node-iconv's native conversion stream. All use the same input chunk list and
consume output without collecting it during timing. Node-iconv directly converts
bytes to bytes; the other two pipelines convert through JavaScript strings.

Defaults: approximately 64 KiB of UTF-8 source text, 4,093-byte stream chunks,
100 ms warmup per provider, five rotating-order rounds of 150 ms per provider.
`BENCH_SIZE`, `BENCH_CHUNK_SIZE`, `BENCH_ROUNDS`, and `BENCH_DURATION_MS` override
those settings. Throughput is MiB/s of input bytes; for string input this means
its UTF-8 byte length, consistently across providers. All text is representable
in the target encoding; performance measurements do not exercise replacement or
error paths. Reused codecs are warmed, so these are not cold-start measurements. Effect codec
labels are resolved once outside timing; timed conversion uses explicit descriptors.

Raw synchronous measurements use the Unsafe API; they do not measure repeatedly
starting an Effect runtime. Streaming results include Effect's runtime overhead
or Node's stream/event overhead respectively. No disk/network I/O is included.
Results are local directional measurements, not release-level guarantees; memory
and GC, small-message latency and cold-start cost need separate measurements.
The third-party comparisons below are Node-only; the optimization comparisons
also measure Bun and Deno. The benchmark consumes output lengths during timing;
some runtime codecs can return strings backed by input memory, so high throughput
does not necessarily mean every character was scanned in JavaScript.

## Latest optimization results (2026-09-08)

These are before/after **Effect** measurements, not fresh comparisons against
iconv-lite or node-iconv. The older third-party results are retained separately
below; mixing their baseline columns with these new measurements would not be a
paired comparison.

macOS ARM64 / Apple M2 Max; Node 24.20.0, Bun 1.4.0 and Deno 2.9.6. Each runtime
runs both Effect revisions in one process, with five alternating 150 ms rounds
after 250 ms warmups per implementation. Runtime processes run sequentially.
Inputs are approximately 64 KiB of UTF-8-equivalent text, with 4,093-byte stream
chunks. Tables show median MiB/s, before → after; percentages are medians of
paired changes, not ratios of the rounded medians. Output equality is checked
before timing. These are warm microbenchmarks, not application-wide speedups.

### UTF-16LE global Buffer encoding

Effect `ccb487d06` → `c061be462`: use the available global `Buffer.from` for
UTF-16LE encoding, retaining the JavaScript fallback when Buffer is absent.
There is no runtime/version guard. UTF-16BE and decoding are unchanged.

| Runtime                |        UTF-16LE encode | Encode + full-byte checksum | UTF8 → UTF-16LE stream |
| ---------------------- | ---------------------: | --------------------------: | ---------------------: |
| Node 24.20.0           | 486 → 13912 (+2715.8%) |          134 → 185 (+38.2%) |    304 → 666 (+121.0%) |
| Bun 1.4.0              |   938 → 5436 (+480.4%) |        642 → 1383 (+114.3%) |     341 → 479 (+40.4%) |
| Deno 2.9.6 released    |     740 → 213 (-71.3%) |          278 → 145 (-47.9%) |     336 → 154 (-54.9%) |
| Deno local, before fix |     747 → 214 (-71.4%) |          281 → 145 (-48.3%) |     371 → 159 (-56.9%) |
| Deno local, with fix   | 757 → 16538 (+2081.5%) |          287 → 421 (+46.6%) |     373 → 725 (+96.4%) |

**Released Deno 2.9.6 regresses with this optimization.**
[Deno issue #36803](https://github.com/denoland/deno/issues/36803) and
[PR #36804](https://github.com/denoland/deno/pull/36804) address its slow UTF-16LE
Buffer implementation. At measurement time the PR was open and unmerged; the
fixed-build results require that proposed fix, not an existing released runtime.
The two local Deno builds use matching Rust 1.95.0 `release-lite` settings, at
`336da420f` before and `dbbcc3461` after the fix. Published Deno has different
build settings, so use the matched local pair to isolate the Deno change.

Raw encoding consumes output lengths; the checksum variant scans every output
byte in JavaScript. Streaming consumes chunks without collecting them. The UTF-8
encode control stays within ±0.5% on every runtime.

The earlier confirmation run measured UTF-16LE encoding at 498 → 13773 MiB/s on
Node (+2630.3%), 934 → 5299 on Bun (+468.6%), and 767 → 220 on unpatched Deno
(-71.4%). The latest results reproduce those gains and that regression; patched
Deno also gains on checksum and streaming workloads.

See the [UTF-16LE report](./CharacterEncoding.utf16le.md) for reproduction,
the complete older results, validation and raw samples for all five runtime builds.

### Table-only multibyte codecs and mapping-derived capacities

Effect `4ad6253ca` → `ccb487d06`: codecs without GB18030 ranges or multi-character
encoding sequences use a simpler encoder loop. Encoder/decoder capacities come
from mapping data instead of blanket worst-case allocations; complex codecs
retain their range/sequence paths. This optimization is runtime-independent and
is already included in the UTF-16LE baseline above.

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

The main reproducible gain is the simple encoder. Decoder/streaming gains vary;
small changes may be noise. See the [multibyte report](./CharacterEncoding.multibyte.md)
for reproduction, validation and raw samples. That report records the state at
`ccb487d06`, before the subsequently committed UTF-16LE Buffer optimization.

## Historical third-party results (2026-09-08, before runtime optimizations)

These tables predate both optimizations above and have not been rerun against
the latest Effect revision.

Node 24.20.0 on macOS ARM64, using the default settings above. Baseline here is
the supplied iconv-lite 1.0.0-alpha.2 checkout and node-iconv 3.0.1. Values are
median MiB/s; the last column is the median of paired throughput changes against
iconv-lite, not the ratio of independent medians.

| Workload             | Effect | iconv-lite alpha | node-iconv | Paired change |
| -------------------- | -----: | ---------------: | ---------: | ------------: |
| utf8/encode          |    488 |              489 |        198 |         -0.3% |
| utf8/decode          |   1275 |             1274 |        263 |         -0.8% |
| utf8->utf16le/stream |    299 |              332 |        355 |         -8.5% |
| utf16le/encode       |    486 |              509 |        224 |         -4.2% |
| utf16le/decode       |   1974 |             1977 |        397 |         -0.1% |
| cp1251/encode        |    755 |              603 |        254 |        +24.5% |
| cp1251/decode        |    798 |              222 |        207 |       +259.4% |
| cp1251->utf8/stream  |    216 |              145 |        217 |        +46.5% |
| cp932/encode         |    413 |              485 |        210 |        -14.7% |
| cp932/decode         |    199 |              266 |        225 |        -24.5% |
| cp932->utf8/stream   |    128 |              172 |        230 |        -24.2% |
| gb18030/encode       |    269 |              285 |        182 |         -6.2% |
| gb18030/decode       |    175 |              212 |        212 |        -17.3% |

At that revision the results were mixed, not an across-the-board win: Unicode
codec throughput was near the alpha baseline, single-byte encode/decode was faster
in this corpus, and multibyte codecs and most streaming pipelines trailed iconv-lite. Effect
streaming offers typed errors, cancellation and scoped composition, but those
capabilities do not automatically make conversion faster. The host is shared
and some samples have substantial outliers. Further optimization and broader
corpora are needed before claiming general performance parity.

In this rerun, the alpha CP1251 streaming baseline dropped from about 270 MiB/s
in the first draft to 145 MiB/s, while Effect remained near 216 MiB/s. Its apparent
relative win should not be attributed to the explicit-codec change; the stable
baseline still outperforms Effect on that workload. Raw samples are retained to
make this variability visible.

### Published iconv-lite 0.7.3 comparison

Same settings, measured separately:

| Workload             | Effect | iconv-lite 0.7.3 | node-iconv | Paired change |
| -------------------- | -----: | ---------------: | ---------: | ------------: |
| utf8/encode          |    482 |              481 |        194 |         -0.0% |
| utf8/decode          |   1271 |              409 |        264 |       +214.9% |
| utf8->utf16le/stream |    303 |              357 |        364 |        -14.0% |
| utf16le/encode       |    467 |            15182 |        217 |        -96.9% |
| utf16le/decode       |   1924 |            42859 |        379 |        -95.5% |
| cp1251/encode        |    752 |              749 |        251 |         +0.6% |
| cp1251/decode        |    808 |              534 |        208 |        +51.3% |
| cp1251->utf8/stream  |    217 |              241 |        221 |        -10.2% |
| cp932/encode         |    408 |              478 |        204 |        -15.0% |
| cp932/decode         |    196 |              268 |        225 |        -26.8% |
| cp932->utf8/stream   |    130 |              175 |        228 |        -25.7% |
| gb18030/encode       |    268 |              288 |        186 |         -6.1% |
| gb18030/decode       |    173 |              212 |        201 |        -18.3% |

The stable baseline was especially fast for UTF-16, using Node's raw Buffer
conversion rather than the alpha's TextEncoder/TextDecoder backend. The latest
Effect optimization addresses encoding throughput, but this direct comparison
has not been rerun and UTF-16 decoding is unchanged. Malformed UTF-16
decoding semantics also differ as described above; the timed corpus is valid.

Raw samples: [alpha comparison](./CharacterEncoding.alpha-results.jsonl) and
[published 0.7.3 comparison](./CharacterEncoding.stable-results.jsonl).

## Selective bundle verification

These bundle measurements predate the runtime optimizations above; bundle sizes
have not been remeasured for `c061be462`.

Run `node packages/effect/benchmark/CharacterEncoding.bundle.ts` from the repository
root. This bundles five virtual entry points using esbuild 0.28.2 and Rolldown
1.2.7, checks their imported mapping-module counts, and executes the resulting
ESM bundles to verify conversion. UTF-8 needs zero legacy tables; CP1251 and a
restricted UTF-8/CP1251 registry import exactly windows1251Data.ts; All imports
all 89 mapping modules (81 single-byte plus eight multibyte).

Browser-targeted, minified ESM, UTF-8 output, no source maps; sizes include the
operators and retained Effect infrastructure, not just mapping data. Gzip uses
Node's default gzip settings. Measurements use Node 24.20.0 on macOS ARM64.

| Entry point         | Mapping modules | esbuild bytes (gzip) | Rolldown bytes (gzip) |
| ------------------- | --------------: | -------------------: | --------------------: |
| operators-only      |               0 |         14199 (5202) |          13290 (4796) |
| utf8-only           |               0 |         16987 (6326) |          16028 (5831) |
| cp1251-only         |               1 |         16646 (6333) |          15711 (5904) |
| restricted-registry |               1 |        97801 (33229) |         94242 (30731) |
| all-encodings       |              89 |      484458 (292691) |       481040 (289117) |

The restricted registry retains Effect infrastructure for its typed `resolve`
method even when this entry point calls `resolveUnsafe`, explaining the step up
from the direct codec entry points. These are standalone decoder bundle sizes,
not whole application sizes; an application already using Effect may share that
infrastructure. The five cases expose different API capabilities, so they are
not interchangeable workloads. Importing All is an intentional size trade-off.

[Raw bundle results](./CharacterEncoding.bundle-results.jsonl).

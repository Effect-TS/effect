# Native character encoding (draft)

The implementation lives at `packages/effect/src/CharacterEncoding.ts` and is
imported as `effect/CharacterEncoding`. This follows the requested core source
location; it is **not a separately published `@effect/encoding` package**. Package
placement is an explicit review question for this draft.

## Usage

```ts
import * as CharacterEncoding from "effect/CharacterEncoding"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"

const program = Effect.gen(function*() {
  const bytes = yield* CharacterEncoding.encode("Привет", "windows-1251")
  const text = yield* CharacterEncoding.decode(bytes, "windows-1251")
  return text
})

// Chunks are converted on demand. A multibyte character may straddle chunks.
const source = Stream.make(Uint8Array.of(0xcf), Uint8Array.of(0xf0, 0xe8))
const utf8 = source.pipe(
  CharacterEncoding.transcodeStream("windows-1251", "utf8", {
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

## Scope and compatibility

- 94 canonical encodings: UTF-8, explicit UTF-16LE/BE and UTF-32LE/BE, 81
  single-byte encodings, and eight multibyte codecs (Shift-JIS, CP936, CP949,
  CP950, GBK, GB18030, EUC-JP and Big5-HKSCS), plus mapping-table aliases.
- All conversion code is local TypeScript with Uint8Array inputs/outputs. No
  runtime dependency on iconv-lite, native bindings, or Node streams is added.
  An optional Node Buffer fast path converts already-decoded UTF-16 code units
  into a string; a portable fallback handles environments without it.
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
- Mapping data is statically importable for portable synchronous conversion;
  codec lookup tables are constructed lazily and cached. Importing this module
  includes mapping data for all supported encodings; per-encoding entry points
  and bundle-size optimization remain review topics.

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

The `nove-iconv` name in the original request is treated as `node-iconv`
(`iconv` on npm) pending confirmation. Its compiled bindings are installed in a
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
error paths. Reused codecs are warmed, so these are not cold-start measurements.

Raw synchronous measurements use the Unsafe API; they do not measure repeatedly
starting an Effect runtime. Streaming results include Effect's runtime overhead
or Node's stream/event overhead respectively. No disk/network I/O is included.
Results are local directional measurements, not release-level guarantees; memory
and GC, small-message latency, cold-start cost and non-Node runtimes need separate
performance measurements. The benchmark consumes output lengths during timing;
some runtime codecs can return strings backed by input memory, so high throughput
does not necessarily mean every character was scanned in JavaScript.

## Local results (2026-09-08)

Node 24.20.0 on macOS ARM64, using the default settings above. Baseline here is
the supplied iconv-lite 1.0.0-alpha.2 checkout and node-iconv 3.0.1. Values are
median MiB/s; the last column is the median of paired throughput changes against
iconv-lite, not the ratio of independent medians.

| Workload             | Effect | iconv-lite alpha | node-iconv | Paired change |
| -------------------- | -----: | ---------------: | ---------: | ------------: |
| utf8/encode          |    493 |              496 |        200 |         -0.4% |
| utf8/decode          |   1283 |             1299 |        269 |         -0.8% |
| utf8->utf16le/stream |    302 |              326 |        364 |         -6.3% |
| utf16le/encode       |    493 |              514 |        230 |         -4.1% |
| utf16le/decode       |   2014 |             1984 |        402 |         +1.5% |
| cp1251/encode        |    764 |              620 |        259 |        +22.7% |
| cp1251/decode        |    801 |              222 |        206 |       +261.9% |
| cp1251->utf8/stream  |    221 |              270 |        222 |        -17.1% |
| cp932/encode         |    423 |              496 |        214 |        -14.6% |
| cp932/decode         |    204 |              275 |        226 |        -25.9% |
| cp932->utf8/stream   |    129 |              171 |        229 |        -23.2% |
| gb18030/encode       |    276 |              292 |        187 |         -6.4% |
| gb18030/decode       |    177 |              217 |        212 |        -18.5% |

These results are mixed, not an across-the-board win: Unicode codec throughput
is near the alpha baseline, single-byte encode/decode is faster in this corpus,
and multibyte codecs and the streaming pipelines still trail iconv-lite. Effect
streaming offers typed errors, cancellation and scoped composition, but those
capabilities do not automatically make conversion faster. The host is shared
and some samples have substantial outliers. Further optimization and broader
corpora are needed before claiming general performance parity.

### Published iconv-lite 0.7.3 comparison

Same settings, measured separately:

| Workload             | Effect | iconv-lite 0.7.3 | node-iconv | Paired change |
| -------------------- | -----: | ---------------: | ---------: | ------------: |
| utf8/encode          |    491 |              500 |        197 |         -1.6% |
| utf8/decode          |   1267 |              406 |        260 |        211.8% |
| utf8->utf16le/stream |    306 |              349 |        371 |        -12.0% |
| utf16le/encode       |    491 |            16864 |        231 |        -97.0% |
| utf16le/decode       |   2047 |            44146 |        401 |        -95.3% |
| cp1251/encode        |    730 |              681 |        251 |          7.4% |
| cp1251/decode        |    814 |              540 |        209 |         51.7% |
| cp1251->utf8/stream  |    222 |              241 |        223 |         -7.1% |
| cp932/encode         |    421 |              499 |        214 |        -15.2% |
| cp932/decode         |    197 |              264 |        223 |        -25.3% |
| cp932->utf8/stream   |    133 |              171 |        236 |        -24.8% |
| gb18030/encode       |    275 |              291 |        189 |         -5.4% |
| gb18030/decode       |    178 |              221 |        211 |        -18.8% |

The stable baseline is especially fast for UTF-16, using Node's raw Buffer
conversion rather than the alpha's TextEncoder/TextDecoder backend. This is a
substantial performance gap, not a general parity result. Malformed UTF-16
decoding semantics also differ as described above; the timed corpus is valid.

Raw samples: [alpha comparison](./CharacterEncoding.alpha-results.jsonl) and
[published 0.7.3 comparison](./CharacterEncoding.stable-results.jsonl).

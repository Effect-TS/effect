# Fixed-width integer payload experiment

Exploratory only: this does not implement the proposed SchemaBinary constructors
or measure complete frames. No production code changes.

Run `node packages/effect/benchmark/schema/SchemaBinaryIntegers.mjs` with
Tinybench 6.2.2 available. The script extracts the current Writer/Reader methods
from source, strips their numeric parameter/return types, and checks round trips
for all fixtures and signed/unsigned boundaries before timing. Fixed uint64 uses
DataView get/setBigUint64; the other fixed methods already exist internally.

Measured against source commit 79b8246eb3af6759aef3cb368219eab71cfdd230,
Node v26.12.1, Linux x86_64 AMD EPYC, two visible vCPUs. Three paired rounds,
alternating baseline/fixed order; 100 ms warmup and 200 ms measurement per task
per round. Each callback processes 256 values. Reported latency is median
batch mean divided by 256, not individual-call latency.

| Fixture | Var bytes/value | Fixed bytes/value | Encode var/fixed ns | Decode var/fixed ns |
| --- | ---: | ---: | ---: | ---: |
| int32 small | 1 | 4 | 33.0 / 23.3 | 43.2 / 24.7 |
| uint32 small | 1 | 4 | 28.4 / 24.9 | 43.9 / 25.2 |
| int32 full | 4.965 | 4 | 40.4 / 23.1 | 80.8 / 23.0 |
| uint32 full | 4.977 | 4 | 49.9 / 36.9 | 84.4 / 33.1 |
| int64 small | 1 | 8 | 83.1 / 25.2 | 106.1 / 34.0 |
| uint64 small | 1 | 8 | 62.9 / 22.5 | 88.3 / 33.2 |
| int64 full | 9.488 | 8 | 587.0 / 27.8 | 500.4 / 35.3 |
| uint64 full | 9.773 | 8 | 605.3 / 23.8 | 539.1 / 32.8 |

Small fixtures use magnitudes 0–63. Full fixtures use a seeded 32-bit LCG,
combining consecutive outputs for 64-bit values; reproducible, not a claim
of representative production distributions or independent random samples.
The bigint baseline is SchemaBinary zigzag even for positive uint64 values,
not a hypothetical unsigned-varint codec. Number baseline is sign-magnitude.

All paired rounds favor fixed-width except small uint32 encoding, which ranges
from 0.80x to 1.39x. Full-width bigint encode ratios span 20.77–26.03x and decode
14.15–16.45x. These are payload-loop ratios, NOT end-to-end codec speedups.

Buffers and DataViews are reused. Both sides use dynamic method lookup in the
loop. No range checks, schema passes, frame allocation, tags, length prefixes,
fingerprints, field dispatch or row-run machinery are measured. Reader view
initialization is excluded. Byte counts are exact payload counts for the
fixtures; real wire savings need an integrated codec prototype. Fixed-width
eliminates bigint varint loops but makes small payloads four/eight times larger.

Validation: fixture/boundary round trips and `node --check` passed. Repository
typecheck/lint/test suites were not run: this is a standalone JS experiment,
and workspace dependencies are not installed.

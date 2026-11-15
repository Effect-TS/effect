# FlatBuffers assertion reference

This reference inventories the public low-level encoding boundary in
`FlatBuffers.test.ts` for maintainers. It maps existing regression assertions before
adding focused format examples; it is not a claim of complete FlatBuffers conformance.

## Authoritative sources

The upstream Google FlatBuffers documentation is pinned to commit
`569e6cb461738f0aefccbada0f04afefe1a43a1a`, resolved with the GitHub commits API
for `docs/source/internals.md` and read through the contents API at that SHA.

- [F: FlatBuffer Internals](https://github.com/google/flatbuffers/blob/569e6cb461738f0aefccbada0f04afefe1a43a1a/docs/source/internals.md):
  Format components, Offsets, Structs, Tables, Strings and Vectors, Encoding example.
  Only the FlatBuffers portion applies, not the separate FlexBuffers format.
- [S: Schemas](https://github.com/google/flatbuffers/blob/569e6cb461738f0aefccbada0f04afefe1a43a1a/docs/source/schema.md):
  UTF-8 strings and four-character file identifiers at bytes 4–7.

`MONSTER` and `PREFIXED` predate this inventory and record their producer as the
official Python builder, PyPI `flatbuffers` 25.12.19. They are interoperability
fixtures, not normative byte layouts or newly regenerated upstream artifacts.
F explicitly allows different valid layouts for identical values.

## Assertion-to-test map

All exact test names below are under `describe("FlatBuffers")` in
`FlatBuffers.test.ts`. IDs are stable and appear beside their tests.
**N** denotes a normative format assertion, **I** a particular interoperability
fixture, and **P** a local API/safety policy (not an upstream requirement).

| ID              | Exact test name                                                           | Assertion and source / boundary                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FB-I01          | builds the bytes the official builder builds                              | Exact `MONSTER` and size-prefixed `PREFIXED` byte equality with the recorded Python producer, including its field ordering, padding, sharing and default handling. Not a canonical-layout requirement.                                                                                                                                                                                  |
| FB-N01 / FB-I02 | reads the official builder's bytes                                        | F: reads root-relative offsets, inline float32 structs, absent/default int16, present int16, strings, byte vectors, offset-vector tables, padded signed integer structs, and bool from `MONSTER`. S: reads `MONS` identifier. I02: also reads size-prefixed `ABCD`, its string, and explicitly stored scalar default from `PREFIXED`; prefix framing is interoperability coverage here. |
| FB-N02          | reads absent fields as their defaults                                     | F Tables: slots beyond the trimmed four-byte vtable return caller defaults. Zero-entry defaults are exercised by FB-N01 and FB-N03. Undefined reference results are the local API representation of absence.                                                                                                                                                                            |
| FB-N03          | reads the specification encoding example                                  | F Encoding example: independently transcribed wire bytes yield inline IEEE-754 little-endian floats `[1, 2, 3]`, absent mana/default 150, hp 50 and string `fred`. No local builder supplies the oracle.                                                                                                                                                                                |
| FB-N04          | reads a vtable after its table                                            | F Tables: a hand-authored root at 4 with signed vtable displacement -8 resolves the vtable at 12, reads int32 value 42, and returns default 7 for an absent later slot.                                                                                                                                                                                                                 |
| FB-N05          | reads independently encoded binary64 and unsigned scalars                 | F Format components: hand-authored little-endian binary64 bytes decode to 1.5, positive/negative zero, positive/negative infinity and NaN; uint32 and uint64 preserve high-bit values and their unsigned maxima. Signed zero is distinguished; NaN payload preservation is not asserted. No local builder supplies the oracle.                                                          |
| FB-P01          | decode returns a failure for malformed input                              | Local `OutOfBounds`, `InvalidVtable`, `InvalidUtf8`, and `Identifier` classification for the listed malformed fixtures. S requires UTF-8, but does not prescribe these errors or lazy validation.                                                                                                                                                                                       |
| FB-P02          | decode rethrows errors that aren't FlatBuffersErrors                      | Local propagation of an arbitrary callback exception.                                                                                                                                                                                                                                                                                                                                   |
| FB-P03          | only fails with FlatBuffersError on truncated or corrupted buffers        | Every truncation before the final string terminator fails the selected traversal; every single-byte XOR corruption completes or reports a FlatBuffersError rather than leaking another error. Does not assert every corruption is invalid.                                                                                                                                              |
| FB-P04          | fails tables nested deeper than maxDepth                                  | Local default depth limit rejects a 65-table chain; configured limit 65 reads it.                                                                                                                                                                                                                                                                                                       |
| FB-P05          | throws for reads that don't match the shape asked for, even inside decode | Local Usage errors for mismatched vector width, zero width, out-of-range/negative/NaN struct reads, invalid slots and identifier arguments.                                                                                                                                                                                                                                             |
| FB-P06          | keeps UTF-8 strings and identifiers intact, byte order mark included      | Local BOM preservation in strings and a four-UTF-8-byte identifier. This non-ASCII identifier is not evidence of S's four-character identifier requirement.                                                                                                                                                                                                                             |
| FB-P07          | forceDefaults writes scalar defaults but leaves absent references absent  | Local builder option keeps the default-valued scalar slot present while zero reference offsets remain absent; this test checks presence, not the stored scalar value.                                                                                                                                                                                                                   |
| FB-P08          | Builder rejects misuse                                                    | Local Usage errors for nesting/state/finish misuse, non-inline structs, invalid offsets, slots, identifier length, sizes and alignments. Includes rejecting 64-KiB inline data / excessive slot count that exceed F's uint16 vtable representation.                                                                                                                                     |

## Exclusions and gaps

- No full-buffer verifier claim: traversal checks only requested fields. The
  truncation test deliberately does not require the final string NUL to be read.
  F requires NUL-terminated strings; writer termination is covered by fixture
  parity, but reader rejection of a missing/nonzero terminator is not asserted.
- Scalar coverage remains selective: FB-N05 covers binary64 special values and
  high-bit unsigned values, not every scalar-width edge value or NaN payload.
- Existing fixtures exercise some sharing, padding and vector layouts; they do
  not exhaust alternate field orders, all alignments, empty vectors/strings,
  repeated-offset aliases or all valid table/vtable sharing arrangements.
- No schema compiler, schema evolution suite, union discriminator validation,
  required/key fields, sorted-vector lookup, reflection, 64-bit offsets or
  FlexBuffers coverage. These are not inferred from low-level table reads.
- Size-prefixed framing is mapped only to the recorded producer fixture, not
  elevated to a requirement from the pinned format document. No broad cross-language
  or producer-version compatibility claim is made.

## Validation

Run from the repository root:

```sh
nix develop -c pnpm test --run packages/effect/test/encoding/FlatBuffers.test.ts
```

The suite retains all existing regressions and adds only three independent
format-reader examples (FB-N03, FB-N04 and FB-N05). No production behavior is changed.

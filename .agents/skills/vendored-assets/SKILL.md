---
name: vendored-assets
description: Vendored assets. Use when updating checked-in third-party JavaScript, CSS, registries, schemas, data snapshots, or generated Scalar, Swagger, and MIME artifacts.
---

Treat the upstream artifact as a supply-chain input. Edit its generator or
documented import source, then regenerate; preserve generated output as reviewable
evidence rather than hand-editing it.

## Workflow

1. **Trace ownership.** Identify the generated artifact, generator or exact
   import procedure, recorded upstream source and version, license, consumers,
   focused tests, and shipped package or bundle. For Scalar and Swagger, start at
   `scripts/package-scalar.mjs` and `scripts/package-swagger.mjs`; for MIME, start
   at `packages/effect/src/unstable/http/internal/mimeTypes.ts` and its history.
   This step is complete when every input and consumer is accounted for and the
   output can be regenerated without editing it directly.
2. **Pin provenance.** Resolve moving URLs, tags, branches, and omitted versions
   to an explicit immutable release or artifact before reviewing changes. Record
   the upstream project, exact version, artifact path or URL, and a digest in the
   generator or generated artifact's maintenance header. Omit the digest only
   when an independently enforced immutable source is evidenced and recorded.
   This step is complete when a future run cannot silently select different
   bytes.
3. **Clear the license gate.** Verify the selected release's package metadata and
   license files, including notices required by bundled dependencies. Preserve
   required copyright, license, and notice text in the distributed form; a
   minifier's reference to an absent license file does not clear this gate. This
   step is complete when every distributed third-party artifact has a verified,
   retained license trail.
4. **Regenerate.** Improve the checked-in generator or import reference first,
   then run it. For an artifact with no generator, recover the exact extraction
   procedure from repository history or upstream documentation. Add the smallest
   deterministic script only when updates will recur; otherwise record the exact
   import procedure beside the artifact. This step is complete when a clean
   rerun produces no diff.
5. **Audit the complete generated diff.** Review all changed output, not only a
   formatted preview. Account for executable behavior, external URLs and runtime
   fetches, source-map references, license or notice loss, encoding and format
   changes, and unexpected additions or removals. For browser assets, also assess
   CSP requirements, dynamic code execution, injected markup or styles, network
   destinations, and runtime loading. This step is complete when every generated
   change is attributable to the selected upstream release and suspicious content
   is resolved or reported.
6. **Clear test and size gates.** Record artifact byte sizes before and after.
   Load `runtime-testing` for focused consumer tests and apply the
   `.agents/AGENTS.md` lint and validation rules. Load `bundle-analysis` when JavaScript,
   CSS, or registry data materially affects shipped output, and compare against
   the pre-update revision. This step is complete when focused tests pass and
   every non-trivial size delta is measured and explained.
7. **Close release impact.** Load `changesets` when behavior, browser support,
   wire data, or meaningful shipped size changes are consumer-visible. Generated
   provider API code belongs to `ai-codegen`; `@barrel` sections, `LLMS.md`, and
   `migration/v3-to-v4.md` belong to the owners named in `.agents/AGENTS.md`. The
   task is complete only when source, version, provenance, license, deterministic
   regeneration, full diff, tests, size impact, and release impact are all
   explicitly reported.

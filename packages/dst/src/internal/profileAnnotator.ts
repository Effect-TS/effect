/**
 * Profile Annotator - Combines V8 CPU profile data with source maps and
 * git blame to produce annotated nodes with developer attribution.
 *
 * @internal
 */

import * as Effect from "effect/Effect"
import type { BlameEntry } from "./gitBlame.js"
import * as GitBlame from "./gitBlame.js"
import * as SourceMapResolver from "./sourceMapResolver.js"
import type { ProfileNode, V8Profile } from "./v8Profiler.js"
import { computeSelfTimes } from "./v8Profiler.js"

// ── Types ────────────────────────────────────────────────────────────────

/** @internal */
export interface AnnotatedNode {
  readonly node: ProfileNode
  readonly resolved: SourceMapResolver.ResolvedLocation | null
  readonly blame: BlameEntry | null
  readonly selfTime: number
}

// ── Annotation Pipeline ──────────────────────────────────────────────────

/**
 * Annotate all profile nodes with source-map resolution and git blame data.
 *
 * Pipeline:
 * 1. Resolve source maps for all call frames (JS → TS)
 * 2. Collect unique TS files
 * 3. Run git blame for each file (bounded concurrency)
 * 4. Join blame data onto resolved nodes
 * 5. Compute self-time per node from samples/timeDeltas
 *
 * @internal
 */
export const annotateProfile = (
  profile: V8Profile,
  repoRoot: string
): Effect.Effect<ReadonlyArray<AnnotatedNode>, Error> =>
  Effect.gen(function*() {
    // Step 1: Resolve source maps
    const resolvedNodes = SourceMapResolver.resolveProfileNodes(profile.nodes)

    // Step 2: Collect unique source files
    const uniqueFiles = new Set<string>()
    for (const { resolved } of resolvedNodes) {
      if (resolved?.originalFile) {
        uniqueFiles.add(resolved.originalFile)
      }
    }

    // Step 3: Run git blame for each file (bounded concurrency)
    const blameMaps = yield* Effect.forEach(
      [...uniqueFiles],
      (file) =>
        GitBlame.blameFile(file, repoRoot).pipe(
          Effect.map((map) => [file, map] as const),
          Effect.catchAll(() => Effect.succeed([file, new Map()] as const))
        ),
      { concurrency: 8 }
    )

    // Step 4: Build unified blame lookup
    const blameIndex = new Map<string, BlameEntry>()
    for (const [_, map] of blameMaps) {
      for (const [key, entry] of map) {
        blameIndex.set(key, entry)
      }
    }

    // Step 5: Compute self-times
    const selfTimes = computeSelfTimes(profile)

    // Step 6: Annotate
    return resolvedNodes.map(({ node, resolved }) => ({
      node,
      resolved,
      blame: resolved
        ? blameIndex.get(`${resolved.originalFile}:${resolved.originalLine}`) ?? null
        : null,
      selfTime: selfTimes.get(node.id) ?? 0
    }))
  })

/**
 * Report Generator - Produces developer attribution reports from
 * annotated profile data.
 *
 * @internal
 */

import type { AnnotatedNode } from "./profileAnnotator.js"

// ── Types ────────────────────────────────────────────────────────────────

/** @internal */
export interface HotFrame {
  readonly functionName: string
  readonly file: string
  readonly line: number
  readonly selfTime: number
  readonly commitHash: string
  readonly commitMessage: string
}

/** @internal */
export interface DeveloperHotspot {
  readonly author: string
  readonly email: string
  readonly totalSelfTime: number
  readonly percentage: number
  readonly hotFrames: ReadonlyArray<HotFrame>
}

/** @internal */
export interface DSTReport {
  readonly seed: number
  readonly passed: boolean
  readonly steps: number
  readonly totalProfiledTime: number
  readonly hotspots: ReadonlyArray<DeveloperHotspot>
  readonly topFunctions: ReadonlyArray<HotFrame & { readonly author: string }>
}

// ── Report Generation ────────────────────────────────────────────────────

/**
 * Generate a developer attribution report from annotated profile nodes.
 *
 * Groups self-time by developer, ranks by total CPU time, and extracts
 * the hottest individual functions.
 *
 * @internal
 */
export const generateReport = (
  annotatedNodes: ReadonlyArray<AnnotatedNode>,
  meta: { seed: number; passed: boolean; steps: number }
): DSTReport => {
  const totalTime = annotatedNodes.reduce((sum, n) => sum + n.selfTime, 0)

  // Group by author
  const byAuthor = new Map<string, {
    email: string
    totalTime: number
    frames: Array<HotFrame>
  }>()

  for (const node of annotatedNodes) {
    if (!node.blame || node.selfTime <= 0) continue

    const key = node.blame.author
    const existing = byAuthor.get(key) ?? {
      email: node.blame.authorEmail,
      totalTime: 0,
      frames: []
    }

    existing.totalTime += node.selfTime
    existing.frames.push({
      functionName: node.node.callFrame.functionName || "(anonymous)",
      file: node.resolved?.originalFile ?? node.node.callFrame.url,
      line: node.resolved?.originalLine ?? node.node.callFrame.lineNumber + 1,
      selfTime: node.selfTime,
      commitHash: node.blame.commitHash,
      commitMessage: node.blame.summary
    })

    byAuthor.set(key, existing)
  }

  const hotspots: Array<DeveloperHotspot> = [...byAuthor.entries()]
    .map(([author, data]) => ({
      author,
      email: data.email,
      totalSelfTime: data.totalTime,
      percentage: totalTime > 0 ? (data.totalTime / totalTime) * 100 : 0,
      hotFrames: data.frames
        .sort((a, b) => b.selfTime - a.selfTime)
        .slice(0, 20)
    }))
    .sort((a, b) => b.totalSelfTime - a.totalSelfTime)

  // Top functions across all developers
  const allFrames: Array<HotFrame & { author: string }> = []
  for (const spot of hotspots) {
    for (const frame of spot.hotFrames) {
      allFrames.push({ ...frame, author: spot.author })
    }
  }
  const topFunctions = allFrames
    .sort((a, b) => b.selfTime - a.selfTime)
    .slice(0, 50)

  return {
    seed: meta.seed,
    passed: meta.passed,
    steps: meta.steps,
    totalProfiledTime: totalTime,
    hotspots,
    topFunctions
  }
}

// ── Markdown Rendering ───────────────────────────────────────────────────

/**
 * Render a DSTReport as Markdown for human consumption.
 *
 * @internal
 */
export const toMarkdown = (report: DSTReport): string => {
  const lines: Array<string> = []

  lines.push(`# DST Report - Seed ${report.seed}`)
  lines.push("")
  lines.push(`- **Status**: ${report.passed ? "PASSED" : "FAILED"}`)
  lines.push(`- **Steps**: ${report.steps.toLocaleString()}`)
  lines.push(`- **Total Profiled Time**: ${(report.totalProfiledTime / 1000).toFixed(1)}ms`)
  lines.push("")

  // Developer Hotspots
  lines.push("## Developer Hotspots")
  lines.push("")
  lines.push("| Rank | Developer | Email | Self Time | % |")
  lines.push("|------|-----------|-------|-----------|---|")

  for (let i = 0; i < report.hotspots.length; i++) {
    const spot = report.hotspots[i]!
    lines.push(
      `| ${i + 1} | ${spot.author} | ${spot.email} | ${(spot.totalSelfTime / 1000).toFixed(1)}ms | ${spot.percentage.toFixed(1)}% |`
    )
  }
  lines.push("")

  // Top Functions
  lines.push("## Top Functions by Self Time")
  lines.push("")
  lines.push("| Function | File:Line | Author | Self Time | Commit |")
  lines.push("|----------|-----------|--------|-----------|--------|")

  for (const fn of report.topFunctions.slice(0, 30)) {
    const shortFile = fn.file.split("/").slice(-2).join("/")
    const shortCommit = fn.commitHash.slice(0, 8)
    lines.push(
      `| \`${fn.functionName}\` | ${shortFile}:${fn.line} | ${fn.author} | ${(fn.selfTime / 1000).toFixed(1)}ms | ${shortCommit} |`
    )
  }
  lines.push("")

  return lines.join("\n")
}

/**
 * Render a DSTReport as JSON for programmatic consumption (e.g., Vajra).
 *
 * @internal
 */
export const toJSON = (report: DSTReport): string =>
  JSON.stringify(report, null, 2)

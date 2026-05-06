/**
 * Source Map Resolver - Maps compiled JavaScript call frames back to
 * TypeScript source locations.
 *
 * @internal
 */

import type { CallFrame } from "./v8Profiler.js"

// ── Types ────────────────────────────────────────────────────────────────

/** @internal */
export interface ResolvedLocation {
  readonly originalFile: string
  readonly originalLine: number
  readonly originalColumn: number
  readonly generatedFile: string
  readonly generatedLine: number
}

// ── Source Map Resolution ────────────────────────────────────────────────

/** @internal */
export const resolveCallFrame = (callFrame: CallFrame): ResolvedLocation | null => {
  try {
    const filePath = callFrame.url.startsWith("file://")
      ? new URL(callFrame.url).pathname
      : callFrame.url

    if (!filePath || filePath === "" || filePath.startsWith("node:")) {
      return null
    }

    // Try node:module's findSourceMap (works for loaded modules)
    try {
      const { findSourceMap } = require("node:module") as typeof import("node:module")
      const sourceMap = findSourceMap(filePath)
      if (sourceMap) {
        const entry = sourceMap.findEntry(callFrame.lineNumber, callFrame.columnNumber)
        if (entry) {
          return {
            originalFile: (entry as any)[2] ?? filePath,
            originalLine: ((entry as any)[3] ?? callFrame.lineNumber) + 1,
            originalColumn: (entry as any)[4] ?? callFrame.columnNumber,
            generatedFile: filePath,
            generatedLine: callFrame.lineNumber + 1
          }
        }
      }
    } catch {
      // findSourceMap not available or failed
    }

    // Fallback: try reading the .map file directly
    try {
      const fs = require("node:fs") as typeof import("node:fs")
      const path = require("node:path") as typeof import("node:path")
      const mapPath = filePath + ".map"

      if (fs.existsSync(mapPath)) {
        const mapData = JSON.parse(fs.readFileSync(mapPath, "utf-8"))
        if (mapData.sources && mapData.sources.length > 0) {
          const sourceFile = path.resolve(path.dirname(filePath), mapData.sources[0])
          return {
            originalFile: sourceFile,
            originalLine: callFrame.lineNumber + 1,
            originalColumn: callFrame.columnNumber,
            generatedFile: filePath,
            generatedLine: callFrame.lineNumber + 1
          }
        }
      }
    } catch {
      // .map file not found or invalid
    }

    // If the file is already a .ts file, return it directly
    if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
      return {
        originalFile: filePath,
        originalLine: callFrame.lineNumber + 1,
        originalColumn: callFrame.columnNumber,
        generatedFile: filePath,
        generatedLine: callFrame.lineNumber + 1
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Resolve all call frames in a profile's nodes to their original
 * TypeScript source locations.
 *
 * @internal
 */
export const resolveProfileNodes = (
  nodes: ReadonlyArray<import("./v8Profiler.js").ProfileNode>
): Array<{ node: import("./v8Profiler.js").ProfileNode; resolved: ResolvedLocation | null }> =>
  nodes.map((node) => ({
    node,
    resolved: resolveCallFrame(node.callFrame)
  }))

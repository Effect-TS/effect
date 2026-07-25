/**
 * Pure text formatting for Workspace Analysis output.
 *
 * @since 4.0.0
 */
import type { ExportVariant, SourceProvenance } from "./Model.ts"
import type { WorkspaceAnalysis } from "./Workspace.ts"

const provenance = (value: SourceProvenance): string => {
  switch (value._tag) {
    case "Resolved":
      return `source ${value.sourcePath}`
    case "Missing":
      return `missing source for ${value.modulePath || "."}`
    case "Ambiguous":
      return `ambiguous source ${value.candidates.join(", ")}`
    case "NotRequired":
      return "source not required"
  }
}

const variantDetails = (variant: ExportVariant): string => {
  const details = [`${variant.resolutionMode} ${variant.format} ${variant.kind}`]
  if (variant.conditionPath.length > 0) details.push(`conditions ${variant.conditionPath.join(" > ")}`)
  if (variant.fallbackPositions.length > 0) details.push(`fallback ${variant.fallbackPositions.join(" > ")}`)
  return details.join("; ")
}

/**
 * Formats a Workspace Analysis as a readable package-surface inventory.
 *
 * @category formatting
 * @since 4.0.0
 */
export const format = (analysis: WorkspaceAnalysis): string => {
  const lines: Array<string> = []
  for (const pkg of analysis.workspace.packages) {
    lines.push(`${pkg.name}@${pkg.version} (${pkg.path})`)
    for (const entry of pkg.distribution.exports) {
      lines.push(`  ${entry.specifier} [${entry.rule}]`)
      for (const variant of entry.variants) {
        lines.push(`    ${variantDetails(variant)}`)
        lines.push(`      target ${variant.distributionPath}`)
        lines.push(`      ${provenance(variant.provenance)}`)
      }
    }
  }
  return lines.join("\n")
}

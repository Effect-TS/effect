/**
 * Pure Distribution Validation over a portable Workspace Analysis.
 *
 * @since 4.0.0
 */
import {
  flattenReachableTargets,
  resolutionConditions,
  selectPackageExport,
  validatePackageTarget,
  validatePatternCapture
} from "./internal/PackageExports.ts"
import { targetPathname } from "./internal/Paths.ts"
import {
  type DistributionIssue,
  DuplicatePackageTarget,
  EffectiveMainNoRootSurface,
  ExactJavaScriptTargetAmbiguousSource,
  ExactJavaScriptTargetMissingSource,
  type ExportTarget,
  type ExportVariant,
  IncompatiblePackageExport,
  InvalidPackageTarget,
  InvalidWildcardSubstitution,
  JavaScriptExportAmbiguousSource,
  JavaScriptExportMissingSource,
  type PackageExport,
  PackageExportNoUsableTarget,
  type PatternExportRule,
  type PublishablePackage,
  StalePatternRule,
  TargetEscapesPackage
} from "./Model.ts"
import type { WorkspaceAnalysis } from "./Workspace.ts"

const codeOrder: Record<DistributionIssue["code"], number> = {
  "stale-pattern-rule": 0,
  "exact-javascript-target-missing-source": 1,
  "exact-javascript-target-ambiguous-source": 2,
  "javascript-export-missing-source": 3,
  "javascript-export-ambiguous-source": 4,
  "incompatible-package-export": 5,
  "duplicate-package-target": 6,
  "invalid-package-target": 7,
  "target-escapes-package": 8,
  "invalid-wildcard-substitution": 9,
  "package-export-no-usable-target": 10,
  "effective-main-no-root-surface": 11
}

const sameArray = <A>(a: ReadonlyArray<A>, b: ReadonlyArray<A>): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index])

const compareString = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0

const targetPath = (packagePath: string, target: string): string | undefined =>
  target.startsWith("./") ? `${packagePath}/${targetPathname(target)}` : undefined

const selectedRule = (
  pkg: PublishablePackage,
  entry: PackageExport,
  variant: ExportVariant
) => {
  const modes = variant.resolutionMode === "Any" ? ["Import", "Require"] as const : [variant.resolutionMode] as const
  for (const mode of modes) {
    const selected = selectPackageExport(
      pkg.distribution.rules,
      entry.subpath,
      resolutionConditions(variant.conditionPath, mode)
    )
    if (selected._tag === "Resolved") return selected
  }
  return selectPackageExport(pkg.distribution.rules, entry.subpath, new Set())
}

const selectedVariant = (pkg: PublishablePackage, entry: PackageExport, variant: ExportVariant) => {
  const selected = selectedRule(pkg, entry, variant)
  const referencedRule = pkg.distribution.rules.find((rule) => rule.subpath === entry.rule)
  return selected._tag === "Resolved" &&
      selected.rule === referencedRule &&
      targetPath(pkg.path, selected.target) === variant.distributionPath &&
      sameArray(selected.conditionPath, variant.conditionPath) &&
      sameArray(selected.fallbackPositions, variant.fallbackPositions)
    ? selected
    : undefined
}

const targetLeaves = (target: ExportTarget): ReadonlyArray<string> => {
  switch (target._tag) {
    case "Target":
      return [target.value]
    case "Null":
      return []
    case "Conditions":
      return target.entries.flatMap((entry) => targetLeaves(entry.target))
    case "Fallback":
      return target.targets.flatMap(targetLeaves)
  }
}

const patternCapture = (pattern: string, subpath: string): string | undefined => {
  const star = pattern.indexOf("*")
  if (star === -1 || pattern.lastIndexOf("*") !== star) return undefined
  const prefix = pattern.slice(0, star)
  const suffix = pattern.slice(star + 1)
  if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix) || subpath.length <= prefix.length + suffix.length) {
    return undefined
  }
  return subpath.slice(prefix.length, subpath.length - suffix.length)
}

const issueContext = (issue: DistributionIssue): string => JSON.stringify(issue)

const provenanceIdentity = (variant: ExportVariant): string => JSON.stringify(variant.provenance)

const materializationIdentity = (variant: ExportVariant): string =>
  JSON.stringify([variant.resolutionMode, variant.conditionPath, variant.fallbackPositions])

const materializationTarget = (variant: ExportVariant): string =>
  JSON.stringify([variant.distributionPath, provenanceIdentity(variant)])

const ruleLabel = (pkg: PublishablePackage, entry: PackageExport, variant: ExportVariant): string => {
  const selected = selectedRule(pkg, entry, variant)
  return selected.rule?.subpath ?? entry.rule
}

const validateIncompatibleExports = (
  pkg: PublishablePackage,
  add: (issue: DistributionIssue) => void
): void => {
  const bySpecifier = new Map<string, Array<{ readonly entry: PackageExport; readonly variant: ExportVariant }>>()
  for (const entry of pkg.distribution.exports) {
    const materializations = bySpecifier.get(entry.specifier)
    const additions = entry.variants.map((variant) => ({ entry, variant }))
    if (materializations === undefined) bySpecifier.set(entry.specifier, additions)
    else materializations.push(...additions)
  }

  for (const [specifier, materializations] of bySpecifier) {
    const bySelection = new Map<string, Array<{ readonly entry: PackageExport; readonly variant: ExportVariant }>>()
    for (const materialization of materializations) {
      const identity = materializationIdentity(materialization.variant)
      const selected = bySelection.get(identity)
      if (selected === undefined) bySelection.set(identity, [materialization])
      else selected.push(materialization)
    }
    const conflicting = [...bySelection.values()].flatMap((selected) =>
      new Set(selected.map(({ variant }) => materializationTarget(variant))).size > 1 ? selected : []
    )
    if (conflicting.length > 1) {
      add(
        new IncompatiblePackageExport({
          code: "incompatible-package-export",
          packageName: pkg.name,
          packagePath: pkg.path,
          specifier,
          rules: conflicting.map(({ entry, variant }) => ruleLabel(pkg, entry, variant)).sort()
        })
      )
    }
  }
}

const validateDuplicateTargets = (
  pkg: PublishablePackage,
  add: (issue: DistributionIssue) => void
): void => {
  const byDistributionPath = new Map<string, Set<string>>()
  for (const entry of pkg.distribution.exports) {
    for (const variant of entry.variants) {
      const specifiers = byDistributionPath.get(variant.distributionPath)
      if (specifiers === undefined) byDistributionPath.set(variant.distributionPath, new Set([entry.specifier]))
      else specifiers.add(entry.specifier)
    }
  }

  for (const [distributionPath, specifiers] of byDistributionPath) {
    if (specifiers.size < 2) continue
    add(
      new DuplicatePackageTarget({
        code: "duplicate-package-target",
        packageName: pkg.name,
        packagePath: pkg.path,
        distributionPath,
        specifiers: [...specifiers].sort()
      })
    )
  }
}

const validatePattern = (
  pkg: PublishablePackage,
  rule: PatternExportRule,
  add: (issue: DistributionIssue) => void
): void => {
  const stars = rule.subpath.split("*").length - 1
  const formValidation = stars === 1 ? validatePackageTarget(rule.subpath.replace("*", "validation")) : undefined
  const formReason = stars !== 1
    ? "pattern rule must contain exactly one '*'"
    : formValidation?._tag === "Valid"
    ? undefined
    : `invalid pattern rule: ${formValidation?.reason ?? "invalid package subpath"}`
  if (formReason !== undefined) {
    add(
      new InvalidWildcardSubstitution({
        code: "invalid-wildcard-substitution",
        packageName: pkg.name,
        packagePath: pkg.path,
        rule: rule.subpath,
        substitution: "",
        reason: formReason
      })
    )
  }

  for (const entry of pkg.distribution.exports) {
    const capture = patternCapture(rule.subpath, entry.subpath)
    if (capture === undefined) continue
    const captureValidation = validatePatternCapture(capture)
    const firstVariant = entry.variants[0]
    const selected = firstVariant === undefined
      ? selectPackageExport(pkg.distribution.rules, entry.subpath, new Set())
      : selectedRule(pkg, entry, firstVariant)
    if (captureValidation._tag === "Invalid" && selected.rule === rule) {
      add(
        new InvalidWildcardSubstitution({
          code: "invalid-wildcard-substitution",
          packageName: pkg.name,
          packagePath: pkg.path,
          rule: rule.subpath,
          substitution: capture,
          reason: captureValidation.reason
        })
      )
    }
  }
}

const validatePackage = (pkg: PublishablePackage, add: (issue: DistributionIssue) => void): void => {
  if (
    pkg.distribution.exportsMode === "Legacy" && pkg.distribution.main !== undefined &&
    !pkg.distribution.exports.some((entry) => entry.subpath === ".")
  ) {
    add(
      new EffectiveMainNoRootSurface({
        code: "effective-main-no-root-surface",
        packageName: pkg.name,
        packagePath: pkg.path,
        main: pkg.distribution.main
      })
    )
  }

  for (const rule of pkg.distribution.rules) {
    if (rule._tag === "PatternExportRule") {
      const materialized = pkg.distribution.exports.some((entry) =>
        entry.variants.some((variant) => selectedVariant(pkg, entry, variant)?.rule === rule)
      )
      if (flattenReachableTargets(rule.target).length > 0 && !materialized) {
        add(
          new StalePatternRule({
            code: "stale-pattern-rule",
            packageName: pkg.name,
            packagePath: pkg.path,
            rule: rule.subpath
          })
        )
      }
      validatePattern(pkg, rule, add)
    }

    for (const target of targetLeaves(rule.target)) {
      const targetValidation = validatePackageTarget(target)
      if (targetValidation._tag === "Invalid") {
        add(
          new InvalidPackageTarget({
            code: "invalid-package-target",
            packageName: pkg.name,
            packagePath: pkg.path,
            rule: rule.subpath,
            target,
            reason: targetValidation.reason
          })
        )
      } else if (targetValidation._tag === "Escape") {
        add(
          new TargetEscapesPackage({
            code: "target-escapes-package",
            packageName: pkg.name,
            packagePath: pkg.path,
            rule: rule.subpath,
            target
          })
        )
      }
    }
  }

  for (const entry of pkg.distribution.exports) {
    const usable = pkg.distribution.exportsMode === "Legacy"
      ? (entry.rule === "main" || entry.rule === "legacy") &&
        (entry.variants.length > 0 || (entry.declarations?.length ?? 0) > 0)
      : (entry.declarations?.length ?? 0) > 0 ||
        entry.variants.some((variant) => selectedVariant(pkg, entry, variant) !== undefined)
    if (!usable) {
      add(
        new PackageExportNoUsableTarget({
          code: "package-export-no-usable-target",
          packageName: pkg.name,
          packagePath: pkg.path,
          specifier: entry.specifier
        })
      )
    }
    for (const variant of entry.variants) {
      if (variant.kind !== "JavaScript" || variant.provenance._tag === "Resolved") continue
      const selected = pkg.distribution.exportsMode === "Exports" ? selectedVariant(pkg, entry, variant) : undefined
      if (selected?.rule._tag === "ExactExportRule") {
        if (variant.provenance._tag === "Missing") {
          add(
            new ExactJavaScriptTargetMissingSource({
              code: "exact-javascript-target-missing-source",
              packageName: pkg.name,
              packagePath: pkg.path,
              rule: selected.rule.subpath,
              target: selected.target,
              modulePath: variant.provenance.modulePath
            })
          )
        } else {
          add(
            new ExactJavaScriptTargetAmbiguousSource({
              code: "exact-javascript-target-ambiguous-source",
              packageName: pkg.name,
              packagePath: pkg.path,
              rule: selected.rule.subpath,
              target: selected.target,
              modulePath: variant.provenance.modulePath,
              candidates: [...variant.provenance.candidates]
            })
          )
        }
      } else if (variant.provenance._tag === "Missing") {
        add(
          new JavaScriptExportMissingSource({
            code: "javascript-export-missing-source",
            packageName: pkg.name,
            packagePath: pkg.path,
            specifier: entry.specifier,
            distributionPath: variant.distributionPath,
            modulePath: variant.provenance.modulePath
          })
        )
      } else {
        add(
          new JavaScriptExportAmbiguousSource({
            code: "javascript-export-ambiguous-source",
            packageName: pkg.name,
            packagePath: pkg.path,
            specifier: entry.specifier,
            distributionPath: variant.distributionPath,
            modulePath: variant.provenance.modulePath,
            candidates: [...variant.provenance.candidates]
          })
        )
      }
    }
  }

  validateIncompatibleExports(pkg, add)
  validateDuplicateTargets(pkg, add)
}

/**
 * Validates an analyzed Workspace for distribution without reading manifests or files.
 *
 * @category validation
 * @since 4.0.0
 */
export const validate = (analysis: WorkspaceAnalysis): ReadonlyArray<DistributionIssue> => {
  const issues = new Map<string, DistributionIssue>()
  const add = (issue: DistributionIssue): void => {
    const key = issueContext(issue)
    if (!issues.has(key)) issues.set(key, issue)
  }
  for (const pkg of analysis.workspace.packages) validatePackage(pkg, add)
  return [...issues.values()].sort((a, b) =>
    compareString(a.packagePath, b.packagePath) ||
    codeOrder[a.code] - codeOrder[b.code] ||
    compareString(issueContext(a), issueContext(b))
  )
}

/**
 * Portable Schema models for workspace analysis and distribution validation.
 *
 * @since 4.0.0
 */
import * as Schema from "effect/Schema"

const isPortablePath = (path: string): boolean => {
  if (path.length === 0 || path.startsWith("/") || /^[A-Za-z]:\//.test(path) || path.includes("\\")) {
    return false
  }
  return path.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..")
}

/**
 * A normalized POSIX path relative to the Workspace Root.
 *
 * @category schemas
 * @since 4.0.0
 */
export const PortablePath = Schema.String.check(Schema.makeFilter(isPortablePath, {
  expected: "a normalized POSIX path relative to the Workspace Root"
}))

/**
 * A normalized Module Path relative to a configured source or distribution root.
 *
 * @category schemas
 * @since 4.0.0
 */
export const ModulePath = Schema.String.check(Schema.makeFilter(
  (path) => path.length === 0 || isPortablePath(path),
  { expected: "a normalized Module Path relative to a configured root" }
))

const PackageSubpath = Schema.String.check(Schema.makeFilter(
  (subpath) => subpath === "." || (subpath.startsWith("./") && subpath.length > 2),
  { expected: "\".\" or a package subpath beginning with \"./\"" }
))
const ExactPackageSubpath = PackageSubpath.check(Schema.makeFilter(
  (subpath) => !subpath.includes("*"),
  { expected: "an exact package subpath without a wildcard" }
))
const PatternPackageSubpath = PackageSubpath.check(Schema.makeFilter(
  (subpath) => subpath !== "." && subpath.includes("*"),
  { expected: "a package subpath containing a wildcard" }
))

const PackageExportRule = Schema.Union([PackageSubpath, Schema.Literals(["main", "legacy"])])

const NonNegativeInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))

/**
 * A package-manifest export target leaf.
 *
 * @category models
 * @since 4.0.0
 */
export class Target extends Schema.TaggedClass<Target>()("Target", {
  value: Schema.String
}) {}

/**
 * A package-manifest `null` target.
 *
 * @category models
 * @since 4.0.0
 */
export class NullTarget extends Schema.TaggedClass<NullTarget>()("Null", {}) {}

/**
 * One condition and its recursively nested export target.
 *
 * @category models
 * @since 4.0.0
 */
export class ExportCondition extends Schema.Class<ExportCondition>("ExportCondition")({
  condition: Schema.String,
  target: Schema.suspend((): Schema.Codec<ExportTarget> => ExportTarget)
}) {}

/**
 * An ordered conditional export target map.
 *
 * @category models
 * @since 4.0.0
 */
export class ConditionsTarget extends Schema.TaggedClass<ConditionsTarget>()("Conditions", {
  entries: Schema.Array(ExportCondition)
}) {}

/**
 * An ordered export target fallback array.
 *
 * @category models
 * @since 4.0.0
 */
export class FallbackTarget extends Schema.TaggedClass<FallbackTarget>()("Fallback", {
  targets: Schema.Array(Schema.suspend((): Schema.Codec<ExportTarget> => ExportTarget))
}) {}

/**
 * The lossless recursive target tree retained from a package export rule.
 *
 * @category schemas
 * @since 4.0.0
 */
export const ExportTarget = Schema.Union([Target, NullTarget, ConditionsTarget, FallbackTarget])

/**
 * The decoded type of {@link ExportTarget}.
 *
 * @category models
 * @since 4.0.0
 */
export type ExportTarget = Target | NullTarget | ConditionsTarget | FallbackTarget

/**
 * An exact package export rule.
 *
 * @category models
 * @since 4.0.0
 */
export class ExactExportRule extends Schema.TaggedClass<ExactExportRule>()("ExactExportRule", {
  subpath: ExactPackageSubpath,
  target: ExportTarget
}) {}

/**
 * A wildcard package export rule.
 *
 * @category models
 * @since 4.0.0
 */
export class PatternExportRule extends Schema.TaggedClass<PatternExportRule>()("PatternExportRule", {
  subpath: PatternPackageSubpath,
  target: ExportTarget
}) {}

/**
 * A package export rule in original manifest declaration order.
 *
 * @category schemas
 * @since 4.0.0
 */
export const ExportRule = Schema.Union([ExactExportRule, PatternExportRule])

/**
 * The decoded type of {@link ExportRule}.
 *
 * @category models
 * @since 4.0.0
 */
export type ExportRule = ExactExportRule | PatternExportRule

/**
 * Source Provenance resolved to exactly one source path.
 *
 * @category models
 * @since 4.0.0
 */
export class Resolved extends Schema.TaggedClass<Resolved>()("Resolved", {
  sourcePath: PortablePath
}) {}

/**
 * Source Provenance with no source for the required Module Path.
 *
 * @category models
 * @since 4.0.0
 */
export class Missing extends Schema.TaggedClass<Missing>()("Missing", {
  modulePath: ModulePath
}) {}

/**
 * Source Provenance with multiple sources for the required Module Path.
 *
 * @category models
 * @since 4.0.0
 */
export class Ambiguous extends Schema.TaggedClass<Ambiguous>()("Ambiguous", {
  modulePath: ModulePath,
  candidates: Schema.Array(PortablePath).check(Schema.isMinLength(2))
}) {}

/**
 * Source Provenance for which source correspondence is unnecessary.
 *
 * @category models
 * @since 4.0.0
 */
export class NotRequired extends Schema.TaggedClass<NotRequired>()("NotRequired", {}) {}

/**
 * The Source Provenance of a concrete Export Variant.
 *
 * @category schemas
 * @since 4.0.0
 */
export const SourceProvenance = Schema.Union([Resolved, Missing, Ambiguous, NotRequired])

/**
 * The decoded type of {@link SourceProvenance}.
 *
 * @category models
 * @since 4.0.0
 */
export type SourceProvenance = Resolved | Missing | Ambiguous | NotRequired

/**
 * A JavaScript target variant requiring Source Provenance.
 *
 * @category models
 * @since 4.0.0
 */
export class JavaScriptExportVariant extends Schema.Class<JavaScriptExportVariant>("JavaScriptExportVariant")({
  distributionPath: PortablePath,
  kind: Schema.Literal("JavaScript"),
  resolutionMode: Schema.Literals(["Import", "Require", "Any"]),
  format: Schema.Literals(["Module", "CommonJS", "Json", "Native", "Unknown"]),
  conditionPath: Schema.Array(Schema.String),
  fallbackPositions: Schema.Array(NonNegativeInt),
  provenance: Schema.Union([Resolved, Missing, Ambiguous])
}) {}

/**
 * A Resource target variant whose Source Provenance is optional.
 *
 * @category models
 * @since 4.0.0
 */
export class ResourceExportVariant extends Schema.Class<ResourceExportVariant>("ResourceExportVariant")({
  distributionPath: PortablePath,
  kind: Schema.Literal("Resource"),
  resolutionMode: Schema.Literals(["Import", "Require", "Any"]),
  format: Schema.Literals(["Module", "CommonJS", "Json", "Native", "Unknown"]),
  conditionPath: Schema.Array(Schema.String),
  fallbackPositions: Schema.Array(NonNegativeInt),
  provenance: Schema.Union([Resolved, Ambiguous, NotRequired])
}) {}

/**
 * One flattened target variant of a concrete Package Export.
 *
 * @category schemas
 * @since 4.0.0
 */
export const ExportVariant = Schema.Union([JavaScriptExportVariant, ResourceExportVariant])

/**
 * The decoded type of {@link ExportVariant}.
 *
 * @category models
 * @since 4.0.0
 */
export type ExportVariant = JavaScriptExportVariant | ResourceExportVariant

/**
 * A declaration target associated with a public package specifier.
 *
 * @category models
 * @since 4.0.0
 */
export class DeclarationTarget extends Schema.Class<DeclarationTarget>("DeclarationTarget")({
  distributionPath: PortablePath,
  conditionPath: Schema.Array(Schema.String),
  fallbackPositions: Schema.Array(NonNegativeInt)
}) {}

/**
 * A concrete consumer-facing Package Export.
 *
 * @category models
 * @since 4.0.0
 */
export class PackageExport extends Schema.Class<PackageExport>("PackageExport")({
  specifier: Schema.NonEmptyString,
  subpath: PackageSubpath,
  rule: PackageExportRule,
  variants: Schema.Array(ExportVariant),
  declarations: Schema.optional(Schema.Array(DeclarationTarget))
}) {}

/**
 * The Distribution Manifest rules and their concrete Package Exports.
 *
 * @category models
 * @since 4.0.0
 */
export class Distribution extends Schema.Class<Distribution>("Distribution")({
  packageType: Schema.Literals(["Module", "CommonJS", "Unspecified"]),
  main: Schema.optional(Schema.String),
  exportsMode: Schema.Literals(["Exports", "Legacy"]),
  rules: Schema.Array(ExportRule),
  exports: Schema.Array(PackageExport)
}) {}

/**
 * A Publishable Package selected by the authoritative workspace manifest.
 *
 * @category models
 * @since 4.0.0
 */
export class PublishablePackage extends Schema.Class<PublishablePackage>("PublishablePackage")({
  name: Schema.NonEmptyString,
  version: Schema.NonEmptyString,
  path: PortablePath,
  distribution: Distribution
}) {}

/**
 * The portable semantic model produced by Workspace Analysis.
 *
 * @category models
 * @since 4.0.0
 */
export class Workspace extends Schema.Class<Workspace>("Workspace")({
  packages: Schema.Array(PublishablePackage)
}) {}

/**
 * Failure to establish the Workspace Root from the requested directory.
 *
 * @category errors
 * @since 4.0.0
 */
export class WorkspaceRootNotFound extends Schema.TaggedClass<WorkspaceRootNotFound>()("WorkspaceRootNotFound", {
  cwd: Schema.String
}) {}

/**
 * Failure to establish authoritative workspace membership.
 *
 * @category errors
 * @since 4.0.0
 */
export class WorkspaceMembershipUnavailable
  extends Schema.TaggedClass<WorkspaceMembershipUnavailable>()("WorkspaceMembershipUnavailable", {
    root: Schema.String,
    message: Schema.String
  })
{}

/**
 * Failure to read or parse a required package manifest.
 *
 * @category errors
 * @since 4.0.0
 */
export class PackageManifestUnavailable
  extends Schema.TaggedClass<PackageManifestUnavailable>()("PackageManifestUnavailable", {
    packagePath: PortablePath,
    message: Schema.String
  })
{}

/**
 * A Workspace Package without a valid non-empty name.
 *
 * @category errors
 * @since 4.0.0
 */
export class InvalidPackageName extends Schema.TaggedClass<InvalidPackageName>()("InvalidPackageName", {
  packagePath: PortablePath
}) {}

/**
 * A package name assigned to multiple Workspace Packages.
 *
 * @category errors
 * @since 4.0.0
 */
export class DuplicatePackageName extends Schema.TaggedClass<DuplicatePackageName>()("DuplicatePackageName", {
  name: Schema.NonEmptyString,
  packagePaths: Schema.Array(PortablePath).check(Schema.isMinLength(2))
}) {}

/**
 * A Publishable Package without a valid non-empty version.
 *
 * @category errors
 * @since 4.0.0
 */
export class InvalidPackageVersion extends Schema.TaggedClass<InvalidPackageVersion>()("InvalidPackageVersion", {
  name: Schema.NonEmptyString,
  packagePath: PortablePath
}) {}

/**
 * An effective exports value whose tree cannot be structurally represented.
 *
 * @category errors
 * @since 4.0.0
 */
export class MalformedExports extends Schema.TaggedClass<MalformedExports>()("MalformedExports", {
  name: Schema.NonEmptyString,
  packagePath: PortablePath,
  message: Schema.String
}) {}

/**
 * A configured source or distribution directory that is not package-relative.
 *
 * @category errors
 * @since 4.0.0
 */
export class InvalidWorkspaceDirectory
  extends Schema.TaggedClass<InvalidWorkspaceDirectory>()("InvalidWorkspaceDirectory", {
    option: Schema.Literals(["sourceDirectory", "distributionDirectory"]),
    value: Schema.String
  })
{}

/**
 * A structural diagnostic accumulated during Workspace Analysis.
 *
 * @category schemas
 * @since 4.0.0
 */
export const StructuralDiagnostic = Schema.Union([
  WorkspaceRootNotFound,
  WorkspaceMembershipUnavailable,
  PackageManifestUnavailable,
  InvalidPackageName,
  DuplicatePackageName,
  InvalidPackageVersion,
  MalformedExports,
  InvalidWorkspaceDirectory
])

/**
 * The decoded type of {@link StructuralDiagnostic}.
 *
 * @category errors
 * @since 4.0.0
 */
export type StructuralDiagnostic =
  | WorkspaceRootNotFound
  | WorkspaceMembershipUnavailable
  | PackageManifestUnavailable
  | InvalidPackageName
  | DuplicatePackageName
  | InvalidPackageVersion
  | MalformedExports
  | InvalidWorkspaceDirectory

/**
 * Atomic Workspace Analysis failure containing all independent diagnostics.
 *
 * @category errors
 * @since 4.0.0
 */
export class WorkspaceAnalysisError
  extends Schema.TaggedErrorClass<WorkspaceAnalysisError>()("WorkspaceAnalysisError", {
    diagnostics: Schema.Array(StructuralDiagnostic).check(Schema.isMinLength(1))
  })
{}

const PackageContext = {
  packageName: Schema.NonEmptyString,
  packagePath: PortablePath
} as const

const SortedPackageSpecifiers = Schema.Array(Schema.NonEmptyString).check(
  Schema.isMinLength(2),
  Schema.makeFilter(
    (specifiers) => specifiers.every((specifier, index) => index === 0 || specifiers[index - 1]! < specifier),
    { expected: "sorted distinct package specifiers" }
  )
)

/**
 * A positive wildcard Export Rule that materializes no Package Exports.
 *
 * @category errors
 * @since 4.0.0
 */
export class StalePatternRule extends Schema.TaggedClass<StalePatternRule>()("StalePatternRule", {
  code: Schema.Literal("stale-pattern-rule"),
  ...PackageContext,
  rule: Schema.String
}) {}

/**
 * An exact JavaScript target with Missing Source Provenance.
 *
 * @category errors
 * @since 4.0.0
 */
export class ExactJavaScriptTargetMissingSource
  extends Schema.TaggedClass<ExactJavaScriptTargetMissingSource>()("ExactJavaScriptTargetMissingSource", {
    code: Schema.Literal("exact-javascript-target-missing-source"),
    ...PackageContext,
    rule: Schema.String,
    target: Schema.String,
    modulePath: PortablePath
  })
{}

/**
 * An exact JavaScript target with Ambiguous Source Provenance.
 *
 * @category errors
 * @since 4.0.0
 */
export class ExactJavaScriptTargetAmbiguousSource
  extends Schema.TaggedClass<ExactJavaScriptTargetAmbiguousSource>()("ExactJavaScriptTargetAmbiguousSource", {
    code: Schema.Literal("exact-javascript-target-ambiguous-source"),
    ...PackageContext,
    rule: Schema.String,
    target: Schema.String,
    modulePath: PortablePath,
    candidates: Schema.Array(PortablePath).check(Schema.isMinLength(2))
  })
{}

/**
 * A concrete JavaScript Export Variant with Missing Source Provenance.
 *
 * @category errors
 * @since 4.0.0
 */
export class JavaScriptExportMissingSource
  extends Schema.TaggedClass<JavaScriptExportMissingSource>()("JavaScriptExportMissingSource", {
    code: Schema.Literal("javascript-export-missing-source"),
    ...PackageContext,
    specifier: Schema.NonEmptyString,
    distributionPath: PortablePath,
    modulePath: PortablePath
  })
{}

/**
 * A concrete JavaScript Export Variant with Ambiguous Source Provenance.
 *
 * @category errors
 * @since 4.0.0
 */
export class JavaScriptExportAmbiguousSource
  extends Schema.TaggedClass<JavaScriptExportAmbiguousSource>()("JavaScriptExportAmbiguousSource", {
    code: Schema.Literal("javascript-export-ambiguous-source"),
    ...PackageContext,
    specifier: Schema.NonEmptyString,
    distributionPath: PortablePath,
    modulePath: PortablePath,
    candidates: Schema.Array(PortablePath).check(Schema.isMinLength(2))
  })
{}

/**
 * Incompatible materializations of one consumer specifier.
 *
 * @category errors
 * @since 4.0.0
 */
export class IncompatiblePackageExport
  extends Schema.TaggedClass<IncompatiblePackageExport>()("IncompatiblePackageExport", {
    code: Schema.Literal("incompatible-package-export"),
    ...PackageContext,
    specifier: Schema.NonEmptyString,
    rules: Schema.Array(Schema.String).check(Schema.isMinLength(2))
  })
{}

/**
 * Multiple consumer specifiers that materialize the same distribution target.
 *
 * @category errors
 * @since 4.0.0
 */
export class DuplicatePackageTarget extends Schema.TaggedClass<DuplicatePackageTarget>()("DuplicatePackageTarget", {
  code: Schema.Literal("duplicate-package-target"),
  ...PackageContext,
  distributionPath: PortablePath,
  specifiers: SortedPackageSpecifiers
}) {}

/**
 * A target that violates Node.js package-target rules.
 *
 * @category errors
 * @since 4.0.0
 */
export class InvalidPackageTarget extends Schema.TaggedClass<InvalidPackageTarget>()("InvalidPackageTarget", {
  code: Schema.Literal("invalid-package-target"),
  ...PackageContext,
  rule: Schema.String,
  target: Schema.String,
  reason: Schema.NonEmptyString
}) {}

/**
 * A target that escapes its Workspace Package.
 *
 * @category errors
 * @since 4.0.0
 */
export class TargetEscapesPackage extends Schema.TaggedClass<TargetEscapesPackage>()("TargetEscapesPackage", {
  code: Schema.Literal("target-escapes-package"),
  ...PackageContext,
  rule: Schema.String,
  target: Schema.String
}) {}

/**
 * A wildcard substitution that cannot produce a valid subpath or target.
 *
 * @category errors
 * @since 4.0.0
 */
export class InvalidWildcardSubstitution
  extends Schema.TaggedClass<InvalidWildcardSubstitution>()("InvalidWildcardSubstitution", {
    code: Schema.Literal("invalid-wildcard-substitution"),
    ...PackageContext,
    rule: Schema.String,
    substitution: Schema.String,
    reason: Schema.NonEmptyString
  })
{}

/**
 * A concrete Package Export with no usable target variant.
 *
 * @category errors
 * @since 4.0.0
 */
export class PackageExportNoUsableTarget
  extends Schema.TaggedClass<PackageExportNoUsableTarget>()("PackageExportNoUsableTarget", {
    code: Schema.Literal("package-export-no-usable-target"),
    ...PackageContext,
    specifier: Schema.NonEmptyString
  })
{}

/**
 * A declared effective main for which legacy resolution finds no root target.
 *
 * @category errors
 * @since 4.0.0
 */
export class EffectiveMainNoRootSurface
  extends Schema.TaggedClass<EffectiveMainNoRootSurface>()("EffectiveMainNoRootSurface", {
    code: Schema.Literal("effective-main-no-root-surface"),
    ...PackageContext,
    main: Schema.String
  })
{}

/**
 * A deterministic issue returned by Distribution Validation.
 *
 * @category schemas
 * @since 4.0.0
 */
export const DistributionIssue = Schema.Union([
  StalePatternRule,
  ExactJavaScriptTargetMissingSource,
  ExactJavaScriptTargetAmbiguousSource,
  JavaScriptExportMissingSource,
  JavaScriptExportAmbiguousSource,
  IncompatiblePackageExport,
  DuplicatePackageTarget,
  InvalidPackageTarget,
  TargetEscapesPackage,
  InvalidWildcardSubstitution,
  PackageExportNoUsableTarget,
  EffectiveMainNoRootSurface
])

/**
 * The decoded type of {@link DistributionIssue}.
 *
 * @category errors
 * @since 4.0.0
 */
export type DistributionIssue =
  | StalePatternRule
  | ExactJavaScriptTargetMissingSource
  | ExactJavaScriptTargetAmbiguousSource
  | JavaScriptExportMissingSource
  | JavaScriptExportAmbiguousSource
  | IncompatiblePackageExport
  | DuplicatePackageTarget
  | InvalidPackageTarget
  | TargetEscapesPackage
  | InvalidWildcardSubstitution
  | PackageExportNoUsableTarget
  | EffectiveMainNoRootSurface

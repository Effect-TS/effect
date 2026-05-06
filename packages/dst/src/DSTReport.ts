/**
 * DST Report - Developer attribution reports from profiling data.
 *
 * Generates reports that correlate CPU time hotspots with the developer
 * who wrote the code, using V8 profiles + source maps + git blame.
 *
 * @since 0.1.0
 */

export type {
  /**
   * A developer's hotspot in the profile.
   *
   * @since 0.1.0
   * @category models
   */
  DeveloperHotspot,
  /**
   * A complete DST report with developer attribution.
   *
   * @since 0.1.0
   * @category models
   */
  DSTReport,
  /**
   * A single hot function frame.
   *
   * @since 0.1.0
   * @category models
   */
  HotFrame
} from "./internal/reportGenerator.js"

export {
  /**
   * Generate a developer attribution report from annotated profile nodes.
   *
   * @since 0.1.0
   * @category reports
   */
  generateReport,
  /**
   * Render a DSTReport as JSON for programmatic consumption.
   *
   * @since 0.1.0
   * @category rendering
   */
  toJSON,
  /**
   * Render a DSTReport as Markdown.
   *
   * @since 0.1.0
   * @category rendering
   */
  toMarkdown
} from "./internal/reportGenerator.js"

export type {
  /**
   * An annotated profile node with source map resolution and git blame.
   *
   * @since 0.1.0
   * @category models
   */
  AnnotatedNode
} from "./internal/profileAnnotator.js"

export {
  /**
   * Annotate all profile nodes with source maps and git blame.
   *
   * @since 0.1.0
   * @category annotation
   */
  annotateProfile
} from "./internal/profileAnnotator.js"

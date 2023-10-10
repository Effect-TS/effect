/**
 * The abstract data type `Doc<A>` represents prettified documents that have
 * been annotated with data of type `A`.
 *
 * More specifically, a value of type `Doc` represents a non-empty set of
 * possible layouts for a given document. The layout algorithms select one of
 * these possibilities, taking into account variables such as the width of the
 * document.
 *
 * The annotation is an arbitrary piece of data associated with (part of) a
 * document. Annotations may be used by rendering algorithms to display
 * documents differently by providing information such as:
 * - color information (e.g., when rendering to the terminal)
 * - mouseover text (e.g., when rendering to rich HTML)
 * - whether to show something or not (to allow simple or detailed versions)
 *
 * @since 1.0.0
 */
export * as Doc from "@effect/printer/Doc"

/**
 * @since 1.0.0
 */
export * as DocStream from "@effect/printer/DocStream"

/**
 * @since 1.0.0
 */
export * as DocTree from "@effect/printer/DocTree"

/**
 * @since 1.0.0
 */
export * as Flatten from "@effect/printer/Flatten"

/**
 * @since 1.0.0
 */
export * as Layout from "@effect/printer/Layout"

/**
 * @since 1.0.0
 */
export * as Optimize from "@effect/printer/Optimize"

/**
 * @since 1.0.0
 */
export * as PageWidth from "@effect/printer/PageWidth"

/**
 * @since 1.0.0
 */
export * as Render from "@effect/printer/Render"

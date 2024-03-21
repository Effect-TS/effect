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
export * as Doc from "./Doc.js"

/**
 * @since 1.0.0
 */
export * as DocStream from "./DocStream.js"

/**
 * @since 1.0.0
 */
export * as DocTree from "./DocTree.js"

/**
 * @since 1.0.0
 */
export * as Flatten from "./Flatten.js"

/**
 * @since 1.0.0
 */
export * as Layout from "./Layout.js"

/**
 * @since 1.0.0
 */
export * as Optimize from "./Optimize.js"

/**
 * @since 1.0.0
 */
export * as PageWidth from "./PageWidth.js"

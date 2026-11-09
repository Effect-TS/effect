/**
 * Locators over a minimal structural tree, so one query works on a story's
 * view value and on `TestHost`'s rendered tree alike.
 *
 * A node is anything with some of `tag`, `attrs`, `text` and `children`:
 * an element has a `tag`, a text node has `text`. Locators match elements.
 * `text` matches the innermost elements whose text contains the string,
 * `attr` and `testId` match by attribute, and `inside` narrows a locator to
 * the subtree of another.
 *
 * **Example** (Finding a row's button)
 *
 * ```ts import.meta.vitest
 * import { Query } from "effect/ui/testing"
 *
 * const row = (id: string) => ({
 *   tag: "li",
 *   attrs: { "data-testid": id },
 *   children: [{ tag: "button", children: [{ text: "Save" }] }]
 * })
 * const tree = { tag: "ul", children: [row("row-1"), row("row-2")] }
 *
 * const button = Query.get(tree, Query.inside(Query.testId("row-2"), Query.text("Save")))
 * console.log(button === tree.children[1].children[0]) // true
 * ```
 *
 * @stability experimental
 * @since 4.1.3
 */

/**
 * The structural tree every query runs over.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Node {
  readonly tag?: string | undefined
  readonly attrs?: Readonly<Record<string, string | undefined>> | undefined
  readonly text?: string | undefined
  readonly children?: ReadonlyArray<Node> | undefined
}

/**
 * Finds elements under a root, in document order.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Locator {
  readonly description: string
  readonly all: <N extends Node>(root: N) => ReadonlyArray<N>
}

/**
 * The text of a node and everything under it.
 *
 * @stability experimental
 * @category getters
 * @since 4.1.3
 */
export const textOf = (node: Node): string =>
  node.text !== undefined && node.tag === undefined ? node.text : (node.children ?? []).map(textOf).join("")

/**
 * Every element under `root`, `root` included, in document order.
 *
 * @stability experimental
 * @category getters
 * @since 4.1.3
 */
export const elements = <N extends Node>(root: N): ReadonlyArray<N> => {
  const out: Array<N> = []
  const walk = (node: N) => {
    if (node.tag !== undefined) out.push(node)
    for (const child of node.children ?? []) walk(child as N)
  }
  walk(root)
  return out
}

const make = (description: string, all: <N extends Node>(root: N) => ReadonlyArray<N>): Locator => ({
  description,
  all
})

/**
 * The innermost elements whose text contains `text`, or equals it with
 * `{ exact: true }`.
 *
 * @stability experimental
 * @category locators
 * @since 4.1.3
 */
export const text = (text: string, options?: { readonly exact?: boolean | undefined }): Locator => {
  const matches = (node: Node) => options?.exact === true ? textOf(node).trim() === text : textOf(node).includes(text)
  return make(
    `text ${JSON.stringify(text)}`,
    (root) =>
      elements(root).filter((node) =>
        matches(node) && !(node.children ?? []).some((child) => child.tag !== undefined && matches(child))
      )
  )
}

/**
 * Elements with the attribute `name`, equal to `value` when one is given.
 *
 * @stability experimental
 * @category locators
 * @since 4.1.3
 */
export const attr = (name: string, value?: string): Locator =>
  make(
    value === undefined ? `[${name}]` : `[${name}=${JSON.stringify(value)}]`,
    (root) =>
      elements(root).filter((node) =>
        value === undefined ? node.attrs?.[name] !== undefined : node.attrs?.[name] === value
      )
  )

/**
 * Elements with `data-testid` equal to `id`.
 *
 * @stability experimental
 * @category locators
 * @since 4.1.3
 */
export const testId = (id: string): Locator => attr("data-testid", id)

/**
 * Elements with the tag `tag`.
 *
 * @stability experimental
 * @category locators
 * @since 4.1.3
 */
export const tag = (tag: string): Locator =>
  make(`<${tag}>`, (root) => elements(root).filter((node) => node.tag === tag))

/**
 * What `locator` finds inside the elements `container` finds.
 *
 * @stability experimental
 * @category locators
 * @since 4.1.3
 */
export const inside = (container: Locator, locator: Locator): Locator =>
  make(`${locator.description} inside ${container.description}`, (root) => {
    const found = new Set<any>()
    for (const outer of container.all(root)) {
      for (const node of locator.all(outer)) {
        if (node !== outer) found.add(node)
      }
    }
    return elements(root).filter((node) => found.has(node))
  })

/**
 * Every match, in document order.
 *
 * @stability experimental
 * @category queries
 * @since 4.1.3
 */
export const all = <N extends Node>(root: N, locator: Locator): ReadonlyArray<N> => locator.all(root)

/**
 * The one match, or `undefined`. Throws when there are several.
 *
 * @stability experimental
 * @category queries
 * @since 4.1.3
 */
export const query = <N extends Node>(root: N, locator: Locator): N | undefined => {
  const found = locator.all(root)
  if (found.length > 1) throw new Error(`Query: ${found.length} elements match ${locator.description}`)
  return found[0]
}

/**
 * The one match. Throws when there's none or several.
 *
 * @stability experimental
 * @category queries
 * @since 4.1.3
 */
export const get = <N extends Node>(root: N, locator: Locator): N => {
  const found = query(root, locator)
  if (found === undefined) throw new Error(`Query: nothing matches ${locator.description}`)
  return found
}

/**
 * A node that can receive events, as `TestHost`'s nodes can.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Firable extends Node {
  readonly fire: (event: string, payload: unknown) => void
}

/**
 * Sends `event` with `payload` to `node`. The innermost element with a
 * handler for it, `node` or an ancestor, gets it.
 *
 * **Details**
 *
 * Payloads are plain data shaped by the vocabulary, such as `{ value }` for
 * `input`. A story's view value has no host, so story tests use the
 * `fire` and `click` steps of `Story.Steps` instead.
 *
 * @stability experimental
 * @category events
 * @since 4.1.3
 */
export const fire = (node: Firable, event: string, payload: unknown = {}): void => node.fire(event, payload)

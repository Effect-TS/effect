/**
 * `Story` steps for HTML behaviour that `Story` itself leaves to the
 * vocabulary.
 *
 * `drop` drops on an element as the browser host would: the drop goes to the
 * innermost drop target, the element the locator matches or an ancestor,
 * whose `accepts` matches the payload's types, and the step throws when
 * nothing accepts them, as the browser refuses the drop. `Story.fire` with
 * `"drop"` skips that check and goes to the innermost `onDrop`.
 *
 * **Example** (Dropping a todo on a list)
 *
 * ```ts import.meta.vitest
 * import { Html } from "effect/ui/html"
 * import { HtmlStory } from "effect/ui/html/testing"
 * import { Schema } from "effect"
 * import { Component } from "effect/ui"
 * import { Query, Story } from "effect/ui/testing"
 *
 * const Message = Schema.TaggedUnion({ Dropped: { id: Schema.String } })
 *
 * const Done = Component.make({
 *   name: "Done",
 *   model: Schema.Array(Schema.String),
 *   message: Message,
 *   elements: Html,
 *   init: (): ReadonlyArray<string> => [],
 *   update: (ids, message) => [...ids, message.id],
 *   view: (ids, h) =>
 *     h.ul(...ids.map((id) => h.li(id))).attr("aria-label", "Done").onDrop(
 *       ({ data }) => Message.make({ _tag: "Dropped", id: data["application/x-todo"] ?? "" }),
 *       { accepts: ["application/x-todo"], dropEffect: "move" }
 *     )
 * })
 *
 * const story = Story.make(Done, {}, (s) =>
 *   s.pipe(HtmlStory.drop(Query.tag("ul"), { data: { "application/x-todo": "t1" } })))
 * console.log(story.model, story.defaultPrevented) // ["t1"] true
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import type * as Query from "../../testing/Query.ts"
import type * as Story from "../../testing/Story.ts"
import type * as View from "../../View.ts"
import type * as Html from "../Html.ts"

/** `node` and its ancestors in `root`, innermost first, or `undefined` when `node` isn't in `root`. */
const pathTo = (root: View.Node<any, any>, node: Query.Node): Array<View.Node<any, any>> | undefined => {
  if (root === node) return [root]
  if (root._tag !== "Element") return undefined
  for (const child of root.children) {
    const path = pathTo(child, node)
    if (path !== undefined) {
      path.push(root)
      return path
    }
  }
  return undefined
}

/**
 * Drops `payload` on the element `locator` matches, as the browser host
 * would. Missing payload fields default to empty data, no files and a zero
 * box. The drag's types are the keys of `data`, plus `"Files"` when `files`
 * isn't empty.
 *
 * **Details**
 *
 * The drop goes to the innermost element, the matched one or an ancestor,
 * whose `onDrop` accepts one of those types, compared without case. It
 * throws when the locator doesn't match exactly one element, or when no drop
 * target there accepts the types. The story's `defaultPrevented` is then
 * `true`, since the browser host always cancels a drop on a target.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.5
 */
export const drop =
  (locator: Query.Locator, payload?: Partial<Html.DropPayload> | undefined) => <S extends Story.Steps.Any>(s: S): S => {
    const full: Html.DropPayload = { data: {}, files: [], x: 0, y: 0, width: 0, height: 0, ...payload }
    const types = Object.keys(full.data).concat(full.files.length > 0 ? ["Files"] : [])
    const lower = types.map((type) => type.toLowerCase())
    const found = s.current.all(locator)
    if (found.length !== 1) {
      throw new Error(
        `HtmlStory.drop: ${
          found.length === 0 ? "nothing matches" : `${found.length} elements match`
        } ${locator.description}`
      )
    }
    const target = pathTo(s.current.view(), found[0]!)?.find((node): node is View.Element<any, any> =>
      node._tag === "Element" &&
      Object.hasOwn(node.handlers, "drop") &&
      ((node.eventOptions.drop as Html.DropTargetOptions | undefined)?.accepts ?? []).some((type) =>
        lower.includes(type.toLowerCase())
      )
    )
    if (target === undefined) {
      throw new Error(
        `HtmlStory.drop: nothing at ${locator.description} accepts ${
          types.length === 0 ? "a drag with no types" : types.map((type) => JSON.stringify(type)).join(", ")
        }`
      )
    }
    // Matches the target itself, so the drop doesn't go on to an inner `onDrop` that doesn't accept it.
    const exactly: Query.Locator = {
      description: `the drop target at ${locator.description}`,
      all: <N extends Query.Node>() => [target as unknown as N]
    }
    s.fire(exactly, "drop", full)
    return s
  }

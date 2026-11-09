/**
 * The host a server render runs on. It only keeps the node tree, which the
 * runtime needs to patch: the HTML comes from the rendered tree, not from
 * these nodes.
 *
 * @internal
 */
import type * as Renderer from "../Renderer.ts"

/** @internal */
export interface Node {
  parent: Node | undefined
  readonly children: Array<Node>
}

const detach = (node: Node) => {
  const parent = node.parent
  if (parent === undefined) return
  parent.children.splice(parent.children.indexOf(node), 1)
  node.parent = undefined
}

const node = (): Node => ({ parent: undefined, children: [] })

/** @internal */
export const make = (elements: ReadonlyArray<string> | "any"): Renderer.Host<Node> => ({
  createElement: node,
  createText: node,
  setText() {},
  setAttr() {},
  setProp() {},
  insertBefore(parent, child, ref) {
    detach(child)
    const index = ref === undefined ? -1 : parent.children.indexOf(ref)
    if (index < 0) parent.children.push(child)
    else parent.children.splice(index, 0, child)
    child.parent = parent
  },
  remove: detach,
  parentOf: (child) => child.parent,
  nextOf(child) {
    const siblings = child.parent?.children
    return siblings === undefined ? undefined : siblings[siblings.indexOf(child) + 1]
  },
  setEvents() {},
  elements,
  controlled: new Set(),
  runsMounts: false
})

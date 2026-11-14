/**
 * Child paths: the segment a child slot adds to its parent's path, and the
 * check that no two slots of one view share a path.
 *
 * @internal
 */
import type * as Component from "../Component.ts"
import * as Feature from "../Feature.ts"
import type * as View from "../View.ts"

/** @internal */
export const childName = (component: Component.Any | Feature.Any): string =>
  Feature.isService(component) ? component[Feature.TypeId].name : component.name

/**
 * The segment a child slot adds to its parent's path: `Name[key]`.
 *
 * A segment's name ends at its first `[`, and the segment at its first `]/`
 * or at the end of the path. So a name's `[` is written as `%5B`, the `/`
 * of a key's `]/` as `%2F`, and `%` as `%25` in both. Two different slots
 * never share a path: a key `a]/B[b` can't stand for a grandchild. Names
 * and keys keep `/` and brackets otherwise, as in `test/Badge`, a route
 * path or a ref's `Row[b]`, and a root's name is its path as given.
 *
 * @internal
 */
export const segment = (view: View.Child<any, any>): string =>
  escapeName(childName(view.component)) + "[" + escapeKey(view.key) + "]"

// Most names and keys need no escaping, so the regular expressions run only for those that do.
const escapeName = (name: string): string =>
  name.includes("%") || name.includes("[") ? name.replace(/[%[]/g, escapeChar) : name
const escapeKey = (key: string): string =>
  key.includes("%") || key.includes("]/") ? key.replace(/%|(?<=\])\//g, escapeChar) : key

const escapeChar = (char: string): string => "%" + char.charCodeAt(0).toString(16).toUpperCase()

/**
 * The paths and ref keys one render of an instance uses, each with the slot
 * that holds it: its view's slots, then the children of each fallback shown
 * in this render, as they're shown.
 *
 * @internal
 */
export interface ChildPaths {
  readonly path: string
  // Each Map is made for its first entry: most views render no child slot, and none with a ref.
  /**
   * The slots by their component's name, then by their key. A name and a key make one segment, and
   * two that differ make two, so this finds a taken path without writing every slot's segment.
   */
  paths: Map<string, Map<string, View.Child<any, any>>> | undefined
  refs: Map<string, View.Child<any, any>> | undefined
}

const failure = (path: string, what: string): never => {
  throw new Error(`${path} renders two children ${what}`)
}

/**
 * Throws when two child slots of `tree`, at any depth below its elements,
 * have the same path, or were rendered with refs that have the same key. Two
 * instances at one path would share a log path, a server state entry and a
 * hydration marker, and a send matches a slot by its ref's key alone, so the
 * parent fails instead. Returns what the view uses, for its fallbacks.
 *
 * @internal
 */
export const checkChildPaths = (path: string, tree: View.Node<any, any>): ChildPaths => {
  const paths: ChildPaths = { path, paths: undefined, refs: undefined }
  visit(paths, tree, undefined, "")
  return paths
}

/**
 * Adds the child slots of `tree` to `paths`, as rendered by the fallback of
 * `replaced`, or by the view without one. Throws on a path or ref key another
 * slot holds. `replaced`'s own are free, since the child that failed there is
 * gone: its fallback's children take them over, so a fallback nested in
 * another fallback can reuse its slot's path too.
 */
const visit = (
  paths: ChildPaths,
  node: View.Node<any, any>,
  replaced: View.Child<any, any> | undefined,
  where: string
): void => {
  if (node._tag === "Element") {
    const children = node.children
    for (let index = 0; index < children.length; index++) {
      const child = children[index]!
      // Text and an element with no children hold no slot: most of a view, passed over without a call.
      if (child._tag === "Child" || (child._tag === "Element" && child.children.length > 0)) {
        visit(paths, child, replaced, where)
      }
    }
  } else if (node._tag === "Child") {
    const name = childName(node.component)
    const byName = paths.paths ??= new Map()
    let taken = byName.get(name)
    if (taken === undefined) byName.set(name, taken = new Map())
    const holder = taken.get(node.key)
    if (holder !== undefined && holder !== replaced) failure(paths.path, `at ${segment(node)}${where}`)
    taken.set(node.key, node)
    const ref = node.ref
    if (ref !== undefined) {
      const refs = paths.refs ??= new Map()
      const refHolder = refs.get(ref.key)
      if (refHolder !== undefined && refHolder !== replaced) failure(paths.path, `with the ref ${ref.key}${where}`)
      refs.set(ref.key, node)
    }
  }
}

/**
 * Throws when `fallback`, shown in place of the slot `slot`, renders a child
 * at a path or ref key that another slot holds: one of the view's, or a child
 * of a fallback already shown in this render. A fallback's children are the
 * parent's children, so they share its paths. Only `slot`'s own path and ref
 * key are free, since the child that failed there is gone.
 *
 * @internal
 */
export const checkFallbackPaths = (
  paths: ChildPaths,
  slot: View.Child<any, any>,
  fallback: View.Node<any, any>
): void => {
  visit(paths, fallback, slot, `, in the fallback of ${segment(slot)}`)
}

/**
 * Throws when two of `written`, the paths of one author's view and of each
 * closure it gave a headless child, hold slots with refs of one key. The
 * author wrote all of them, and a send finds a slot by its ref's key alone,
 * across all of them. One view's own refs are checked as it renders.
 *
 * @internal
 */
export const checkAuthorRefs = (path: string, written: ReadonlyArray<ChildPaths>): void => {
  const taken = new Set<string>()
  for (const paths of written) {
    if (paths.refs === undefined) continue
    for (const key of paths.refs.keys()) {
      if (taken.has(key)) failure(path, `with the ref ${key}, in the view it gives ${paths.path}`)
      taken.add(key)
    }
  }
}

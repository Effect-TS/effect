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

/** The segment a child slot adds to its parent's path: `Name[key]`. @internal */
export const segment = (view: View.Child<any, any>): string => `${childName(view.component)}[${view.key}]`

interface Taken {
  readonly paths: Set<string>
  readonly refs: Set<string>
}

/**
 * Visits the child slots of `tree`, at any depth below its elements, adding
 * each one's segment and ref key to `taken`. `fail` gets the first segment or
 * ref key already in it. A `skip` slot isn't visited.
 */
const visitChildren = (
  tree: View.Node<any, any>,
  taken: Taken,
  fail: (what: string) => never,
  skip?: View.Child<any, any>
): void => {
  const visit = (node: View.Node<any, any>): void => {
    if (node._tag === "Element") {
      for (const child of node.children) visit(child)
    } else if (node._tag === "Child" && node !== skip) {
      const key = segment(node)
      if (taken.paths.has(key)) fail(`at ${key}`)
      taken.paths.add(key)
      if (node.ref !== undefined) {
        if (taken.refs.has(node.ref.key)) fail(`with the ref ${node.ref.key}`)
        taken.refs.add(node.ref.key)
      }
    }
  }
  visit(tree)
}

/**
 * Throws when two child slots of `tree`, at any depth below its elements,
 * have the same path, or were rendered with refs that have the same key. Two
 * instances at one path would share a log path, a server state entry and a
 * hydration marker, and a send matches a slot by its ref's key alone, so the
 * parent fails instead.
 *
 * @internal
 */
export const checkChildPaths = (path: string, tree: View.Node<any, any>): void =>
  visitChildren(tree, { paths: new Set(), refs: new Set() }, (what) => {
    throw new Error(`${path} renders two children ${what}`)
  })

/**
 * Throws when `fallback`, shown in place of the slot `slot` of `tree`, renders
 * two children at one path, or a child at the path or ref key of another slot
 * of `tree`. A fallback's children are the parent's children, so they share
 * its paths. Without `tree`, only the fallback is checked.
 *
 * @internal
 */
export const checkFallbackPaths = (
  path: string,
  tree: View.Node<any, any> | undefined,
  slot: View.Child<any, any>,
  fallback: View.Node<any, any>
): void => {
  const taken: Taken = { paths: new Set(), refs: new Set() }
  if (tree !== undefined) {
    visitChildren(tree, taken, () => {
      // The tree itself was checked when it rendered.
      throw new Error(`${path} renders two children`)
    }, slot)
  }
  visitChildren(fallback, taken, (what) => {
    throw new Error(`${path}: the fallback of ${segment(slot)} renders a second child ${what}`)
  })
}

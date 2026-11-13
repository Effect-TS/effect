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
 * The paths and ref keys one render of an instance uses: its view's slots,
 * then the children of each fallback shown in this render, as they're shown.
 *
 * @internal
 */
export interface ChildPaths {
  readonly path: string
  readonly view: Taken
  readonly fallbacks: Taken
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
  const view: Taken = { paths: new Set(), refs: new Set() }
  const visit = (node: View.Node<any, any>): void => {
    if (node._tag === "Element") {
      for (const child of node.children) visit(child)
    } else if (node._tag === "Child") {
      const key = segment(node)
      if (view.paths.has(key)) failure(path, `at ${key}`)
      view.paths.add(key)
      if (node.ref !== undefined) {
        if (view.refs.has(node.ref.key)) failure(path, `with the ref ${node.ref.key}`)
        view.refs.add(node.ref.key)
      }
    }
  }
  visit(tree)
  return { path, view, fallbacks: { paths: new Set(), refs: new Set() } }
}

/**
 * Throws when `fallback`, shown in place of the slot `slot`, renders a child
 * at a path or ref key that another slot of the view, or a child of a
 * fallback already shown in this render, uses. A fallback's children are the
 * parent's children, so they share its paths. Only the slot's own path and
 * ref key are free: the child that failed there is gone.
 *
 * @internal
 */
export const checkFallbackPaths = (
  paths: ChildPaths,
  slot: View.Child<any, any>,
  fallback: View.Node<any, any>
): void => {
  const own = segment(slot)
  const where = `, in the fallback of ${own}`
  const visit = (node: View.Node<any, any>): void => {
    if (node._tag === "Element") {
      for (const child of node.children) visit(child)
    } else if (node._tag === "Child") {
      const key = segment(node)
      if ((key !== own && paths.view.paths.has(key)) || paths.fallbacks.paths.has(key)) {
        failure(paths.path, `at ${key}${where}`)
      }
      paths.fallbacks.paths.add(key)
      if (node.ref !== undefined) {
        const ref = node.ref.key
        if ((ref !== slot.ref?.key && paths.view.refs.has(ref)) || paths.fallbacks.refs.has(ref)) {
          failure(paths.path, `with the ref ${ref}${where}`)
        }
        paths.fallbacks.refs.add(ref)
      }
    }
  }
  visit(fallback)
}

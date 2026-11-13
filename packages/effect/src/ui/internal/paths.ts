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

/**
 * Throws when two child slots of `tree`, at any depth below its elements,
 * have the same path, or were rendered with refs that have the same key. Two
 * instances at one path would share a log path, a server state entry and a
 * hydration marker, and a send matches a slot by its ref's key alone, so the
 * parent fails instead.
 *
 * @internal
 */
export const checkChildPaths = (path: string, tree: View.Node<any, any>): void => {
  let seen: Set<string> | undefined
  let refs: Set<string> | undefined
  const visit = (node: View.Node<any, any>): void => {
    if (node._tag === "Element") {
      for (const child of node.children) visit(child)
    } else if (node._tag === "Child") {
      const key = segment(node)
      seen ??= new Set()
      if (seen.has(key)) throw new Error(`${path} renders two children at ${key}`)
      seen.add(key)
      if (node.ref !== undefined) {
        refs ??= new Set()
        if (refs.has(node.ref.key)) throw new Error(`${path} renders two children with the ref ${node.ref.key}`)
        refs.add(node.ref.key)
      }
    }
  }
  visit(tree)
}

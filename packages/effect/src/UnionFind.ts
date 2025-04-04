/**
 * @since 3.12.0
 */
import { dual } from "./Function.js"

/**
 * `UnionFind` is a disjoint-set data structure. It tracks set membership
 * of *n* elements indexed from `0` to `n-1`.
 *
 * @since 3.12.0
 * @category models
 */
export interface UnionFind {
  /** @internal */
  readonly parent: Array<number>
  /** @internal */
  readonly rank: Array<number>
}

/**
 * Create a new `UnionFind` of `n` disjoint sets.
 *
 * @since 3.12.0
 * @category constructors
 */
export const make = (n: number): UnionFind => ({
  parent: Array.from({ length: n }, (_, i) => i),
  rank: new Array(n).fill(0)
})

/**
 * Return the representative for `x`.
 *
 * @since 3.12.0
 * @category combinators
 */
export const find: {
  (x: number): (self: UnionFind) => number
  (self: UnionFind, x: number): number
} = dual(2, (self: UnionFind, x: number): number => {
  let current = x
  while (true) {
    const parent = self.parent[current]
    if (parent === current) {
      break
    }
    current = parent
  }
  return current
})

/**
 * Returns `true` if the given elements belong to the same set.
 *
 * @since 3.12.0
 * @category combinators
 */
export const equiv: {
  (x: number, y: number): (self: UnionFind) => boolean
  (self: UnionFind, x: number, y: number): boolean
} = dual(3, (self: UnionFind, x: number, y: number): boolean => find(self, x) === find(self, y))

/**
 * Unify the two sets containing `x` and `y`.
 *
 * Returns `false` if the sets were already the same, `true` if they were unified.
 *
 * @since 3.12.0
 * @category combinators
 */
export const union: {
  (x: number, y: number): (self: UnionFind) => boolean
  (self: UnionFind, x: number, y: number): boolean
} = dual(3, (self: UnionFind, x: number, y: number): boolean => {
  if (x === y) {
    return false
  }

  const xRoot = find(self, x)
  const yRoot = find(self, y)

  if (xRoot === yRoot) {
    return false
  }

  const xRank = self.rank[xRoot]
  const yRank = self.rank[yRoot]

  // The rank corresponds roughly to the depth of the treeset, so put the
  // smaller set below the larger
  if (xRank < yRank) {
    self.parent[xRoot] = yRoot
  } else if (xRank > yRank) {
    self.parent[yRoot] = xRoot
  } else {
    self.parent[yRoot] = xRoot
    self.rank[xRoot] += 1
  }

  return true
})

/**
 * Return an array mapping each element to its representative.
 *
 * @since 3.12.0
 * @category combinators
 */
export const intoLabeling: {
  (self: UnionFind): Array<number>
} = (self: UnionFind): Array<number> => {
  const parent = [...self.parent]

  for (let i = 0; i < parent.length; i++) {
    const rep = find(self, parent[i])
    parent[i] = rep
  }

  return parent
}

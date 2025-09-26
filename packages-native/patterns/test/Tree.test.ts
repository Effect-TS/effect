import * as Tree from "@effect-native/patterns/Tree"
import { assert, describe, it } from "@effect/vitest"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"

describe("Tree", () => {
  const makeExample = () =>
    Tree.make({
      value: "root",
      children: [
        Tree.make({ value: "child-1" }),
        Tree.make({
          value: "child-2",
          children: [Tree.make({ value: "grandchild" })]
        })
      ]
    })

  it("make produces Tree instances tagged with TypeId", () => {
    const tree = Tree.make({ value: Data.struct({ id: 1 }) })

    assert.isTrue(Tree.isTree(tree))
    assert.strictEqual(tree.value.id, 1)
    assert.strictEqual(tree.size, 1)
    assert.deepStrictEqual(Tree.children(tree), [])
  })

  it("appendChild supports data-first and data-last usage", () => {
    const leaf = Tree.make({ value: "leaf" })
    const base = Tree.make({ value: "root" })

    const dataFirst = Tree.appendChild(base, leaf)
    const dataLast = Tree.appendChild(leaf)(base)

    assert.deepStrictEqual(Tree.children(dataFirst).map((child) => child.value), ["leaf"])
    assert.deepStrictEqual(Tree.children(dataLast).map((child) => child.value), ["leaf"])
    assert.deepStrictEqual(Tree.children(base), [])
  })

  it("map transforms node values without mutating the original", () => {
    const tree = makeExample()

    const mapped = Tree.map(tree, (value) => value.toUpperCase())
    const mappedDataLast = Tree.map((value: string) => value.length)(tree)

    assert.deepStrictEqual(Tree.toArray(mapped), ["ROOT", "CHILD-1", "CHILD-2", "GRANDCHILD"])
    assert.deepStrictEqual(Tree.toArray(mappedDataLast), [4, 7, 7, 10])
    assert.deepStrictEqual(Tree.toArray(tree), ["root", "child-1", "child-2", "grandchild"])
  })

  it("equals and hashing consider value and child structure", () => {
    const left = makeExample()
    const right = Tree.make({
      value: "root",
      children: [
        Tree.make({ value: "child-1" }),
        Tree.make({
          value: "child-2",
          children: [Tree.make({ value: "grandchild" })]
        })
      ]
    })

    assert.isTrue(Equal.equals(left, right))
    assert.strictEqual(Hash.hash(left), Hash.hash(right))
  })

  it("reduce folds in depth-first preorder", () => {
    const tree = makeExample()

    const summary = Tree.reduce(tree, [] as Array<string>, (acc, value) => {
      acc.push(value)
      return acc
    })

    assert.deepStrictEqual(summary, ["root", "child-1", "child-2", "grandchild"])
  })

  it.effect("forEachEffect visits nodes depth-first", () =>
    Effect.gen(function*() {
      const tree = makeExample()
      const seen: Array<string> = []

      yield* Tree.forEachEffect(tree, (value, indexPath) =>
        Effect.sync(() => {
          seen.push(`${indexPath.join(".")}:${value}`)
        }))

      assert.deepStrictEqual(seen, ["0:root", "0.0:child-1", "0.1:child-2", "0.1.0:grandchild"])
    }))
})

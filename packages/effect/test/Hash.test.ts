import { assert, describe, it } from "@effect/vitest"
import { Chunk, Graph, Hash, HashMap, HashSet, Trie } from "effect"

const range = (length: number): ReadonlyArray<number> => Array.from({ length }, (_, index) => index)

const grid = <A>(size: number, make: (i: number, j: number) => A): ReadonlyArray<A> => {
  const values = new Array<A>(size * size)
  let index = 0
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      values[index++] = make(i, j)
    }
  }
  return values
}

const unorderedPairs = <A>(size: number, make: (i: number, j: number) => A): ReadonlyArray<A> => {
  const values = new Array<A>((size * (size - 1)) / 2)
  let index = 0
  for (let i = 0; i < size; i++) {
    for (let j = i + 1; j < size; j++) {
      values[index++] = make(i, j)
    }
  }
  return values
}

const permutations = <A>(values: ReadonlyArray<A>): ReadonlyArray<ReadonlyArray<A>> => {
  const output: Array<ReadonlyArray<A>> = []
  const visit = (prefix: ReadonlyArray<A>, remaining: ReadonlyArray<A>): void => {
    if (remaining.length === 0) {
      output.push(prefix)
      return
    }
    for (let i = 0; i < remaining.length; i++) {
      visit([...prefix, remaining[i]], [...remaining.slice(0, i), ...remaining.slice(i + 1)])
    }
  }
  visit([], values)
  return output
}

const assertNoHashCollisions = (values: Iterable<unknown>): void => {
  const hashes = new Set<number>()
  let count = 0
  for (const value of values) {
    hashes.add(Hash.hash(value))
    count++
  }
  assert.strictEqual(hashes.size, count)
}

const twoNodeGraph = (type: Graph.Kind, first: number, second: number) =>
  Graph.make(type)<number, number>((mutable) => {
    Graph.addNode(mutable, first)
    Graph.addNode(mutable, second)
    Graph.addEdge(mutable, 0, 1, 0)
  })

describe("Hash", () => {
  describe("collision resistance", () => {
    it("does not collide for a 100 by 100 grid of arrays", () => {
      assertNoHashCollisions(grid(100, (i, j) => [i, j]))
    })

    it("does not collide for a 100 by 100 grid of records", () => {
      assertNoHashCollisions(grid(100, (i, j) => ({ i, j })))
    })

    it("does not collide for a 100 by 100 grid of combined hashes", () => {
      assertNoHashCollisions(grid(100, (i, j) => Hash.combine(Hash.hash(i), Hash.hash(j))))
    })

    it("does not collide for a 100 by 100 grid of HashMap entries", () => {
      assertNoHashCollisions(grid(100, (i, j) => HashMap.make([i, j])))
    })

    it("does not collide for a 100 by 100 grid of Trie entries", () => {
      assertNoHashCollisions(grid(100, (i, j) => Trie.make([String(i), j])))
    })

    it("does not collide for a 100 by 100 grid of Chunks", () => {
      assertNoHashCollisions(grid(100, (i, j) => Chunk.make(i, j)))
    })

    it("does not collide for native Sets of pairs below 150", () => {
      assertNoHashCollisions(unorderedPairs(150, (i, j) => new Set([i, j])))
    })

    it("does not collide for HashSets of pairs below 150", () => {
      assertNoHashCollisions(unorderedPairs(150, (i, j) => HashSet.make(i, j)))
    })

    it("does not give distinct HashSets one constant hash", () => {
      assert.notStrictEqual(Hash.hash(HashSet.make(1)), Hash.hash(HashSet.make(2)))
    })

    it("does not collide for every permutation of seven integers", () => {
      assertNoHashCollisions(permutations(range(7)))
    })

    it("does not collide for nested arrays and records", () => {
      const values = []
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          for (let k = 0; k < 10; k++) {
            values.push({ a: [i, j], b: { c: k } })
          }
        }
      }
      assertNoHashCollisions(values)
    })

    it("does not collide for a 100 by 100 grid of directed two-node graphs", () => {
      assertNoHashCollisions(grid(100, (i, j) => twoNodeGraph("directed", i, j)))
    })

    it("does not collide for a 100 by 100 grid of undirected two-node graphs", () => {
      assertNoHashCollisions(grid(100, (i, j) => twoNodeGraph("undirected", i, j)))
    })

    it("keeps array order and length in the hash", () => {
      assert.notStrictEqual(Hash.hash([1, 2]), Hash.hash([2, 1]))
      assert.notStrictEqual(Hash.hash([1, 2, 3]), Hash.hash([]))
    })
  })

  describe("cyclic values", () => {
    it("does not cache a hash computed from a circular sentinel", () => {
      interface Node {
        next?: Node
      }
      const a1: Node = {}
      const b1: Node = {}
      a1.next = b1
      b1.next = a1

      const a2: Node = {}
      const b2: Node = {}
      a2.next = b2
      b2.next = a2

      Hash.hash(b2)
      assert.strictEqual(Hash.hash(a1), Hash.hash(a2))
    })

    it("clears visited state when a custom hasher throws", () => {
      const value = {
        [Hash.symbol](): number {
          throw new Error("boom")
        }
      }

      assert.throws(() => Hash.hash(value), /boom/)
      assert.throws(() => Hash.hash(value), /boom/)
    })
  })
})

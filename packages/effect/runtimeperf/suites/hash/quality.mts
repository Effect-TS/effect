// Hash quality report: collision rates over realistic corpora of values that
// `Equal` considers distinct. Run from `packages/effect`:
//
//   node runtimeperf/suites/hash/quality.mts            # current implementation
//   node runtimeperf/suites/hash/quality.mts --json     # machine-readable
//
// Run it in a checkout of each revision to compare them.
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Graph from "effect/Graph"
import * as Hash from "effect/Hash"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Option from "effect/Option"
import * as Trie from "effect/Trie"

// A user-written custom hasher composing its fields with `Hash.combine`.
class CombinedPair {
  readonly a: number
  readonly b: number
  constructor(a: number, b: number) {
    this.a = a
    this.b = b
  }
  [Hash.symbol]() {
    return Hash.combine(Hash.hash(this.a), Hash.hash(this.b))
  }
}

class Person extends Data.TaggedClass("Person")<{ readonly id: number; readonly name: string }> {}

type Corpus = { readonly name: string; readonly values: ReadonlyArray<unknown> }

const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const grid = <A,>(n: number, m: number, f: (i: number, j: number) => A) =>
  range(n).flatMap((i) => range(m).map((j) => f(i, j)))

const permutations = (xs: ReadonlyArray<number>): Array<Array<number>> =>
  xs.length <= 1 ?
    [[...xs]] :
    xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]))

const letters = "abcdefghijklmnopqrstuvwxyz"
const words3 = [...letters].flatMap((a) => [...letters].flatMap((b) => [...letters].map((c) => a + b + c)))
const base = Date.UTC(2024, 0, 1)

export const corpora: ReadonlyArray<Corpus> = [
  { name: "int pairs [a, b] (100x100)", values: grid(100, 100, (a, b) => [a, b]) },
  { name: "permutations of [0..6]", values: permutations(range(7)) },
  { name: "repeated pairs [a, a] (1000)", values: range(1000).map((a) => [a, a]) },
  { name: "string pairs [user-i, role-j]", values: grid(100, 100, (i, j) => [`user-${i}`, `role-${j}`]) },
  { name: "records {x, y} grid", values: grid(100, 100, (x, y) => ({ x, y })) },
  {
    name: "records {id, name, active}",
    values: range(10000).map((i) => ({ id: i, name: `user-${i}`, active: i % 2 === 0 }))
  },
  { name: "Data.TaggedClass Person", values: range(10000).map((i) => new Person({ id: i, name: `user-${i % 100}` })) },
  {
    name: "nested {a: [i, j], b: {c: k}}",
    values: range(22).flatMap((i) => grid(22, 22, (j, k) => ({ a: [i, j], b: { c: k } })))
  },
  {
    name: "sets {i, j} (i < j < 150)",
    values: grid(150, 150, (i, j) => [i, j]).filter(([i, j]) => i < j).map((p) => new Set(p))
  },
  { name: "HashMap {x: i, y: j}", values: grid(100, 100, (x, y) => HashMap.make(["x", x], ["y", y])) },
  {
    name: "HashSet {i, j} (i < j < 150)",
    values: grid(150, 150, (i, j) => [i, j]).filter(([i, j]) => i < j).map(([i, j]) => HashSet.make(i, j))
  },
  { name: "Trie {x: i, y: j}", values: grid(100, 100, (x, y) => Trie.make(["x", x], ["y", y])) },
  { name: "Chunk [a, b]", values: grid(100, 100, (a, b) => Chunk.make(a, b)) },
  { name: "Chunk permutations of [0..6]", values: permutations(range(7)).map((p) => Chunk.fromIterable(p)) },
  {
    name: "Graph two nodes (data i, j)",
    values: grid(100, 100, (i, j) =>
      Graph.directed<number, number>((g) => {
        const a = Graph.addNode(g, i)
        const b = Graph.addNode(g, j)
        Graph.addEdge(g, a, b, 0)
      }))
  },
  { name: "custom hasher: Hash.combine(a, b)", values: grid(100, 100, (a, b) => new CombinedPair(a, b)) },
  { name: "Option.some([a, b]) / Option.some(i)", values: grid(100, 100, (a, b) => Option.some(a * 100 + b)) },
  { name: "Option.some(int)", values: range(10000).map((i) => Option.some(i)) },
  { name: "strings user-i", values: range(10000).map((i) => `user-${i}`) },
  { name: "strings 3-letter words", values: words3 },
  { name: "ints 0..9999", values: range(10000) },
  { name: "negative ints", values: range(10000).map((i) => -i - 1) },
  { name: "floats i * 0.1", values: range(10000).map((i) => i * 0.1) },
  { name: "floats i * 0.001", values: range(10000).map((i) => i * 0.001) },
  { name: "large ints i * 2^32", values: range(10000).map((i) => i * 2 ** 32) },
  { name: "dates, consecutive ms", values: range(10000).map((i) => new Date(base + i)) },
  { name: "dates, consecutive days", values: range(10000).map((i) => new Date(base + i * 86_400_000)) },
  { name: "bigints 2^64 + i", values: range(10000).map((i) => BigInt(2) ** BigInt(64) + BigInt(i)) },
  {
    name: "mixed types (i, 'i', [i], {v: i}, singletons)",
    values: [
      ...range(100).flatMap((i) => [i, String(i), [i], { v: i }]),
      null,
      undefined,
      true,
      false,
      "null",
      "undefined",
      "true",
      "false"
    ]
  }
]

// 31 bits of effective output: `optimize` folds bit 31 into bit 30.
const hashSpace = 2 ** 31
const expectedCollisions = (n: number) => n - hashSpace * (1 - Math.pow(1 - 1 / hashSpace, n))

export const measure = (values: ReadonlyArray<unknown>, hash: (u: unknown) => number) => {
  const seen = new Set<number>()
  const buckets = new Array(32).fill(0)
  for (const value of values) {
    const h = hash(value)
    seen.add(h)
    buckets[h & 31]++
  }
  const n = values.length
  return {
    n,
    collisions: n - seen.size,
    expected: expectedCollisions(n),
    // Largest first-level HashMap bucket relative to a perfectly even spread.
    maxBucketRatio: Math.max(...buckets) / (n / 32)
  }
}

export const variants: ReadonlyArray<{ readonly name: string; readonly hash: (u: unknown) => number }> = [
  { name: "current", hash: Hash.hash }
]

const results = corpora.map((corpus) => ({
  corpus: corpus.name,
  results: Object.fromEntries(variants.map((v) => [v.name, measure(corpus.values, v.hash)]))
}))

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(results)}\n`)
} else {
  for (const { corpus, results: r } of results) {
    const cells = variants.map((v) => `${v.name}: ${r[v.name].collisions}/${r[v.name].n}`.padEnd(30))
    process.stdout.write(`${corpus.padEnd(46)} ${cells.join(" ")}\n`)
  }
}

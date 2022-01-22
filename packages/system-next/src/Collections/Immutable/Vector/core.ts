/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-var */

import type { Either } from "../../../Either"
import { identity } from "../../../Function"
import * as O from "../../../Option"
import type { Ord } from "../../../Ord"
import * as St from "../../../Structural"
import * as Tp from "../Tuple"

/**
 * Forked from https://github.com/funkia/list/blob/master/src/index.ts
 *
 * All credits to original authors.
 *
 * The implementation has been forked to adapt to the double standard pipeable/data first
 * available in the remaining modules and to remove the fantasy-land bias.
 */

const branchingFactor = 32
const branchBits = 5
const mask = 31

function elementEquals(a: any, b: any): boolean {
  if (a === b) {
    return true
  } else {
    return false
  }
}

function createPath(depth: number, value: any): any {
  let current = value
  for (let i = 0; i < depth; ++i) {
    current = new Node(undefined, [current])
  }
  return current
}

// Array helper functions

function copyArray(source: any[]): any[] {
  const array = []
  for (let i = 0; i < source.length; ++i) {
    array[i] = source[i]
  }
  return array
}

function pushElements<A>(
  source: A[],
  target: A[],
  offset: number,
  amount: number
): void {
  for (let i = offset; i < offset + amount; ++i) {
    target.push(source[i]!)
  }
}

function copyIndices(
  source: any[],
  sourceStart: number,
  target: any[],
  targetStart: number,
  length: number
): void {
  for (let i = 0; i < length; ++i) {
    target[targetStart + i] = source[sourceStart + i]
  }
}

function arrayPrepend<A>(value: A, array: A[]): A[] {
  const newLength = array.length + 1
  const result = new Array(newLength)
  result[0] = value
  for (let i = 1; i < newLength; ++i) {
    result[i] = array[i - 1]
  }
  return result
}

/**
 * Create a reverse _copy_ of an array.
 */
function reverseArray<A>(array: A[]): A[] {
  return array.slice().reverse()
}

function arrayFirst<A>(array: A[]): A {
  return array[0]!
}

function arrayLast<A>(array: A[]): A {
  return array[array.length - 1]!
}

const pathResult = { path: 0, index: 0, updatedOffset: 0 }
type PathResult = typeof pathResult

function getPath(
  index: number,
  offset: number,
  depth: number,
  sizes: Sizes
): PathResult {
  if (sizes === undefined && offset !== 0) {
    pathResult.updatedOffset = 0
    index = handleOffset(depth, offset, index)
  }
  let path = (index >> (depth * branchBits)) & mask
  if (sizes !== undefined) {
    while (sizes[path]! <= index) {
      path++
    }
    const traversed = path === 0 ? 0 : sizes[path - 1]!
    index -= traversed
    pathResult.updatedOffset = offset
  }
  pathResult.path = path
  pathResult.index = index
  return pathResult
}

function updateNode(
  node: Node,
  depth: number,
  index: number,
  offset: number,
  value: any
): Node {
  const {
    index: newIndex,
    path,
    updatedOffset
  } = getPath(index, offset, depth, node.sizes)
  const array = copyArray(node.array)
  array[path] =
    depth > 0
      ? updateNode(array[path], depth - 1, newIndex, updatedOffset, value)
      : value
  return new Node(node.sizes, array)
}

export type Sizes = number[] | undefined

export class Node {
  constructor(public sizes: Sizes, public array: any[]) {}
}

function cloneNode({ array, sizes }: Node): Node {
  return new Node(sizes === undefined ? undefined : copyArray(sizes), copyArray(array))
}

// This array should not be mutated. Thus a dummy element is placed in
// it. Thus the affix will not be owned and thus not mutated.
const emptyAffix: any[] = [0]

// We store a bit field in vector. From right to left, the first five
// bits are suffix length, the next five are prefix length and the
// rest is depth. The functions below are for working with the bits in
// a sane way.

const affixBits = 6
const affixMask = 0b111111

function getSuffixSize(vec: Vector<any>): number {
  return vec.bits & affixMask
}

function getPrefixSize(vec: Vector<any>): number {
  return (vec.bits >> affixBits) & affixMask
}

function getDepth(vec: Vector<any>): number {
  return vec.bits >> (affixBits * 2)
}

function setPrefix(size: number, bits: number): number {
  return (size << affixBits) | (bits & ~(affixMask << affixBits))
}

function setSuffix(size: number, bits: number): number {
  return size | (bits & ~affixMask)
}

function setDepth(depth: number, bits: number): number {
  return (depth << (affixBits * 2)) | (bits & (affixMask | (affixMask << affixBits)))
}

function incrementPrefix(bits: number): number {
  return bits + (1 << affixBits)
}

function incrementSuffix(bits: number): number {
  return bits + 1
}

function incrementDepth(bits: number): number {
  return bits + (1 << (affixBits * 2))
}

function decrementDepth(bits: number): number {
  return bits - (1 << (affixBits * 2))
}

/*
 * Invariants that any vector `l` should satisfy
 *
 * 1. If `l.root !== undefined` then `getSuffixSize(l) !== 0` and
 *    `getPrefixSize(l) !== 0`. The invariant ensures that `first` and
 *    `last` never have to look in the root and that they therefore
 *    take O(1) time.
 * 2. If a tree or sub-tree does not have a size-table then all leaf
 *    nodes in the tree are of size 32.
 */

/**
 * Represents a list of elements.
 */
export class Vector<A> implements Iterable<A>, St.HasEquals, St.HasHash {
  constructor(
    readonly bits: number,
    readonly offset: number,
    readonly length: number,
    readonly prefix: A[],
    readonly root: Node | undefined,
    readonly suffix: A[]
  ) {}
  [Symbol.iterator](): Iterator<A> {
    return new ForwardVectorIterator(this)
  }
  toJSON(): readonly A[] {
    return toArray(this)
  }
  [St.equalsSym](that: unknown): boolean {
    return that instanceof Vector && equalsWith_(this, that, St.equals)
  }
  get [St.hashSym](): number {
    return St.hashIterator(this[Symbol.iterator]())
  }
}

export type MutableVector<A> = { -readonly [K in keyof Vector<A>]: Vector<A>[K] } & {
  [Symbol.iterator]: () => Iterator<A>
  // This property doesn't exist at run-time. It exists to prevent a
  // MutableVector from being assignable to a Vector.
  "@@mutable": true
}

function cloneVector<A>(vec: Vector<A>): MutableVector<A> {
  return new Vector(
    vec.bits,
    vec.offset,
    vec.length,
    vec.prefix,
    vec.root,
    vec.suffix
  ) as any
}

abstract class VectorIterator<A> implements Iterator<A> {
  stack: any[][] | undefined
  indices: number[] | undefined
  idx: number
  prefixSize: number
  middleSize: number
  result: IteratorResult<A> = { done: false, value: undefined as any }
  constructor(protected vec: Vector<A>, direction: 1 | -1) {
    this.idx = direction === 1 ? -1 : vec.length
    this.prefixSize = getPrefixSize(vec)
    this.middleSize = vec.length - getSuffixSize(vec)
    if (vec.root !== undefined) {
      const depth = getDepth(vec)
      this.stack = new Array(depth + 1)
      this.indices = new Array(depth + 1)
      let currentNode = vec.root.array
      for (let i = depth; 0 <= i; --i) {
        this.stack[i] = currentNode
        const idx = direction === 1 ? 0 : currentNode.length - 1
        this.indices[i] = idx
        currentNode = currentNode[idx].array
      }
      this.indices[0] -= direction
    }
  }
  abstract next(): IteratorResult<A>
}

class ForwardVectorIterator<A> extends VectorIterator<A> {
  constructor(vec: Vector<A>) {
    super(vec, 1)
  }
  nextInTree(): void {
    for (var i = 0; ++this.indices![i] === this.stack![i]!.length; ++i) {
      this.indices![i] = 0
    }
    for (; 0 < i; --i) {
      this.stack![i - 1] = this.stack![i]![this.indices![i]!].array
    }
  }
  next(): IteratorResult<A> {
    let newVal
    const idx = ++this.idx
    if (idx < this.prefixSize) {
      newVal = this.vec.prefix[this.prefixSize - idx - 1]
    } else if (idx < this.middleSize) {
      this.nextInTree()
      newVal = this.stack![0]![this.indices![0]!]
    } else if (idx < this.vec.length) {
      newVal = this.vec.suffix[idx - this.middleSize]
    } else {
      this.result.done = true
    }
    this.result.value = newVal
    return this.result
  }
}

class BackwardsVectorIterator<A> extends VectorIterator<A> {
  constructor(vec: Vector<A>) {
    super(vec, -1)
  }
  prevInTree(): void {
    for (var i = 0; this.indices![i] === 0; ++i) {
      //
    }
    --this.indices![i]
    for (; 0 < i; --i) {
      const n = this.stack![i]![this.indices![i]!].array
      this.stack![i - 1] = n
      this.indices![i - 1] = n.length - 1
    }
  }
  next(): IteratorResult<A> {
    let newVal
    const idx = --this.idx
    if (this.middleSize <= idx) {
      newVal = this.vec.suffix[idx - this.middleSize]
    } else if (this.prefixSize <= idx) {
      this.prevInTree()
      newVal = this.stack![0]![this.indices![0]!]
    } else if (0 <= idx) {
      newVal = this.vec.prefix[this.prefixSize - idx - 1]
    } else {
      this.result.done = true
    }
    this.result.value = newVal
    return this.result
  }
}

/**
 * Returns an iterable that iterates backwards over the given vector.
 *
 * @complexity O(1)
 */
export function backwards<A>(vec: Vector<A>): Iterable<A> {
  return {
    [Symbol.iterator](): Iterator<A> {
      return new BackwardsVectorIterator(vec)
    }
  }
}

export function emptyPushable<A>(): MutableVector<A> {
  return new Vector(0, 0, 0, [], undefined, []) as any
}

/** Appends the value to the vector by _mutating_ the vector and its content. */
export function push_<A>(vec: MutableVector<A>, value: A): MutableVector<A> {
  const suffixSize = getSuffixSize(vec)
  if (vec.length === 0) {
    vec.bits = setPrefix(1, vec.bits)
    vec.prefix = [value]
  } else if (suffixSize < 32) {
    vec.bits = incrementSuffix(vec.bits)
    vec.suffix.push(value)
  } else if (vec.root === undefined) {
    vec.root = new Node(undefined, vec.suffix)
    vec.suffix = [value]
    vec.bits = setSuffix(1, vec.bits)
  } else {
    const newNode = new Node(undefined, vec.suffix)
    const index = vec.length - 1 - 32 + 1
    let current = vec.root!
    let depth = getDepth(vec)
    vec.suffix = [value]
    vec.bits = setSuffix(1, vec.bits)
    if (index - 1 < branchingFactor ** (depth + 1)) {
      for (; depth >= 0; --depth) {
        const path = (index >> (depth * branchBits)) & mask
        if (path < current.array.length) {
          current = current.array[path]
        } else {
          current.array.push(createPath(depth - 1, newNode))
          break
        }
      }
    } else {
      vec.bits = incrementDepth(vec.bits)
      vec.root = new Node(undefined, [vec.root, createPath(depth, newNode)])
    }
  }
  vec.length++
  return vec
}

/**
 * Creates a vector of the given elements.
 *
 * @complexity O(n)
 */
export function vector<A>(...elements: A[]): Vector<A> {
  const l = emptyPushable<A>()
  for (const element of elements) {
    push_(l, element)
  }
  return l
}

/**
 * Creates an empty vector.
 *
 * @complexity O(1)
 */
export function empty<A = any>(): Vector<A> {
  return new Vector(0, 0, 0, emptyAffix, undefined, emptyAffix)
}

/**
 * Takes a single arguments and returns a singleton vector that contains it.
 *
 * @complexity O(1)
 */
export function of<A>(a: A): Vector<A> {
  return vector(a)
}

/**
 * Takes two arguments and returns a vector that contains them.
 *
 * @complexity O(1)
 */
export function pair<A>(second: A): (first: A) => Vector<A> {
  return (first: A) => pair_(first, second)
}

/**
 * Takes two arguments and returns a vector that contains them.
 *
 * @complexity O(1)
 */
export function pair_<A>(first: A, second: A): Vector<A> {
  return new Vector(2, 0, 2, emptyAffix, undefined, [first, second])
}

/**
 * Converts an array, an array-like, or an iterable into a vector.
 *
 * @complexity O(n)
 */
export function from<A>(sequence: A[] | ArrayLike<A> | Iterable<A>): Vector<A>
export function from<A>(sequence: any): Vector<A> {
  const l = emptyPushable<A>()
  if (sequence.length > 0 && (sequence[0] !== undefined || 0 in sequence)) {
    for (let i = 0; i < sequence.length; ++i) {
      push_(l, sequence[i])
    }
  } else if (Symbol.iterator in sequence) {
    const iterator = sequence[Symbol.iterator]()
    let cur
    // tslint:disable-next-line:no-conditional-assignment
    while (!(cur = iterator.next()).done) {
      push_(l, cur.value)
    }
  }
  return l
}

/**
 * Returns a vector of numbers between an inclusive lower bound and an exclusive upper bound.
 *
 * @complexity O(n)
 */
export function range(end: number): (start: number) => Vector<number> {
  return (start) => range_(start, end)
}

/**
 * Returns a vector of numbers between an inclusive lower bound and an exclusive upper bound.
 *
 * @complexity O(n)
 */
export function range_(start: number, end: number): Vector<number> {
  const vector = emptyPushable<number>()
  for (let i = start; i < end; ++i) {
    push_(vector, i)
  }
  return vector
}

/**
 * Returns a vector of a given length that contains the specified value
 * in all positions.
 *
 * @complexity O(n)
 */
export function repeat(times: number): <A>(value: A) => Vector<A> {
  return (value) => repeat_(value, times)
}

/**
 * Returns a vector of a given length that contains the specified value
 * in all positions.
 *
 * @complexity O(n)
 */
export function repeat_<A>(value: A, times: number): Vector<A> {
  const l = emptyPushable<A>()
  while (--times >= 0) {
    push_(l, value)
  }
  return l
}

/**
 * Generates a new vector by calling a function with the current index
 * `n` times.
 *
 * @complexity O(n)
 */
export function times(times: number): <A>(func: (index: number) => A) => Vector<A> {
  return (func) => times_(func, times)
}

/**
 * Generates a new vector by calling a function with the current index
 * `n` times.
 *
 * @complexity O(n)
 */
export function times_<A>(func: (index: number) => A, times: number): Vector<A> {
  const l = emptyPushable<A>()
  for (let i = 0; i < times; i++) {
    push_(l, func(i))
  }
  return l
}

function nodeNthDense(node: Node, depth: number, index: number): any {
  let current = node
  for (; depth >= 0; --depth) {
    current = current.array[(index >> (depth * branchBits)) & mask]
  }
  return current
}

function handleOffset(depth: number, offset: number, index: number): number {
  index += offset
  for (; depth >= 0; --depth) {
    index = index - (offset & (mask << (depth * branchBits)))
    if (((index >> (depth * branchBits)) & mask) !== 0) {
      break
    }
  }
  return index
}

function nodeNth(node: Node, depth: number, offset: number, index: number): any {
  let path
  let current = node
  while (current.sizes !== undefined) {
    path = (index >> (depth * branchBits)) & mask
    while (current.sizes[path]! <= index) {
      path++
    }
    if (path !== 0) {
      index -= current.sizes[path - 1]!
      offset = 0 // Offset is discarded if the left spine isn't traversed
    }
    depth--
    current = current.array[path]
  }
  return nodeNthDense(
    current,
    depth,
    offset === 0 ? index : handleOffset(depth, offset, index)
  )
}

/**
 * Gets the nth element of the vector. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 */
export function unsafeNth_<A>(self: Vector<A>, index: number): A | undefined {
  return O.toUndefined(nth_(self, index))
}

/**
 * Gets the nth element of the vector. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 */
export function unsafeNth(index: number): <A>(self: Vector<A>) => A | undefined {
  return (self) => unsafeNth_(self, index)
}

/**
 * Gets the nth element of the vector. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 */
export function nth_<A>(self: Vector<A>, index: number): O.Option<A> {
  if (index < 0 || self.length <= index) {
    return O.none
  }
  const prefixSize = getPrefixSize(self)
  const suffixSize = getSuffixSize(self)
  if (index < prefixSize) {
    return O.some(self.prefix[prefixSize - index - 1]!)
  } else if (index >= self.length - suffixSize) {
    return O.some(self.suffix[index - (self.length - suffixSize)]!)
  }
  const { offset } = self
  const depth = getDepth(self)
  return O.some(
    self.root!.sizes === undefined
      ? nodeNthDense(
          self.root!,
          depth,
          offset === 0
            ? index - prefixSize
            : handleOffset(depth, offset, index - prefixSize)
        )
      : nodeNth(self.root!, depth, offset, index - prefixSize)
  )
}

/**
 * Gets the nth element of the vector. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 */
export function nth(index: number): <A>(self: Vector<A>) => O.Option<A> {
  return (self) => nth_(self, index)
}

function setSizes(node: Node, height: number): Node {
  let sum = 0
  const sizeTable = []
  for (let i = 0; i < node.array.length; ++i) {
    sum += sizeOfSubtree(node.array[i], height - 1)
    sizeTable[i] = sum
  }
  node.sizes = sizeTable
  return node
}

/**
 * Returns the number of elements stored in the node.
 */
function sizeOfSubtree(node: Node, height: number): number {
  if (height !== 0) {
    if (node.sizes !== undefined) {
      return arrayLast(node.sizes)
    } else {
      // the node is leftwise dense so all all but the last child are full
      const lastSize = sizeOfSubtree(arrayLast(node.array), height - 1)
      return ((node.array.length - 1) << (height * branchBits)) + lastSize
    }
  } else {
    return node.array.length
  }
}

// prepend & append

function affixPush<A>(a: A, array: A[], length: number): A[] {
  if (array.length === length) {
    array.push(a)
    return array
  } else {
    const newArray: A[] = []
    copyIndices(array, 0, newArray, 0, length)
    newArray.push(a)
    return newArray
  }
}

/**
 * Prepends an element to the front of a vector and returns the new vector.
 *
 * @complexity O(1)
 */
export function prepend_<A>(self: Vector<A>, value: A): Vector<A> {
  const prefixSize = getPrefixSize(self)
  if (prefixSize < 32) {
    return new Vector<A>(
      incrementPrefix(self.bits),
      self.offset,
      self.length + 1,
      affixPush(value, self.prefix, prefixSize),
      self.root,
      self.suffix
    )
  } else {
    const newVector = cloneVector(self)
    prependNodeToTree(newVector, reverseArray(self.prefix))
    const newPrefix = [value]
    newVector.prefix = newPrefix
    newVector.length++
    newVector.bits = setPrefix(1, newVector.bits)
    return newVector
  }
}

/**
 * Prepends an element to the front of a vector and returns the new vector.
 *
 * @complexity O(1)
 */
export function prepend<A>(value: A): (self: Vector<A>) => Vector<A> {
  return (self) => prepend_(self, value)
}

/**
 * Traverses down the left edge of the tree and copies k nodes.
 * Returns the last copied node.
 * @param vec
 * @param k The number of nodes to copy. Should always be at least 1.
 */
function copyLeft(vec: MutableVector<any>, k: number): Node {
  let currentNode = cloneNode(vec.root!) // copy root
  vec.root = currentNode // install copy of root

  for (let i = 1; i < k; ++i) {
    const index = 0 // go left
    if (currentNode.sizes !== undefined) {
      for (let i = 0; i < currentNode.sizes.length; ++i) {
        currentNode.sizes[i] += 32
      }
    }
    const newNode = cloneNode(currentNode.array[index])
    // Install the copied node
    currentNode.array[index] = newNode
    currentNode = newNode
  }
  return currentNode
}

/**
 * Prepends an element to a node
 */
function nodePrepend(value: any, size: number, node: Node): Node {
  const array = arrayPrepend(value, node.array)
  let sizes = undefined
  if (node.sizes !== undefined) {
    sizes = new Array(node.sizes.length + 1)
    sizes[0] = size
    for (let i = 0; i < node.sizes.length; ++i) {
      sizes[i + 1] = node.sizes[i]! + size
    }
  }
  return new Node(sizes, array)
}

/**
 * Prepends a node to a tree. Either by shifting the nodes in the root
 * left or by increasing the height
 */
function prependTopTree<A>(vec: MutableVector<A>, depth: number, node: Node): number {
  let newOffset
  if (vec.root!.array.length < branchingFactor) {
    // There is space in the root, there is never a size table in this
    // case
    newOffset = 32 ** depth - 32
    vec.root = new Node(
      undefined,
      arrayPrepend(createPath(depth - 1, node), vec.root!.array)
    )
  } else {
    // We need to create a new root
    vec.bits = incrementDepth(vec.bits)
    const sizes =
      vec.root!.sizes === undefined ? undefined : [32, arrayLast(vec.root!.sizes!) + 32]
    newOffset = depth === 0 ? 0 : 32 ** (depth + 1) - 32
    vec.root = new Node(sizes, [createPath(depth, node), vec.root])
  }
  return newOffset
}

/**
 * Takes a vector and a node tail. It then prepends the node to the tree
 * of the vector.
 * @param vec The subject for prepending. `l` will be mutated. Nodes in
 * the tree will _not_ be mutated.
 * @param node The node that should be prepended to the tree.
 */
function prependNodeToTree<A>(vec: MutableVector<A>, array: A[]): Vector<A> {
  if (vec.root === undefined) {
    if (getSuffixSize(vec) === 0) {
      // ensure invariant 1
      vec.bits = setSuffix(array.length, vec.bits)
      vec.suffix = array
    } else {
      vec.root = new Node(undefined, array)
    }
    return vec
  } else {
    const node = new Node(undefined, array)
    const depth = getDepth(vec)
    let newOffset = 0
    if (vec.root.sizes === undefined) {
      if (vec.offset !== 0) {
        newOffset = vec.offset - branchingFactor
        vec.root = prependDense(vec.root, depth, vec.offset, node)
      } else {
        // in this case we can be sure that the is not room in the tree
        // for the new node
        newOffset = prependTopTree(vec, depth, node)
      }
    } else {
      // represents how many nodes _with size-tables_ that we should copy.
      let copyableCount = 0
      // go down while there is size tables
      let nodesTraversed = 0
      let currentNode = vec.root
      while (currentNode.sizes !== undefined && nodesTraversed < depth) {
        ++nodesTraversed
        if (currentNode.array.length < 32) {
          // there is room if offset is > 0 or if the first node does not
          // contain as many nodes as it possibly can
          copyableCount = nodesTraversed
        }
        currentNode = currentNode.array[0]
      }
      if (vec.offset !== 0) {
        const copiedNode = copyLeft(vec, nodesTraversed)
        for (let i = 0; i < copiedNode.sizes!.length; ++i) {
          copiedNode.sizes![i] += branchingFactor
        }
        copiedNode.array[0] = prependDense(
          copiedNode.array[0],
          depth - nodesTraversed,
          vec.offset,
          node
        )
        vec.offset = vec.offset - branchingFactor
        return vec
      } else {
        if (copyableCount === 0) {
          vec.offset = prependTopTree(vec, depth, node)
        } else {
          let parent: Node | undefined
          let prependableNode: Node
          // Copy the part of the path with size tables
          if (copyableCount > 1) {
            parent = copyLeft(vec, copyableCount - 1)
            prependableNode = parent.array[0]
          } else {
            parent = undefined
            prependableNode = vec.root!
          }
          const path = createPath(depth - copyableCount, node)
          // add offset
          vec.offset = 32 ** (depth - copyableCount + 1) - 32
          const prepended = nodePrepend(path, 32, prependableNode)
          if (parent === undefined) {
            vec.root = prepended
          } else {
            parent.array[0] = prepended
          }
        }
        return vec
      }
    }
    vec.offset = newOffset
    return vec
  }
}

/**
 * Prepends a node to a dense tree. The given `offset` is never zero.
 */
function prependDense(node: Node, depth: number, offset: number, value: Node): Node {
  // We're indexing down `offset - 1`. At each step `path` is either 0 or -1.
  const curOffset = (offset >> (depth * branchBits)) & mask
  const path = (((offset - 1) >> (depth * branchBits)) & mask) - curOffset
  if (path < 0) {
    return new Node(undefined, arrayPrepend(createPath(depth - 1, value), node.array))
  } else {
    const array = copyArray(node.array)
    array[0] = prependDense(array[0], depth - 1, offset, value)
    return new Node(undefined, array)
  }
}

/**
 * Appends an element to the end of a vector and returns the new vector.
 *
 * @complexity O(n)
 */
export function append_<A>(self: Vector<A>, value: A): Vector<A> {
  const suffixSize = getSuffixSize(self)
  if (suffixSize < 32) {
    return new Vector(
      incrementSuffix(self.bits),
      self.offset,
      self.length + 1,
      self.prefix,
      self.root,
      affixPush(value, self.suffix, suffixSize)
    )
  }
  const newSuffix = [value]
  const newVector = cloneVector(self)
  appendNodeToTree(newVector, self.suffix)
  newVector.suffix = newSuffix
  newVector.length++
  newVector.bits = setSuffix(1, newVector.bits)
  return newVector
}

/**
 * Appends an element to the end of a vector and returns the new vector.
 *
 * @complexity O(n)
 */
export function append<A>(value: A): (self: Vector<A>) => Vector<A> {
  return (self) => append_(self, value)
}

/**
 * Gets the length of a vector.
 *
 * @complexity `O(1)`
 */
export function size(l: Vector<any>): number {
  return l.length
}

/**
 * Returns the first element of the vector. If the vector is empty the
 * function returns undefined.
 *
 * @complexity O(1)
 */
export function unsafeFirst<A>(self: Vector<A>): A | undefined {
  return O.toUndefined(first(self))
}

/**
 * Returns the first element of the vector. If the vector is empty the
 * function returns undefined.
 *
 * @complexity O(1)
 */
export function first<A>(self: Vector<A>): O.Option<A> {
  const prefixSize = getPrefixSize(self)
  return prefixSize !== 0
    ? O.some(self.prefix[prefixSize - 1]!)
    : self.length !== 0
    ? O.some(self.suffix[0]!)
    : O.none
}

/**
 * Returns the last element of the vector. If the vector is empty the
 * function returns `undefined`.
 *
 * @complexity O(1)
 */
export function unsafeLast<A>(self: Vector<A>): A | undefined {
  return O.toUndefined(last(self))
}

/**
 * Returns the last element of the vector. If the vector is empty the
 * function returns `undefined`.
 *
 * @complexity O(1)
 */
export function last<A>(self: Vector<A>): O.Option<A> {
  const suffixSize = getSuffixSize(self)
  return suffixSize !== 0
    ? O.some(self.suffix[suffixSize - 1]!)
    : self.length !== 0
    ? O.some(self.prefix[0]!)
    : O.none
}

// map

function mapArray<A, B>(f: (a: A) => B, array: A[]): B[] {
  const result = new Array(array.length)
  for (let i = 0; i < array.length; ++i) {
    result[i] = f(array[i]!)
  }
  return result
}

function mapNode<A, B>(f: (a: A) => B, node: Node, depth: number): Node {
  if (depth !== 0) {
    const { array } = node
    const result = new Array(array.length)
    for (let i = 0; i < array.length; ++i) {
      result[i] = mapNode(f, array[i], depth - 1)
    }
    return new Node(node.sizes, result)
  } else {
    return new Node(undefined, mapArray(f, node.array))
  }
}

function mapPrefix<A, B>(f: (a: A) => B, prefix: A[], length: number): B[] {
  const newPrefix = new Array(length)
  for (let i = length - 1; 0 <= i; --i) {
    newPrefix[i] = f(prefix[i]!)
  }
  return newPrefix
}

function mapAffix<A, B>(f: (a: A) => B, suffix: A[], length: number): B[] {
  const newSuffix = new Array(length)
  for (let i = 0; i < length; ++i) {
    newSuffix[i] = f(suffix[i]!)
  }
  return newSuffix
}

/**
 * Applies a function to each element in the given vector and returns a
 * new vector of the values that the function return.
 *
 * @complexity O(n)
 */
export function map_<A, B>(self: Vector<A>, f: (a: A) => B): Vector<B> {
  return new Vector(
    self.bits,
    self.offset,
    self.length,
    mapPrefix(f, self.prefix, getPrefixSize(self)),
    self.root === undefined ? undefined : mapNode(f, self.root, getDepth(self)),
    mapAffix(f, self.suffix, getSuffixSize(self))
  )
}

/**
 * Applies a function to each element in the given vector and returns a
 * new vector of the values that the function return.
 *
 * @complexity O(n)
 */
export function map<A, B>(f: (a: A) => B): (self: Vector<A>) => Vector<B> {
  return (self) =>
    new Vector(
      self.bits,
      self.offset,
      self.length,
      mapPrefix(f, self.prefix, getPrefixSize(self)),
      self.root === undefined ? undefined : mapNode(f, self.root, getDepth(self)),
      mapAffix(f, self.suffix, getSuffixSize(self))
    )
}

/**
 * Extracts the specified property from each object in the vector.
 */
export function pluck_<A, K extends keyof A>(self: Vector<A>, key: K): Vector<A[K]> {
  return map_(self, (a) => a[key])
}

/**
 * Extracts the specified property from each object in the vector.
 */
export function pluck<A, K extends keyof A>(key: K): (self: Vector<A>) => Vector<A[K]> {
  return (self) => pluck_(self, key)
}

// fold

function foldlSuffix<A, B>(
  f: (acc: B, value: A) => B,
  acc: B,
  array: A[],
  length: number
): B {
  for (let i = 0; i < length; ++i) {
    acc = f(acc, array[i]!)
  }
  return acc
}

function foldlPrefix<A, B>(
  f: (acc: B, value: A) => B,
  acc: B,
  array: A[],
  length: number
): B {
  for (let i = length - 1; 0 <= i; --i) {
    acc = f(acc, array[i]!)
  }
  return acc
}

function foldlNode<A, B>(
  f: (acc: B, value: A) => B,
  acc: B,
  node: Node,
  depth: number
): B {
  const { array } = node
  if (depth === 0) {
    return foldlSuffix(f, acc, array, array.length)
  }
  for (let i = 0; i < array.length; ++i) {
    acc = foldlNode(f, acc, array[i], depth - 1)
  }
  return acc
}

/**
 * Folds a function over a vector. Left-associative.
 */
export function reduce_<A, B>(
  self: Vector<A>,
  initial: B,
  f: (acc: B, value: A) => B
): B {
  const suffixSize = getSuffixSize(self)
  const prefixSize = getPrefixSize(self)
  initial = foldlPrefix(f, initial, self.prefix, prefixSize)
  if (self.root !== undefined) {
    initial = foldlNode(f, initial, self.root, getDepth(self))
  }
  return foldlSuffix(f, initial, self.suffix, suffixSize)
}

/**
 * Folds a function over a vector. Left-associative.
 */
export function reduce<A, B>(
  initial: B,
  f: (acc: B, value: A) => B
): (self: Vector<A>) => B {
  return (self) => reduce_(self, initial, f)
}

/**
 * Folds a function over a vector from left to right while collecting
 * all the intermediate steps in a resulting vector.
 */
export function scan_<A, B>(
  self: Vector<A>,
  initial: B,
  f: (acc: B, value: A) => B
): Vector<B> {
  return reduce_(self, push_(emptyPushable<B>(), initial), (l2, a) =>
    push_(l2, f(unsafeLast(l2)!, a))
  )
}

/**
 * Folds a function over a vector from left to right while collecting
 * all the intermediate steps in a resulting vector.
 */
export function scan<A, B>(
  initial: B,
  f: (acc: B, value: A) => B
): (self: Vector<A>) => Vector<B> {
  return (self) => scan_(self, initial, f)
}

/**
 * Invokes a given callback for each element in the vector from left to
 * right. Returns `undefined`.
 *
 * This function is very similar to map. It should be used instead of
 * `map` when the mapping function has side-effects. Whereas `map`
 * constructs a new vector `forEach` merely returns `undefined`. This
 * makes `forEach` faster when the new vector is unneeded.
 *
 * @complexity O(n)
 */
export function forEach_<A>(self: Vector<A>, callback: (a: A) => void): void {
  reduce_(self, undefined as void, (_, element) => callback(element))
}

/**
 * Invokes a given callback for each element in the vector from left to
 * right. Returns `undefined`.
 *
 * This function is very similar to map. It should be used instead of
 * `map` when the mapping function has side-effects. Whereas `map`
 * constructs a new vector `forEach` merely returns `undefined`. This
 * makes `forEach` faster when the new vector is unneeded.
 *
 * @complexity O(n)
 */
export function forEach<A>(callback: (a: A) => void): (self: Vector<A>) => void {
  return (self) => forEach_(self, callback)
}

/**
 * Returns a new vector that only contains the elements of the original
 * vector for which the predicate returns `true`.
 *
 * @complexity O(n)
 */
export function filter_<A, B extends A>(
  self: Vector<A>,
  predicate: (a: A) => a is B
): Vector<B>
export function filter_<A>(self: Vector<A>, predicate: (a: A) => boolean): Vector<A>
export function filter_<A>(self: Vector<A>, predicate: (a: A) => boolean): Vector<A> {
  return reduce_(self, emptyPushable(), (acc, a) =>
    predicate(a) ? push_(acc, a) : acc
  )
}

/**
 * Returns a new vector that only contains the elements of the original
 * vector for which the predicate returns `true`.
 *
 * @complexity O(n)
 */
export function filter<A, B extends A>(
  predicate: (a: A) => a is B
): (self: Vector<A>) => Vector<B>
export function filter<A>(predicate: (a: A) => boolean): (self: Vector<A>) => Vector<A>
export function filter<A>(
  predicate: (a: A) => boolean
): (self: Vector<A>) => Vector<A> {
  return (self) =>
    reduce_(self, emptyPushable(), (acc, a) => (predicate(a) ? push_(acc, a) : acc))
}

/**
 * Returns a new vector that only contains the elements of the original
 * vector for which the f returns `Some`.
 *
 * @complexity O(n)
 */
export function filterMap_<A, B>(self: Vector<A>, f: (a: A) => O.Option<B>): Vector<B> {
  return reduce_(self, emptyPushable(), (acc, a) => {
    const fa = f(a)
    if (fa._tag === "Some") {
      push_(acc, fa.value)
    }
    return acc
  })
}

/**
 * Returns a new vector that only contains the elements of the original
 * vector for which the f returns `Some`.
 *
 * @complexity O(n)
 */
export function filterMap<A, B>(
  f: (a: A) => O.Option<B>
): (self: Vector<A>) => Vector<B> {
  return (self) => filterMap_(self, f)
}

/**
 * Filter out optional values
 */
export function compact<A>(self: Vector<O.Option<A>>): Vector<A> {
  return filterMap((x: O.Option<A>) => x)(self)
}

/**
 * Returns a new vector that only contains the elements of the original
 * vector for which the predicate returns `false`.
 *
 * @complexity O(n)
 */
export function filterNot_<A>(
  self: Vector<A>,
  predicate: (a: A) => boolean
): Vector<A> {
  return reduce_(self, emptyPushable(), (acc, a) =>
    predicate(a) ? acc : push_(acc, a)
  )
}

/**
 * Returns a new vector that only contains the elements of the original
 * vector for which the predicate returns `false`.
 *
 * @complexity O(n)
 */
export function filterNot<A>(
  predicate: (a: A) => boolean
): (self: Vector<A>) => Vector<A> {
  return (self) => filterNot_(self, predicate)
}

/**
 * Splits the vector into two vectors. One vector that contains all the
 * values for which the predicate returns `true` and one containing
 * the values for which it returns `false`.
 *
 * @complexity O(n)
 */
export function partition_<A, B extends A>(
  self: Vector<A>,
  predicate: (a: A) => a is B
): Tp.Tuple<[Vector<B>, Vector<Exclude<A, B>>]>
export function partition_<A>(
  self: Vector<A>,
  predicate: (a: A) => boolean
): Tp.Tuple<[Vector<A>, Vector<A>]>
export function partition_<A>(
  self: Vector<A>,
  predicate: (a: A) => boolean
): Tp.Tuple<[Vector<A>, Vector<A>]> {
  return reduce_(
    self,
    Tp.tuple(emptyPushable<A>(), emptyPushable<A>()) as Tp.Tuple<
      [MutableVector<A>, MutableVector<A>]
    >,
    (arr, a) => (predicate(a) ? push_(arr.get(0), a) : push_(arr.get(1), a), arr)
  )
}

/**
 * Splits the vector into two vectors. One vector that contains all the
 * values for which the predicate returns `true` and one containing
 * the values for which it returns `false`.
 *
 * @complexity O(n)
 */
export function partition<A, B extends A>(
  predicate: (a: A) => a is B
): (self: Vector<A>) => Tp.Tuple<[Vector<B>, Vector<Exclude<A, B>>]>
export function partition<A>(
  predicate: (a: A) => boolean
): (self: Vector<A>) => Tp.Tuple<[Vector<A>, Vector<A>]>
export function partition<A>(
  predicate: (a: A) => boolean
): (self: Vector<A>) => Tp.Tuple<[Vector<A>, Vector<A>]> {
  return (self) => partition_(self, predicate)
}

/**
 * Splits the vector into two vectors. One vector that contains the lefts
 * and one contains the rights
 *
 * @complexity O(n)
 */
export function partitionMap_<A, B, C>(
  self: Vector<A>,
  f: (_: A) => Either<B, C>
): Tp.Tuple<[Vector<B>, Vector<C>]> {
  return reduce_(
    self,
    Tp.tuple(emptyPushable<B>(), emptyPushable<C>()) as Tp.Tuple<
      [MutableVector<B>, MutableVector<C>]
    >,
    (arr, a) => {
      const fa = f(a)
      if (fa._tag === "Left") {
        push_(arr.get(0), fa.left)
      } else {
        push_(arr.get(1), fa.right)
      }
      return arr
    }
  )
}

/**
 * Splits the vector into two vectors. One vector that contains the lefts
 * and one contains the rights
 *
 * @complexity O(n)
 */
export function partitionMap<A, B, C>(
  f: (_: A) => Either<B, C>
): (self: Vector<A>) => Tp.Tuple<[Vector<B>, Vector<C>]> {
  return (self) => partitionMap_(self, f)
}

/**
 * Splits the vector into two vectors. One vector that contains the lefts
 * and one contains the rights
 *
 * @complexity O(n)
 */
export function separate<B, C>(
  self: Vector<Either<B, C>>
): Tp.Tuple<[Vector<B>, Vector<C>]> {
  return partitionMap_(self, identity)
}

/**
 * Concats the strings in the vector separated by a specified separator.
 */
export function join_(self: Vector<string>, separator: string): string {
  return reduce_(self, "", (a, b) => (a.length === 0 ? b : a + separator + b))
}

/**
 * Concats the strings in the vector separated by a specified separator.
 */
export function join(separator: string): (self: Vector<string>) => string {
  return (self) => join_(self, separator)
}

function foldrSuffix<A, B>(
  f: (value: A, acc: B) => B,
  initial: B,
  array: A[],
  length: number
): B {
  let acc = initial
  for (let i = length - 1; 0 <= i; --i) {
    acc = f(array[i]!, acc)
  }
  return acc
}

function foldrPrefix<A, B>(
  f: (value: A, acc: B) => B,
  initial: B,
  array: A[],
  length: number
): B {
  let acc = initial
  for (let i = 0; i < length; ++i) {
    acc = f(array[i]!, acc)
  }
  return acc
}

function foldrNode<A, B>(
  f: (value: A, acc: B) => B,
  initial: B,
  { array }: Node,
  depth: number
): B {
  if (depth === 0) {
    return foldrSuffix(f, initial, array, array.length)
  }
  let acc = initial
  for (let i = array.length - 1; 0 <= i; --i) {
    acc = foldrNode(f, acc, array[i], depth - 1)
  }
  return acc
}

/**
 * Folds a function over a vector. Right-associative.
 *
 * @complexity O(n)
 */
export function reduceRight_<A, B>(
  self: Vector<A>,
  initial: B,
  f: (value: A, acc: B) => B
): B {
  const suffixSize = getSuffixSize(self)
  const prefixSize = getPrefixSize(self)
  let acc = foldrSuffix(f, initial, self.suffix, suffixSize)
  if (self.root !== undefined) {
    acc = foldrNode(f, acc, self.root, getDepth(self))
  }
  return foldrPrefix(f, acc, self.prefix, prefixSize)
}

/**
 * Folds a function over a vector. Right-associative.
 *
 * @complexity O(n)
 */
export function reduceRight<A, B>(
  initial: B,
  f: (value: A, acc: B) => B
): (self: Vector<A>) => B {
  return (self) => reduceRight_(self, initial, f)
}

/**
 * Applies a vector of functions to a vector of values.
 */
export function ap_<A, B>(self: Vector<(a: A) => B>, vecA: Vector<A>): Vector<B> {
  return flatten(map_(self, (f) => map_(vecA, f)))
}

/**
 * Applies a vector of functions to a vector of values.
 */
export function ap<A, B>(vecA: Vector<A>): (self: Vector<(a: A) => B>) => Vector<B> {
  return (self) => ap_(self, vecA)
}

/**
 * Flattens a vector of vectors into a vector. Note that this function does
 * not flatten recursively. It removes one level of nesting only.
 *
 * @complexity O(n * log(m)), where n is the length of the outer vector and m the length of the inner vectors.
 */
export function flatten<A>(self: Vector<Vector<A>>): Vector<A> {
  return reduce_<Vector<A>, Vector<A>>(self, empty(), concat_)
}

/**
 * Maps a function over a vector and concatenates all the resulting
 * vectors together.
 */
export function chain_<A, B>(self: Vector<A>, f: (a: A) => Vector<B>): Vector<B> {
  return flatten(map_(self, f))
}

/**
 * Maps a function over a vector and concatenates all the resulting
 * vectors together.
 */
export function chain<A, B>(f: (a: A) => Vector<B>): (self: Vector<A>) => Vector<B> {
  return (self) => chain_(self, f)
}

// callback fold

type FoldCb<Input, State> = (input: Input, state: State) => boolean

function foldlArrayCb<A, B>(
  cb: FoldCb<A, B>,
  state: B,
  array: A[],
  from: number,
  to: number
): boolean {
  for (var i = from; i < to && cb(array[i]!, state); ++i) {
    //
  }
  return i === to
}

function foldrArrayCb<A, B>(
  cb: FoldCb<A, B>,
  state: B,
  array: A[],
  from: number,
  to: number
): boolean {
  for (var i = from - 1; to <= i && cb(array[i]!, state); --i) {
    //
  }
  return i === to - 1
}

function foldlNodeCb<A, B>(
  cb: FoldCb<A, B>,
  state: B,
  node: Node,
  depth: number
): boolean {
  const { array } = node
  if (depth === 0) {
    return foldlArrayCb(cb, state, array, 0, array.length)
  }
  const to = array.length
  for (let i = 0; i < to; ++i) {
    if (!foldlNodeCb(cb, state, array[i], depth - 1)) {
      return false
    }
  }
  return true
}

/**
 * This function is a lot like a fold. But the reducer function is
 * supposed to mutate its state instead of returning it. Instead of
 * returning a new state it returns a boolean that tells wether or not
 * to continue the fold. `true` indicates that the folding should
 * continue.
 */
function foldlCb<A, B>(cb: FoldCb<A, B>, state: B, l: Vector<A>): B {
  const prefixSize = getPrefixSize(l)
  if (
    !foldrArrayCb(cb, state, l.prefix, prefixSize, 0) ||
    (l.root !== undefined && !foldlNodeCb(cb, state, l.root, getDepth(l)))
  ) {
    return state
  }
  const suffixSize = getSuffixSize(l)
  foldlArrayCb(cb, state, l.suffix, 0, suffixSize)
  return state
}

function foldrNodeCb<A, B>(
  cb: FoldCb<A, B>,
  state: B,
  node: Node,
  depth: number
): boolean {
  const { array } = node
  if (depth === 0) {
    return foldrArrayCb(cb, state, array, array.length, 0)
  }
  for (let i = array.length - 1; 0 <= i; --i) {
    if (!foldrNodeCb(cb, state, array[i], depth - 1)) {
      return false
    }
  }
  return true
}

function foldrCb<A, B>(cb: FoldCb<A, B>, state: B, l: Vector<A>): B {
  const suffixSize = getSuffixSize(l)
  const prefixSize = getPrefixSize(l)
  if (
    !foldrArrayCb(cb, state, l.suffix, suffixSize, 0) ||
    (l.root !== undefined && !foldrNodeCb(cb, state, l.root, getDepth(l)))
  ) {
    return state
  }
  const prefix = l.prefix
  foldlArrayCb(cb, state, l.prefix, prefix.length - prefixSize, prefix.length)
  return state
}

// functions based on foldlCb

type FoldlWhileState<A, B> = {
  predicate: (b: B, a: A) => boolean
  result: B
  f: (acc: B, value: A) => B
}

/**
 * Similar to `foldl`. But, for each element it calls the predicate function
 * _before_ the folding function and stops folding if it returns `false`.
 *
 * @category Folds
 * @example
 * const isOdd = (_acc:, x) => x % 2 === 1;
 *
 * const xs = L.vector(1, 3, 5, 60, 777, 800);
 * foldlWhile(isOdd, (n, m) => n + m, 0, xs) //=> 9
 *
 * const ys = L.vector(2, 4, 6);
 * foldlWhile(isOdd, (n, m) => n + m, 111, ys) //=> 111
 */
function foldlWhileCb<A, B>(a: A, state: FoldlWhileState<A, B>): boolean {
  if (state.predicate(state.result, a) === false) {
    return false
  }
  state.result = state.f(state.result, a)
  return true
}

export function reduceWhile_<A, B>(
  self: Vector<A>,
  initial: B,
  predicate: (acc: B, value: A) => boolean,
  f: (acc: B, value: A) => B
): B {
  return foldlCb<A, FoldlWhileState<A, B>>(
    foldlWhileCb,
    { predicate, f, result: initial },
    self
  ).result
}

export function reduceWhile<A, B>(
  initial: B,
  predicate: (acc: B, value: A) => boolean,
  f: (acc: B, value: A) => B
): (self: Vector<A>) => B {
  return (self) => reduceWhile_(self, initial, predicate, f)
}

type PredState = {
  predicate: (a: any) => boolean
  result: any
}

function everyCb<A>(value: A, state: any): boolean {
  return (state.result = state.predicate(value))
}

/**
 * Returns `true` if and only if the predicate function returns `true`
 * for all elements in the given vector.
 *
 * @complexity O(n)
 */
export function every_<A>(self: Vector<A>, predicate: (a: A) => boolean): boolean {
  return foldlCb<A, PredState>(everyCb, { predicate, result: true }, self).result
}

/**
 * Returns `true` if and only if the predicate function returns `true`
 * for all elements in the given vector.
 *
 * @complexity O(n)
 */
export function every<A>(predicate: (a: A) => boolean): (self: Vector<A>) => boolean {
  return (self) => every_(self, predicate)
}

function someCb<A>(value: A, state: any): boolean {
  return !(state.result = state.predicate(value))
}

/**
 * Returns true if and only if there exists an element in the vector for
 * which the predicate returns true.
 *
 * @complexity O(n)
 */
export function some_<A>(self: Vector<A>, predicate: (a: A) => boolean): boolean {
  return foldlCb<A, PredState>(someCb, { predicate, result: false }, self).result
}

/**
 * Returns true if and only if there exists an element in the vector for
 * which the predicate returns true.
 *
 * @complexity O(n)
 */
export function some<A>(predicate: (a: A) => boolean): (self: Vector<A>) => boolean {
  return (self) => some_(self, predicate)
}

/**
 * Returns `true` if and only if the predicate function returns
 * `false` for every element in the given vector.
 *
 * @complexity O(n)
 */
export function none_<A>(self: Vector<A>, predicate: (a: A) => boolean): boolean {
  return !some_(self, predicate)
}

/**
 * Returns `true` if and only if the predicate function returns
 * `false` for every element in the given vector.
 *
 * @complexity O(n)
 */
export function none<A>(predicate: (a: A) => boolean): (self: Vector<A>) => boolean {
  return (self) => none_(self, predicate)
}

function findCb<A>(value: A, state: PredState): boolean {
  if (state.predicate(value)) {
    state.result = O.some(value)
    return false
  } else {
    return true
  }
}

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function unsafeFind_<A>(
  self: Vector<A>,
  predicate: (a: A) => boolean
): A | undefined {
  return O.toUndefined(find_(self, predicate))
}

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function unsafeFind<A>(
  predicate: (a: A) => boolean
): (self: Vector<A>) => A | undefined {
  return (self) => unsafeFind_(self, predicate)
}

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function find_<A>(self: Vector<A>, predicate: (a: A) => boolean): O.Option<A> {
  return foldlCb<A, PredState>(findCb, { predicate, result: O.none }, self).result
}

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function find<A>(predicate: (a: A) => boolean) {
  return (self: Vector<A>) => find_(self, predicate)
}

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function unsafeFindLast_<A>(
  self: Vector<A>,
  predicate: (a: A) => boolean
): A | undefined {
  return O.toUndefined(findLast_(self, predicate))
}

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function unsafeFindLast<A>(
  predicate: (a: A) => boolean
): (self: Vector<A>) => A | undefined {
  return (self) => unsafeFindLast_(self, predicate)
}

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function findLast_<A>(
  self: Vector<A>,
  predicate: (a: A) => boolean
): O.Option<A> {
  return foldrCb<A, PredState>(findCb, { predicate, result: O.none }, self).result
}

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function findLast<A>(
  predicate: (a: A) => boolean
): (self: Vector<A>) => O.Option<A> {
  return (self) => findLast_(self, predicate)
}

type IndexOfState = {
  element: any
  found: boolean
  index: number
}

function indexOfCb(value: any, state: IndexOfState): boolean {
  ++state.index
  return !(state.found = elementEquals(value, state.element))
}

/**
 * Returns the index of the _first_ element in the vector that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 */
export function indexOf_<A>(self: Vector<A>, element: A): number {
  const state = { element, found: false, index: -1 }
  foldlCb(indexOfCb, state, self)
  return state.found ? state.index : -1
}

/**
 * Returns the index of the _first_ element in the vector that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 */
export function indexOf<A>(element: A): (self: Vector<A>) => number {
  return (self) => indexOf_(self, element)
}

/**
 * Returns the index of the _last_ element in the vector that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 */
export function lastIndexOf_<A>(self: Vector<A>, element: A): number {
  const state = { element, found: false, index: 0 }
  foldrCb(indexOfCb, state, self)
  return state.found ? self.length - state.index : -1
}

/**
 * Returns the index of the _last_ element in the vector that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 */
export function lastIndexOf<A>(element: A): (self: Vector<A>) => number {
  return (self) => lastIndexOf_(self, element)
}

type FindIndexState = {
  predicate: (a: any) => boolean
  found: boolean
  index: number
}

function findIndexCb<A>(value: A, state: FindIndexState): boolean {
  ++state.index
  return !(state.found = state.predicate(value))
}

/**
 * Returns the index of the `first` element for which the predicate
 * returns true. If no such element is found the function returns
 * `-1`.
 *
 * @complexity O(n)
 */
export function findIndex_<A>(self: Vector<A>, predicate: (a: A) => boolean): number {
  const { found, index } = foldlCb<A, FindIndexState>(
    findIndexCb,
    { predicate, found: false, index: -1 },
    self
  )
  return found ? index : -1
}

/**
 * Returns the index of the `first` element for which the predicate
 * returns true. If no such element is found the function returns
 * `-1`.
 *
 * @complexity O(n)
 */
export function findIndex<A>(
  predicate: (a: A) => boolean
): (self: Vector<A>) => number {
  return (self) => findIndex_(self, predicate)
}

type ContainsState = {
  element: any
  result: boolean
}

const containsState: ContainsState = {
  element: undefined,
  result: false
}

function containsCb(value: any, state: ContainsState): boolean {
  return !(state.result = value === state.element)
}

/**
 * Returns `true` if the vector contains the specified element.
 * Otherwise it returns `false`.
 *
 * @complexity O(n)
 */
export function contains_<A>(self: Vector<A>, element: A): boolean {
  containsState.element = element
  containsState.result = false
  return foldlCb(containsCb, containsState, self).result
}

/**
 * Returns `true` if the vector contains the specified element.
 * Otherwise it returns `false`.
 *
 * @complexity O(n)
 */
export function contains<A>(element: A): (self: Vector<A>) => boolean {
  return (self) => contains_(self, element)
}

type EqualsState<A> = {
  iterator: Iterator<A>
  f: (a: A, b: A) => boolean
  equals: boolean
}

function equalsCb<A>(value2: A, state: EqualsState<A>): boolean {
  const { value } = state.iterator.next()
  return (state.equals = state.f(value, value2))
}

/**
 * Returns true if the two vectors are equivalent.
 *
 * @complexity O(n)
 */
export function equals_<A>(self: Vector<A>, that: Vector<A>): boolean {
  return equalsWith_(self, that, elementEquals)
}

/**
 * Returns true if the two vectors are equivalent.
 *
 * @complexity O(n)
 */
export function equals<A>(that: Vector<A>): (self: Vector<A>) => boolean {
  return (self) => equals_(self, that)
}

/**
 * Returns true if the two vectors are equivalent when comparing each
 * pair of elements with the given comparison function.
 *
 * @complexity O(n)
 */
export function equalsWith_<A>(
  self: Vector<A>,
  that: Vector<A>,
  f: (a: A, b: A) => boolean
): boolean {
  if (self === that) {
    return true
  } else if (self.length !== that.length) {
    return false
  } else {
    const s = { iterator: that[Symbol.iterator](), equals: true, f }
    return foldlCb<A, EqualsState<A>>(equalsCb, s, self).equals
  }
}

/**
 * Returns true if the two vectors are equivalent when comparing each
 * pair of elements with the given comparison function.
 *
 * @complexity O(n)
 */
export function equalsWith<A>(
  that: Vector<A>,
  f: (a: A, b: A) => boolean
): (self: Vector<A>) => boolean {
  return (self) => equalsWith_(self, that, f)
}

// concat

const eMax = 2

function createConcatPlan(array: Node[]): number[] | undefined {
  const sizes = []
  let sum = 0
  for (let i = 0; i < array.length; ++i) {
    sum += array[i]!.array.length // FIXME: maybe only access array once
    sizes[i] = array[i]!.array.length
  }
  const optimalLength = Math.ceil(sum / branchingFactor)
  let n = array.length
  let i = 0
  if (optimalLength + eMax >= n) {
    return undefined // no rebalancing needed
  }
  while (optimalLength + eMax < n) {
    while (sizes[i]! > branchingFactor - eMax / 2) {
      // Skip nodes that are already sufficiently balanced
      ++i
    }
    // the node at this index is too short
    let remaining = sizes[i]! // number of elements to re-distribute
    do {
      const size = Math.min(remaining + sizes[i + 1]!, branchingFactor)
      sizes[i] = size
      remaining = remaining - (size - sizes[i + 1]!)
      ++i
    } while (remaining > 0)
    // Shift nodes after
    for (let j = i; j <= n - 1; ++j) {
      sizes[j] = sizes[j + 1]!
    }
    --i
    --n
  }
  sizes.length = n
  return sizes
}

/**
 * Combines the children of three nodes into an array. The last child
 * of `left` and the first child of `right is ignored as they've been
 * concatenated into `center`.
 */
function concatNodeMerge(
  left: Node | undefined,
  center: Node,
  right: Node | undefined
): Node[] {
  const array = []
  if (left !== undefined) {
    for (let i = 0; i < left.array.length - 1; ++i) {
      array.push(left.array[i])
    }
  }
  for (let i = 0; i < center.array.length; ++i) {
    array.push(center.array[i])
  }
  if (right !== undefined) {
    for (let i = 1; i < right.array.length; ++i) {
      array.push(right.array[i])
    }
  }
  return array
}

function executeConcatPlan(merged: Node[], plan: number[], height: number): any[] {
  const result = []
  let sourceIdx = 0 // the current node we're copying from
  let offset = 0 // elements in source already used
  for (let toMove of plan) {
    let source = merged[sourceIdx]!.array
    if (toMove === source.length && offset === 0) {
      // source matches target exactly, reuse source
      result.push(merged[sourceIdx])
      ++sourceIdx
    } else {
      const node = new Node(undefined, [])
      while (toMove > 0) {
        const available = source.length - offset
        const itemsToCopy = Math.min(toMove, available)
        pushElements(source, node.array, offset, itemsToCopy)
        if (toMove >= available) {
          ++sourceIdx
          source = merged[sourceIdx]!.array
          offset = 0
        } else {
          offset += itemsToCopy
        }
        toMove -= itemsToCopy
      }
      if (height > 1) {
        // Set sizes on children unless they are leaf nodes
        setSizes(node, height - 1)
      }
      result.push(node)
    }
  }
  return result
}

/**
 * Takes three nodes and returns a new node with the content of the
 * three nodes. Note: The returned node does not have its size table
 * set correctly. The caller must do that.
 */
function rebalance(
  left: Node | undefined,
  center: Node,
  right: Node | undefined,
  height: number,
  top: boolean
): Node {
  const merged = concatNodeMerge(left, center, right)
  const plan = createConcatPlan(merged)
  const balanced = plan !== undefined ? executeConcatPlan(merged, plan, height) : merged
  if (balanced.length <= branchingFactor) {
    if (top === true) {
      return new Node(undefined, balanced)
    } else {
      // Return a single node with extra height for balancing at next
      // level
      return new Node(undefined, [setSizes(new Node(undefined, balanced), height)])
    }
  } else {
    return new Node(undefined, [
      setSizes(new Node(undefined, balanced.slice(0, branchingFactor)), height),
      setSizes(new Node(undefined, balanced.slice(branchingFactor)), height)
    ])
  }
}

function concatSubTree<A>(
  left: Node,
  lDepth: number,
  right: Node,
  rDepth: number,
  isTop: boolean
): Node {
  if (lDepth > rDepth) {
    const c = concatSubTree(arrayLast(left.array), lDepth - 1, right, rDepth, false)
    return rebalance(left, c, undefined, lDepth, isTop)
  } else if (lDepth < rDepth) {
    const c = concatSubTree(left, lDepth, arrayFirst(right.array), rDepth - 1, false)
    return rebalance(undefined, c, right, rDepth, isTop)
  } else if (lDepth === 0) {
    return new Node(undefined, [left, right])
  } else {
    const c = concatSubTree<A>(
      arrayLast(left.array),
      lDepth - 1,
      arrayFirst(right.array),
      rDepth - 1,
      false
    )
    return rebalance(left, c, right, lDepth, isTop)
  }
}

function getHeight(node: Node): number {
  if (node.array[0] instanceof Node) {
    return 1 + getHeight(node.array[0])
  } else {
    return 0
  }
}

/**
 * Takes a RRB-tree and an affix. It then appends the node to the
 * tree.
 * @param l The subject for appending. `l` will be mutated. Nodes in
 * the tree will _not_ be mutated.
 * @param array The affix that should be appended to the tree.
 */
function appendNodeToTree<A>(l: MutableVector<A>, array: A[]): MutableVector<A> {
  if (l.root === undefined) {
    // The old vector has no content in tree, all content is in affixes
    if (getPrefixSize(l) === 0) {
      l.bits = setPrefix(array.length, l.bits)
      l.prefix = reverseArray(array)
    } else {
      l.root = new Node(undefined, array)
    }
    return l
  }
  const depth = getDepth(l)
  let index = handleOffset(depth, l.offset, l.length - 1 - getPrefixSize(l))
  let nodesToCopy = 0
  let nodesVisited = 0
  let shift = depth * 5
  let currentNode = l.root
  if (32 ** (depth + 1) < index) {
    shift = 0 // there is no room
    nodesVisited = depth
  }
  while (shift > 5) {
    let childIndex: number
    if (currentNode.sizes === undefined) {
      // does not have size table
      childIndex = (index >> shift) & mask
      index &= ~(mask << shift) // wipe just used bits
    } else {
      childIndex = currentNode.array.length - 1
      index -= currentNode.sizes[childIndex - 1]!
    }
    nodesVisited++
    if (childIndex < mask) {
      // we are not going down the far right path, this implies that
      // there is still room in the current node
      nodesToCopy = nodesVisited
    }
    currentNode = currentNode.array[childIndex]
    if (currentNode === undefined) {
      // This will only happened in a pvec subtree. The index does not
      // exist so we'll have to create a new path from here on.
      nodesToCopy = nodesVisited
      shift = 5 // Set shift to break out of the while-loop
    }
    shift -= 5
  }

  if (shift !== 0) {
    nodesVisited++
    if (currentNode.array.length < branchingFactor) {
      // there is room in the found node
      nodesToCopy = nodesVisited
    }
  }

  const node = new Node(undefined, array)
  if (nodesToCopy === 0) {
    // there was no room in the found node
    const newPath = nodesVisited === 0 ? node : createPath(nodesVisited, node)
    const newRoot = new Node(undefined, [l.root, newPath])
    l.root = newRoot
    l.bits = incrementDepth(l.bits)
  } else {
    const copiedNode = copyFirstK(l, nodesToCopy, array.length)
    copiedNode.array.push(createPath(depth - nodesToCopy, node))
  }
  return l
}

/**
 * Traverses down the right edge of the tree and copies k nodes.
 * @param newVector
 * @param k The number of nodes to copy. Will always be at least 1.
 * @param leafSize The number of elements in the leaf that will be inserted.
 */
function copyFirstK(newVector: MutableVector<any>, k: number, leafSize: number): Node {
  let currentNode = cloneNode(newVector.root!) // copy root
  newVector.root = currentNode // install root

  for (let i = 1; i < k; ++i) {
    const index = currentNode.array.length - 1
    if (currentNode.sizes !== undefined) {
      currentNode.sizes[index] += leafSize
    }
    const newNode = cloneNode(currentNode.array[index])
    // Install the copied node
    currentNode.array[index] = newNode
    currentNode = newNode
  }
  if (currentNode.sizes !== undefined) {
    currentNode.sizes.push(arrayLast(currentNode.sizes) + leafSize)
  }
  return currentNode
}

const concatBuffer = new Array(3)

function concatAffixes<A>(left: Vector<A>, right: Vector<A>): number {
  // TODO: Try and find a neat way to reduce the LOC here
  let nr = 0
  let arrIdx = 0
  let i = 0
  let length = getSuffixSize(left)
  concatBuffer[nr] = []
  for (i = 0; i < length; ++i) {
    concatBuffer[nr][arrIdx++] = left.suffix[i]
  }
  length = getPrefixSize(right)
  for (i = 0; i < length; ++i) {
    if (arrIdx === 32) {
      arrIdx = 0
      ++nr
      concatBuffer[nr] = []
    }
    concatBuffer[nr][arrIdx++] = right.prefix[length - 1 - i]
  }
  length = getSuffixSize(right)
  for (i = 0; i < length; ++i) {
    if (arrIdx === 32) {
      arrIdx = 0
      ++nr
      concatBuffer[nr] = []
    }
    concatBuffer[nr][arrIdx++] = right.suffix[i]
  }
  return nr
}

/**
 * Concatenates two vectors.
 *
 * @complexity O(log(n))
 */
export function concat_<A>(self: Vector<A>, that: Vector<A>): Vector<A> {
  if (self.length === 0) {
    return that
  } else if (that.length === 0) {
    return self
  }
  const newSize = self.length + that.length
  const rightSuffixSize = getSuffixSize(that)
  let newVector = cloneVector(self)
  if (that.root === undefined) {
    // right is nothing but a prefix and a suffix
    const nrOfAffixes = concatAffixes(self, that)
    for (let i = 0; i < nrOfAffixes; ++i) {
      newVector = appendNodeToTree(newVector, concatBuffer[i])
      newVector.length += concatBuffer[i].length
      // wipe pointer, otherwise it might end up keeping the array alive
      concatBuffer[i] = undefined
    }
    newVector.length = newSize
    newVector.suffix = concatBuffer[nrOfAffixes]
    newVector.bits = setSuffix(concatBuffer[nrOfAffixes].length, newVector.bits)
    concatBuffer[nrOfAffixes] = undefined
    return newVector
  } else {
    const leftSuffixSize = getSuffixSize(self)
    if (leftSuffixSize > 0) {
      newVector = appendNodeToTree(newVector, self.suffix.slice(0, leftSuffixSize))
      newVector.length += leftSuffixSize
    }
    newVector = appendNodeToTree(
      newVector,
      that.prefix.slice(0, getPrefixSize(that)).reverse()
    )
    const newNode = concatSubTree(
      newVector.root!,
      getDepth(newVector),
      that.root,
      getDepth(that),
      true
    )
    const newDepth = getHeight(newNode)
    setSizes(newNode, newDepth)
    newVector.root = newNode
    newVector.offset &= ~(mask << (getDepth(self) * branchBits))
    newVector.length = newSize
    newVector.bits = setSuffix(rightSuffixSize, setDepth(newDepth, newVector.bits))
    newVector.suffix = that.suffix
    return newVector
  }
}

/**
 * Concatenates two vectors.
 *
 * @complexity O(log(n))
 */
export function concat<A>(that: Vector<A>): (self: Vector<A>) => Vector<A> {
  return (left) => concat_(left, that)
}

/**
 * Returns a vector that has the entry specified by the index replaced with the given value.
 *
 * If the index is out of bounds the given vector is returned unchanged.
 *
 * @complexity O(log(n))
 */
export function update_<A>(self: Vector<A>, index: number, a: A): Vector<A> {
  if (index < 0 || self.length <= index) {
    return self
  }
  const prefixSize = getPrefixSize(self)
  const suffixSize = getSuffixSize(self)
  const newVector = cloneVector(self)
  if (index < prefixSize) {
    const newPrefix = copyArray(newVector.prefix)
    newPrefix[newPrefix.length - index - 1] = a
    newVector.prefix = newPrefix
  } else if (index >= self.length - suffixSize) {
    const newSuffix = copyArray(newVector.suffix)
    newSuffix[index - (self.length - suffixSize)] = a
    newVector.suffix = newSuffix
  } else {
    newVector.root = updateNode(
      self.root!,
      getDepth(self),
      index - prefixSize,
      self.offset,
      a
    )
  }
  return newVector
}

/**
 * Returns a vector that has the entry specified by the index replaced with the given value.
 *
 * If the index is out of bounds the given vector is returned unchanged.
 *
 * @complexity O(log(n))
 */
export function update<A>(index: number, a: A): (self: Vector<A>) => Vector<A> {
  return (self) => update_(self, index, a)
}

/**
 * Returns a vector that has the entry specified by the index replaced with
 * the value returned by applying the function to the value.
 *
 * If the index is out of bounds the given vector is
 * returned unchanged.
 *
 * @complexity `O(log(n))`
 */
export function adjust_<A>(self: Vector<A>, index: number, f: (a: A) => A): Vector<A> {
  if (index < 0 || self.length <= index) {
    return self
  }
  return update_(self, index, f(unsafeNth_(self, index)!))
}

/**
 * Returns a vector that has the entry specified by the index replaced with
 * the value returned by applying the function to the value.
 *
 * If the index is out of bounds the given vector is
 * returned unchanged.
 *
 * @complexity `O(log(n))`
 */
export function adjust<A>(
  index: number,
  f: (a: A) => A
): (self: Vector<A>) => Vector<A> {
  return (self) => adjust_(self, index, f)
}

// slice and slice based functions

let newAffix: any[]

// function getBitsForDepth(n: number, depth: number): number {
//   return n & ~(~0 << ((depth + 1) * branchBits));
// }

function sliceNode(
  node: Node,
  index: number,
  depth: number,
  pathLeft: number,
  pathRight: number,
  childLeft: Node | undefined,
  childRight: Node | undefined
): Node {
  const array = node.array.slice(pathLeft, pathRight + 1)
  if (childLeft !== undefined) {
    array[0] = childLeft
  }
  if (childRight !== undefined) {
    array[array.length - 1] = childRight
  }
  let sizes = node.sizes
  if (sizes !== undefined) {
    sizes = sizes.slice(pathLeft, pathRight + 1)
    let slicedOffLeft = pathLeft !== 0 ? node.sizes![pathLeft - 1]! : 0
    if (childLeft !== undefined) {
      // If the left child has been sliced into a new child we need to know
      // how many elements have been removed from the child.
      if (childLeft.sizes !== undefined) {
        // If the left child has a size table we can simply look at that.
        const oldChild: Node = node.array[pathLeft]
        slicedOffLeft += arrayLast(oldChild.sizes!) - arrayLast(childLeft.sizes)
      } else {
        // If the left child does not have a size table we can
        // calculate how many elements have been removed from it by
        // looking at the index. Note that when we slice into a leaf
        // the leaf is moved up as a prefix. Thus slicing, for
        // instance, at index 20 will remove 32 elements from the
        // child. Similarly slicing at index 50 will remove 64
        // elements at slicing at 64 will remove 92 elements.
        slicedOffLeft += ((index - slicedOffLeft) & ~0b011111) + 32
      }
    }
    for (let i = 0; i < sizes.length; ++i) {
      sizes[i] -= slicedOffLeft
    }
    if (childRight !== undefined) {
      const slicedOffRight =
        sizeOfSubtree(node.array[pathRight], depth - 1) -
        sizeOfSubtree(childRight, depth - 1)
      sizes[sizes.length - 1] -= slicedOffRight
    }
  }
  return new Node(sizes, array)
}

let newOffset = 0

function sliceLeft(
  tree: Node,
  depth: number,
  index: number,
  offset: number,
  top: boolean
): Node | undefined {
  let {
    index: newIndex,
    path,
    updatedOffset
  } = getPath(index, offset, depth, tree.sizes)
  if (depth === 0) {
    newAffix = tree.array.slice(path).reverse()
    // This leaf node is moved up as a suffix so there is nothing here
    // after slicing
    return undefined
  } else {
    const child = sliceLeft(tree.array[path], depth - 1, newIndex, updatedOffset, false)
    if (child === undefined) {
      // There is nothing in the child after slicing so we don't include it
      ++path
      if (path === tree.array.length) {
        return undefined
      }
    }
    // If we've sliced something away and it's not a the root, update offset
    if (tree.sizes === undefined && top === false) {
      newOffset |= (32 - (tree.array.length - path)) << (depth * branchBits)
    }
    return sliceNode(tree, index, depth, path, tree.array.length - 1, child, undefined)
  }
}

/** Slice elements off of a tree from the right */
function sliceRight(
  node: Node,
  depth: number,
  index: number,
  offset: number
): Node | undefined {
  let { index: newIndex, path } = getPath(index, offset, depth, node.sizes)
  if (depth === 0) {
    newAffix = node.array.slice(0, path + 1)
    // this leaf node is moved up as a suffix so there is nothing here
    // after slicing
    return undefined
  } else {
    // slice the child, note that we subtract 1 then the radix lookup
    // algorithm can find the last element that we want to include
    // and sliceRight will do a slice that is inclusive on the index.
    const child = sliceRight(
      node.array[path],
      depth - 1,
      newIndex,
      path === 0 ? offset : 0
    )
    if (child === undefined) {
      // there is nothing in the child after slicing so we don't include it
      --path
      if (path === -1) {
        return undefined
      }
    }
    // note that we add 1 to the path since we want the slice to be
    // inclusive on the end index. Only at the leaf level do we want
    // to do an exclusive slice.
    const array = node.array.slice(0, path + 1)
    if (child !== undefined) {
      array[array.length - 1] = child
    }
    let sizes: Sizes | undefined = node.sizes
    if (sizes !== undefined) {
      sizes = sizes.slice(0, path + 1)
      if (child !== undefined) {
        const slicedOff =
          sizeOfSubtree(node.array[path], depth - 1) - sizeOfSubtree(child, depth - 1)
        sizes[sizes.length - 1] -= slicedOff
      }
    }
    return new Node(sizes, array)
  }
}

function sliceTreeVector<A>(
  from: number,
  to: number,
  tree: Node,
  depth: number,
  offset: number,
  l: MutableVector<A>
): Vector<A> {
  const sizes = tree.sizes
  let { index: newFrom, path: pathLeft } = getPath(from, offset, depth, sizes)
  let { index: newTo, path: pathRight } = getPath(to, offset, depth, sizes)
  if (depth === 0) {
    // we are slicing a piece off a leaf node
    l.prefix = emptyAffix
    l.suffix = tree.array.slice(pathLeft, pathRight + 1)
    l.root = undefined
    l.bits = setSuffix(pathRight - pathLeft + 1, 0)
    return l
  } else if (pathLeft === pathRight) {
    // Both ends are located in the same subtree, this means that we
    // can reduce the height
    l.bits = decrementDepth(l.bits)
    return sliceTreeVector(
      newFrom,
      newTo,
      tree.array[pathLeft],
      depth - 1,
      pathLeft === 0 ? offset : 0,
      l
    )
  } else {
    const childRight = sliceRight(tree.array[pathRight], depth - 1, newTo, 0)
    l.bits = setSuffix(newAffix.length, l.bits)
    l.suffix = newAffix
    if (childRight === undefined) {
      --pathRight
    }
    newOffset = 0

    const childLeft = sliceLeft(
      tree.array[pathLeft],
      depth - 1,
      newFrom,
      pathLeft === 0 ? offset : 0,
      pathLeft === pathRight
    )
    l.offset = newOffset
    l.bits = setPrefix(newAffix.length, l.bits)
    l.prefix = newAffix

    if (childLeft === undefined) {
      ++pathLeft
    }
    if (pathLeft >= pathRight) {
      if (pathLeft > pathRight) {
        // This only happens when `pathLeft` originally was equal to
        // `pathRight + 1` and `childLeft === childRight === undefined`.
        // In this case there is no tree left.
        l.bits = setDepth(0, l.bits)
        l.root = undefined
      } else {
        // Height can be reduced
        l.bits = decrementDepth(l.bits)
        const newRoot =
          childRight !== undefined
            ? childRight
            : childLeft !== undefined
            ? childLeft
            : tree.array[pathLeft]
        l.root = new Node(newRoot.sizes, newRoot.array) // Is this size handling good enough?
      }
    } else {
      l.root = sliceNode(tree, from, depth, pathLeft, pathRight, childLeft, childRight)
    }
    return l
  }
}

/**
 * Returns a slice of a vector. Elements are removed from the beginning and
 * end. Both the indices can be negative in which case they will count
 * from the right end of the vector.
 *
 * @complexity `O(log(n))`
 */
export function slice_<A>(self: Vector<A>, from: number, to: number): Vector<A> {
  let { bits, length } = self

  to = Math.min(length, to)
  // Handle negative indices
  if (from < 0) {
    from = length + from
  }
  if (to < 0) {
    to = length + to
  }

  // Should we just return the empty vector?
  if (to <= from || to <= 0 || length <= from) {
    return empty()
  }

  // Return vector unchanged if we are slicing nothing off
  if (from <= 0 && length <= to) {
    return self
  }

  const newLength = to - from
  let prefixSize = getPrefixSize(self)
  const suffixSize = getSuffixSize(self)

  // Both indices lie in the prefix
  if (to <= prefixSize) {
    return new Vector(
      setPrefix(newLength, 0),
      0,
      newLength,
      self.prefix.slice(prefixSize - to, prefixSize - from),
      undefined,
      emptyAffix
    )
  }

  const suffixStart = length - suffixSize
  // Both indices lie in the suffix
  if (suffixStart <= from) {
    return new Vector(
      setSuffix(newLength, 0),
      0,
      newLength,
      emptyAffix,
      undefined,
      self.suffix.slice(from - suffixStart, to - suffixStart)
    )
  }

  const newVector = cloneVector(self)
  newVector.length = newLength

  // Both indices lie in the tree
  if (prefixSize <= from && to <= suffixStart) {
    sliceTreeVector(
      from - prefixSize + self.offset,
      to - prefixSize + self.offset - 1,
      self.root!,
      getDepth(self),
      self.offset,
      newVector
    )
    return newVector
  }

  if (0 < from) {
    // we need to slice something off of the left
    if (from < prefixSize) {
      // shorten the prefix even though it's not strictly needed,
      // so that referenced items can be GC'd
      newVector.prefix = self.prefix.slice(0, prefixSize - from)
      bits = setPrefix(prefixSize - from, bits)
    } else {
      // if we're here `to` can't lie in the tree, so we can set the
      // root
      newOffset = 0
      newVector.root = sliceLeft(
        newVector.root!,
        getDepth(self),
        from - prefixSize,
        self.offset,
        true
      )
      newVector.offset = newOffset
      if (newVector.root === undefined) {
        bits = setDepth(0, bits)
      }
      bits = setPrefix(newAffix.length, bits)
      prefixSize = newAffix.length
      newVector.prefix = newAffix
    }
  }
  if (to < length) {
    // we need to slice something off of the right
    if (length - to < suffixSize) {
      bits = setSuffix(suffixSize - (length - to), bits)
      // slice the suffix even though it's not strictly needed,
      // to allow the removed items to be GC'd
      newVector.suffix = self.suffix.slice(0, suffixSize - (length - to))
    } else {
      newVector.root = sliceRight(
        newVector.root!,
        getDepth(self),
        to - prefixSize - 1,
        newVector.offset
      )
      if (newVector.root === undefined) {
        bits = setDepth(0, bits)
        newVector.offset = 0
      }
      bits = setSuffix(newAffix.length, bits)
      newVector.suffix = newAffix
    }
  }
  newVector.bits = bits
  return newVector
}

/**
 * Returns a slice of a vector. Elements are removed from the beginning and
 * end. Both the indices can be negative in which case they will count
 * from the right end of the vector.
 *
 * @complexity `O(log(n))`
 */
export function slice(from: number, to: number): <A>(self: Vector<A>) => Vector<A> {
  return (self) => slice_(self, from, to)
}

/**
 * Takes the first `n` elements from a vector and returns them in a new vector.
 *
 * @complexity `O(log(n))`
 */
export function take_<A>(self: Vector<A>, n: number): Vector<A> {
  return slice_(self, 0, n)
}

/**
 * Takes the first `n` elements from a vector and returns them in a new vector.
 *
 * @complexity `O(log(n))`
 */
export function take(n: number): <A>(self: Vector<A>) => Vector<A> {
  return (self) => take_(self, n)
}

type FindNotIndexState = {
  predicate: (a: any) => boolean
  index: number
}

function findNotIndexCb(value: any, state: FindNotIndexState): boolean {
  if (state.predicate(value)) {
    ++state.index
    return true
  } else {
    return false
  }
}

/**
 * Takes the first elements in the vector for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements satisfying
 * the predicate.
 */
export function takeWhile_<A>(
  self: Vector<A>,
  predicate: (a: A) => boolean
): Vector<A> {
  const { index } = foldlCb(findNotIndexCb, { predicate, index: 0 }, self)
  return slice_(self, 0, index)
}

/**
 * Takes the first elements in the vector for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements satisfying
 * the predicate.
 */
export function takeWhile<A>(
  predicate: (a: A) => boolean
): (self: Vector<A>) => Vector<A> {
  return (self) => takeWhile_(self, predicate)
}

/**
 * Takes the last elements in the vector for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 */
export function takeLastWhile_<A>(
  self: Vector<A>,
  predicate: (a: A) => boolean
): Vector<A> {
  const { index } = foldrCb(findNotIndexCb, { predicate, index: 0 }, self)
  return slice_(self, self.length - index, self.length)
}

/**
 * Takes the last elements in the vector for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 */
export function takeLastWhile<A>(
  predicate: (a: A) => boolean
): (l: Vector<A>) => Vector<A> {
  return (l) => takeLastWhile_(l, predicate)
}

/**
 * Removes the first elements in the vector for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 */
export function dropWhile_<A>(
  self: Vector<A>,
  predicate: (a: A) => boolean
): Vector<A> {
  const { index } = foldlCb(findNotIndexCb, { predicate, index: 0 }, self)
  return slice_(self, index, self.length)
}

/**
 * Removes the first elements in the vector for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 */
export function dropWhile<A>(
  predicate: (a: A) => boolean
): (self: Vector<A>) => Vector<A> {
  return (l) => dropWhile_(l, predicate)
}

/**
 * Returns a new vector without repeated elements.
 *
 * @complexity `O(n)`
 */
export function dropRepeats<A>(self: Vector<A>): Vector<A> {
  return dropRepeatsWith_(self, elementEquals)
}

/**
 * Returns a new vector without repeated elements by using the given
 * function to determine when elements are equal.
 *
 * @complexity `O(n)`
 */
export function dropRepeatsWith_<A>(
  self: Vector<A>,
  predicate: (a: A, b: A) => boolean
): Vector<A> {
  return reduce_(self, emptyPushable(), (acc, a) =>
    acc.length !== 0 && predicate(unsafeLast(acc)!, a) ? acc : push_(acc, a)
  )
}

/**
 * Returns a new vector without repeated elements by using the given
 * function to determine when elements are equal.
 *
 * @complexity `O(n)`
 */
export function dropRepeatsWith<A>(
  predicate: (a: A, b: A) => boolean
): (self: Vector<A>) => Vector<A> {
  return (self) => dropRepeatsWith_(self, predicate)
}

/**
 * Takes the last `n` elements from a vector and returns them in a new
 * vector.
 *
 * @complexity `O(log(n))`
 */
export function takeLast_<A>(self: Vector<A>, n: number): Vector<A> {
  return slice_(self, self.length - n, self.length)
}

/**
 * Takes the last `n` elements from a vector and returns them in a new
 * vector.
 *
 * @complexity `O(log(n))`
 */
export function takeLast<A>(n: number): (self: Vector<A>) => Vector<A> {
  return (self) => takeLast_(self, n)
}

/**
 * Splits a vector at the given index and return the two sides in a pair.
 * The left side will contain all elements before but not including the
 * element at the given index. The right side contains the element at the
 * index and all elements after it.
 *
 * @complexity `O(log(n))`
 */
export function splitAt_<A>(self: Vector<A>, index: number): [Vector<A>, Vector<A>] {
  return [slice_(self, 0, index), slice_(self, index, self.length)]
}

/**
 * Splits a vector at the given index and return the two sides in a pair.
 * The left side will contain all elements before but not including the
 * element at the given index. The right side contains the element at the
 * index and all elements after it.
 *
 * @complexity `O(log(n))`
 */
export function splitAt(index: number): <A>(self: Vector<A>) => [Vector<A>, Vector<A>] {
  return (self) => splitAt_(self, index)
}

/**
 * Splits a vector at the first element in the vector for which the given
 * predicate returns `true`.
 *
 * @complexity `O(n)`
 */
export function splitWhen_<A>(
  self: Vector<A>,
  predicate: (a: A) => boolean
): [Vector<A>, Vector<A>] {
  const idx = findIndex_(self, predicate)
  return idx === -1 ? [self, empty()] : splitAt_(self, idx)
}

/**
 * Splits a vector at the first element in the vector for which the given
 * predicate returns `true`.
 *
 * @complexity `O(n)`
 */
export function splitWhen<A>(
  predicate: (a: A) => boolean
): (self: Vector<A>) => [Vector<A>, Vector<A>] {
  return (self) => splitWhen_(self, predicate)
}

/**
 * Splits the vector into chunks of the given size.
 */
export function splitEvery_<A>(self: Vector<A>, size: number): Vector<Vector<A>> {
  const { buffer, l2 } = reduce_(
    self,
    { l2: emptyPushable<Vector<A>>(), buffer: emptyPushable<A>() },
    ({ buffer, l2 }, elm) => {
      push_(buffer, elm)
      if (buffer.length === size) {
        return { l2: push_(l2, buffer), buffer: emptyPushable<A>() }
      } else {
        return { l2, buffer }
      }
    }
  )
  return buffer.length === 0 ? l2 : push_(l2, buffer)
}

/**
 * Splits the vector into chunks of the given size.
 */
export function splitEvery(size: number): <A>(self: Vector<A>) => Vector<Vector<A>> {
  return (self) => splitEvery_(self, size)
}

/**
 * Takes an index, a number of elements to remove and a vector. Returns a
 * new vector with the given amount of elements removed from the specified
 * index.
 *
 * @complexity `O(log(n))`
 */
export function remove_<A>(self: Vector<A>, from: number, amount: number): Vector<A> {
  return concat_(slice_(self, 0, from), slice_(self, from + amount, self.length))
}

/**
 * Takes an index, a number of elements to remove and a vector. Returns a
 * new vector with the given amount of elements removed from the specified
 * index.
 *
 * @complexity `O(log(n))`
 */
export function remove(
  from: number,
  amount: number
): <A>(self: Vector<A>) => Vector<A> {
  return (self) => remove_(self, from, amount)
}

/**
 * Returns a new vector without the first `n` elements.
 *
 * @complexity `O(log(n))`
 */
export function drop_<A>(self: Vector<A>, n: number): Vector<A> {
  return slice_(self, n, self.length)
}

/**
 * Returns a new vector without the first `n` elements.
 *
 * @complexity `O(log(n))`
 */
export function drop(n: number): <A>(self: Vector<A>) => Vector<A> {
  return (self) => drop_(self, n)
}

/**
 * Returns a new vector without the last `n` elements.
 *
 * @complexity `O(log(n))`
 */
export function dropLast_<A>(self: Vector<A>, n: number): Vector<A> {
  return slice_(self, 0, self.length - n)
}

/**
 * Returns a new vector without the last `n` elements.
 *
 * @complexity `O(log(n))`
 */
export function dropLast<A>(n: number): (self: Vector<A>) => Vector<A> {
  return (self) => dropLast_(self, n)
}

/**
 * Returns a new vector with the last element removed. If the vector is
 * empty the empty vector is returned.
 *
 * @complexity `O(1)`
 */
export function pop<A>(self: Vector<A>): Vector<A> {
  return slice_(self, 0, -1)
}

/**
 * Returns a new vector with the first element removed. If the vector is
 * empty the empty vector is returned.
 *
 * @complexity `O(1)`
 */
export function tail<A>(self: Vector<A>): Vector<A> {
  return slice_(self, 1, self.length)
}

function arrayPush<A>(array: A[], a: A): A[] {
  array.push(a)
  return array
}

/**
 * Converts a vector into an array.
 *
 * @complexity `O(n)`
 */
export function toArray<A>(self: Vector<A>): readonly A[] {
  return reduce_<A, A[]>(self, [], arrayPush)
}

/**
 * Inserts the given element at the given index in the vector.
 *
 * @complexity O(log(n))
 */
export function insert_<A>(self: Vector<A>, index: number, element: A): Vector<A> {
  return concat_(
    append_(slice_(self, 0, index), element),
    slice_(self, index, self.length)
  )
}

/**
 * Inserts the given element at the given index in the vector.
 *
 * @complexity O(log(n))
 */
export function insert<A>(index: number, element: A): (self: Vector<A>) => Vector<A> {
  return (self) => insert_(self, index, element)
}

/**
 * Inserts the given vector of elements at the given index in the vector.
 *
 * @complexity `O(log(n))`
 */
export function insertAll_<A>(
  self: Vector<A>,
  index: number,
  elements: Vector<A>
): Vector<A> {
  return concat_(
    concat_(slice_(self, 0, index), elements),
    slice_(self, index, self.length)
  )
}

/**
 * Inserts the given vector of elements at the given index in the vector.
 *
 * @complexity `O(log(n))`
 */
export function insertAll<A>(
  index: number,
  elements: Vector<A>
): (self: Vector<A>) => Vector<A> {
  return (self) => insertAll_(self, index, elements)
}

/**
 * Reverses a vector.
 * @complexity O(n)
 */
export function reverse<A>(self: Vector<A>): Vector<A> {
  return reduce_(self, empty(), (newL, element) => prepend_(newL, element))
}

/**
 * Returns `true` if the given argument is a vector and `false`
 * otherwise.
 *
 * @complexity O(1)
 */
export function isVector<A>(self: any): self is Vector<A> {
  return typeof self === "object" && Array.isArray(self.suffix)
}

/**
 * Iterate over two vectors in parallel and collect the pairs.
 *
 * @complexity `O(log(n))`, where `n` is the length of the smallest
 * vector.
 */
export function zip_<A, B>(self: Vector<A>, that: Vector<B>): Vector<Tp.Tuple<[A, B]>> {
  return zipWith_(self, that, Tp.tuple)
}

/**
 * Iterate over two vectors in parallel and collect the pairs.
 *
 * @complexity `O(log(n))`, where `n` is the length of the smallest
 * vector.
 */
export function zip<B>(
  that: Vector<B>
): <A>(self: Vector<A>) => Vector<Tp.Tuple<[A, B]>> {
  return (self) => zip_(self, that)
}

/**
 * This is like mapping over two vectors at the same time. The two vectors
 * are iterated over in parallel and each pair of elements is passed
 * to the function. The returned values are assembled into a new vector.
 *
 * The shortest vector determines the size of the result.
 *
 * @complexity `O(log(n))` where `n` is the length of the smallest
 * vector.
 */
export function zipWith_<A, B, C>(
  self: Vector<A>,
  that: Vector<B>,
  f: (a: A, b: B) => C
): Vector<C> {
  const swapped = that.length < self.length
  const iterator = (swapped ? self : that)[Symbol.iterator]()
  return map_((swapped ? that : self) as any, (a: any) => {
    const b: any = iterator.next().value
    return swapped ? f(b, a) : f(a, b)
  })
}

/**
 * This is like mapping over two vectors at the same time. The two vectors
 * are iterated over in parallel and each pair of elements is passed
 * to the function. The returned values are assembled into a new vector.
 *
 * The shortest vector determines the size of the result.
 *
 * @complexity `O(log(n))` where `n` is the length of the smallest
 * vector.
 */
export function zipWith<A, B, C>(
  that: Vector<B>,
  f: (a: A, b: B) => C
): (self: Vector<A>) => Vector<C> {
  return (self) => zipWith_(self, that, f)
}

/**
 * Sort the given vector by comparing values using the given function.
 * The function receieves two values and should return `-1` if the
 * first value is stricty larger than the second, `0` is they are
 * equal and `1` if the first values is strictly smaller than the
 * second.
 *
 * @complexity O(n * log(n))
 */
export function sortWith_<A>(self: Vector<A>, ord: Ord<A>): Vector<A> {
  const arr: { idx: number; elm: A }[] = []
  let i = 0
  forEach_(self, (elm) => arr.push({ idx: i++, elm }))
  arr.sort(({ elm: a, idx: i }, { elm: b, idx: j }) => {
    const c = ord.compare(a, b)
    return c !== 0 ? c : i < j ? -1 : 1
  })
  const newL = emptyPushable<A>()
  for (let i = 0; i < arr.length; ++i) {
    push_(newL, arr[i]!.elm)
  }
  return newL
}

/**
 * Sort the given vector by comparing values using the given function.
 * The function receieves two values and should return `-1` if the
 * first value is stricty larger than the second, `0` is they are
 * equal and `1` if the first values is strictly smaller than the
 * second.
 *
 * @complexity O(n * log(n))
 */
export function sortWith<A>(ord: Ord<A>): (self: Vector<A>) => Vector<A> {
  return (self) => sortWith_(self, ord)
}

/**
 * Returns a vector of vectors where each subvector's elements are all
 * equal.
 */
export function group<A>(self: Vector<A>): Vector<Vector<A>> {
  return groupWith_(self, elementEquals)
}

/**
 * Returns a vector of vectors where each subvector's elements are pairwise
 * equal based on the given comparison function.
 *
 * Note that only adjacent elements are compared for equality. If all
 * equal elements should be grouped together the vector should be sorted
 * before grouping.
 */
export function groupWith_<A>(
  self: Vector<A>,
  f: (a: A, b: A) => boolean
): Vector<Vector<A>> {
  const result = emptyPushable<MutableVector<A>>()
  let buffer = emptyPushable<A>()
  forEach_(self, (a) => {
    if (buffer.length !== 0 && !f(unsafeLast(buffer)!, a)) {
      push_(result, buffer)
      buffer = emptyPushable()
    }
    push_(buffer, a)
  })
  return buffer.length === 0 ? result : push_(result, buffer)
}

/**
 * Returns a vector of vectors where each subvector's elements are pairwise
 * equal based on the given comparison function.
 *
 * Note that only adjacent elements are compared for equality. If all
 * equal elements should be grouped together the vector should be sorted
 * before grouping.
 */
export function groupWith<A>(
  f: (a: A, b: A) => boolean
): (self: Vector<A>) => Vector<Vector<A>> {
  return (self) => groupWith_(self, f)
}

/**
 * Inserts a separator between each element in a vector.
 */
export function intersperse_<A>(self: Vector<A>, separator: A): Vector<A> {
  return pop(reduce_(self, emptyPushable(), (l2, a) => push_(push_(l2, a), separator)))
}

/**
 * Inserts a separator between each element in a vector.
 */
export function intersperse<A>(separator: A): (self: Vector<A>) => Vector<A> {
  return (self) => intersperse_(self, separator)
}

/**
 * Returns `true` if the given vector is empty and `false` otherwise.
 */
export function isEmpty(self: Vector<any>): boolean {
  return self.length === 0
}

/**
 * Builder
 */
export function builder<A>() {
  return new VectorBuilder<A>(emptyPushable())
}

export class VectorBuilder<A> {
  constructor(private vec: MutableVector<A>) {}

  append(a: A): VectorBuilder<A> {
    push_(this.vec, a)
    return this
  }

  build() {
    return this.vec
  }
}

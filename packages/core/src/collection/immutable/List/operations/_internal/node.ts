import type { List, MutableList, Sizes } from "../../definition"
import { Node } from "../../definition"
import {
  arrayFirst,
  arrayLast,
  arrayPrepend,
  copyArray,
  foldlSuffix,
  foldrSuffix,
  mapArray,
  pushElements,
  reverseArray
} from "./array"
import {
  BranchBits,
  BranchingFactor,
  getDepth,
  getPrefixSize,
  getSuffixSize,
  incrementDepth,
  Mask,
  setPrefix,
  setSuffix
} from "./bits"

const pathResult = { path: 0, index: 0, updatedOffset: 0 }
type PathResult = typeof pathResult

export function createPath(depth: number, value: any): any {
  let current = value
  for (let i = 0; i < depth; ++i) {
    current = new Node(undefined, [current])
  }
  return current
}

export function getPath(
  index: number,
  offset: number,
  depth: number,
  sizes: Sizes
): PathResult {
  if (sizes === undefined && offset !== 0) {
    pathResult.updatedOffset = 0
    index = handleOffset(depth, offset, index)
  }
  let path = (index >> (depth * BranchBits)) & Mask
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

export function nodeNthDense(node: Node, depth: number, index: number): any {
  let current = node
  for (; depth >= 0; --depth) {
    current = current.array[(index >> (depth * BranchBits)) & Mask]
  }
  return current
}

export function handleOffset(depth: number, offset: number, index: number): number {
  index += offset
  for (; depth >= 0; --depth) {
    index = index - (offset & (Mask << (depth * BranchBits)))
    if (((index >> (depth * BranchBits)) & Mask) !== 0) {
      break
    }
  }
  return index
}

export function nodeNth(node: Node, depth: number, offset: number, index: number): any {
  let path
  let current = node
  while (current.sizes !== undefined) {
    path = (index >> (depth * BranchBits)) & Mask
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

export function cloneNode({ array, sizes }: Node): Node {
  return new Node(sizes === undefined ? undefined : copyArray(sizes), copyArray(array))
}

export function updateNode(
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

export function setSizes(node: Node, height: number): Node {
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
export function sizeOfSubtree(node: Node, height: number): number {
  if (height !== 0) {
    if (node.sizes !== undefined) {
      return arrayLast(node.sizes)
    } else {
      // the node is leftwise dense so all all but the last child are full
      const lastSize = sizeOfSubtree(arrayLast(node.array), height - 1)
      return ((node.array.length - 1) << (height * BranchBits)) + lastSize
    }
  } else {
    return node.array.length
  }
}

/**
 * Traverses down the left edge of the tree and copies k nodes.
 * Returns the last copied node.
 *
 * @param self The list to copy.
 * @param k The number of nodes to copy. Should always be at least 1.
 */
function copyLeft(self: MutableList<any>, k: number): Node {
  let currentNode = cloneNode(self.root!) // copy root
  self.root = currentNode // install copy of root

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
export function nodePrepend(value: any, size: number, node: Node): Node {
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
 * Prepends a node to a tree, either by shifting the nodes in the root
 * left or by increasing the height.
 */
export function prependTopTree<A>(
  l: MutableList<A>,
  depth: number,
  node: Node
): number {
  let newOffset
  if (l.root!.array.length < BranchingFactor) {
    // There is space in the root, there is never a size table in this
    // case
    newOffset = 32 ** depth - 32
    l.root = new Node(
      undefined,
      arrayPrepend(createPath(depth - 1, node), l.root!.array)
    )
  } else {
    // We need to create a new root
    l.bits = incrementDepth(l.bits)
    const sizes =
      l.root!.sizes === undefined ? undefined : [32, arrayLast(l.root!.sizes!) + 32]
    newOffset = depth === 0 ? 0 : 32 ** (depth + 1) - 32
    l.root = new Node(sizes, [createPath(depth, node), l.root])
  }
  return newOffset
}

/**
 * Takes a list and a node tail. It then prepends the node to the tree
 * of the list.
 *
 * @param self The subject for prepending. `l` will be mutated. Nodes in
 * the tree will _not_ be mutated.
 * @param node The node that should be prepended to the tree.
 */
export function prependNodeToTree<A>(self: MutableList<A>, array: A[]): List<A> {
  if (self.root === undefined) {
    if (getSuffixSize(self) === 0) {
      // ensure invariant 1
      self.bits = setSuffix(array.length, self.bits)
      self.suffix = array
    } else {
      self.root = new Node(undefined, array)
    }
    return self
  } else {
    const node = new Node(undefined, array)
    const depth = getDepth(self)
    let newOffset = 0
    if (self.root.sizes === undefined) {
      if (self.offset !== 0) {
        newOffset = self.offset - BranchingFactor
        self.root = prependDense(self.root, depth, self.offset, node)
      } else {
        // in this case we can be sure that the is not room in the tree
        // for the new node
        newOffset = prependTopTree(self, depth, node)
      }
    } else {
      // represents how many nodes _with size-tables_ that we should copy.
      let copyableCount = 0
      // go down while there is size tables
      let nodesTraversed = 0
      let currentNode = self.root
      while (currentNode.sizes !== undefined && nodesTraversed < depth) {
        ++nodesTraversed
        if (currentNode.array.length < 32) {
          // there is room if offset is > 0 or if the first node does not
          // contain as many nodes as it possibly can
          copyableCount = nodesTraversed
        }
        currentNode = currentNode.array[0]
      }
      if (self.offset !== 0) {
        const copiedNode = copyLeft(self, nodesTraversed)
        for (let i = 0; i < copiedNode.sizes!.length; ++i) {
          copiedNode.sizes![i] += BranchingFactor
        }
        copiedNode.array[0] = prependDense(
          copiedNode.array[0],
          depth - nodesTraversed,
          self.offset,
          node
        )
        self.offset = self.offset - BranchingFactor
        return self
      } else {
        if (copyableCount === 0) {
          self.offset = prependTopTree(self, depth, node)
        } else {
          let parent: Node | undefined
          let prependableNode: Node
          // Copy the part of the path with size tables
          if (copyableCount > 1) {
            parent = copyLeft(self, copyableCount - 1)
            prependableNode = parent.array[0]
          } else {
            parent = undefined
            prependableNode = self.root!
          }
          const path = createPath(depth - copyableCount, node)
          // add offset
          self.offset = 32 ** (depth - copyableCount + 1) - 32
          const prepended = nodePrepend(path, 32, prependableNode)
          if (parent === undefined) {
            self.root = prepended
          } else {
            parent.array[0] = prepended
          }
        }
        return self
      }
    }
    self.offset = newOffset
    return self
  }
}

/**
 * Prepends a node to a dense tree. The given `offset` is never zero.
 */
export function prependDense(
  node: Node,
  depth: number,
  offset: number,
  value: Node
): Node {
  // We're indexing down `offset - 1`. At each step `path` is either 0 or -1.
  const curOffset = (offset >> (depth * BranchBits)) & Mask
  const path = (((offset - 1) >> (depth * BranchBits)) & Mask) - curOffset
  if (path < 0) {
    return new Node(undefined, arrayPrepend(createPath(depth - 1, value), node.array))
  } else {
    const array = copyArray(node.array)
    array[0] = prependDense(array[0], depth - 1, offset, value)
    return new Node(undefined, array)
  }
}

const eMax = 2

export function createConcatPlan(array: Node[]): number[] | undefined {
  const sizes = []
  let sum = 0
  for (let i = 0; i < array.length; ++i) {
    sum += array[i]!.array.length // FIXME: maybe only access array once
    sizes[i] = array[i]!.array.length
  }
  const optimalLength = Math.ceil(sum / BranchingFactor)
  let n = array.length
  let i = 0
  if (optimalLength + eMax >= n) {
    return undefined // no rebalancing needed
  }
  while (optimalLength + eMax < n) {
    while (sizes[i]! > BranchingFactor - eMax / 2) {
      // Skip nodes that are already sufficiently balanced
      ++i
    }
    // the node at this index is too short
    let remaining = sizes[i]! // number of elements to re-distribute
    do {
      const size = Math.min(remaining + sizes[i + 1]!, BranchingFactor)
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
export function concatNodeMerge(
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

export function executeConcatPlan(
  merged: Node[],
  plan: number[],
  height: number
): any[] {
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
export function rebalance(
  left: Node | undefined,
  center: Node,
  right: Node | undefined,
  height: number,
  top: boolean
): Node {
  const merged = concatNodeMerge(left, center, right)
  const plan = createConcatPlan(merged)
  const balanced = plan !== undefined ? executeConcatPlan(merged, plan, height) : merged
  if (balanced.length <= BranchingFactor) {
    if (top === true) {
      return new Node(undefined, balanced)
    } else {
      // Return a single node with extra height for balancing at next
      // level
      return new Node(undefined, [setSizes(new Node(undefined, balanced), height)])
    }
  } else {
    return new Node(undefined, [
      setSizes(new Node(undefined, balanced.slice(0, BranchingFactor)), height),
      setSizes(new Node(undefined, balanced.slice(BranchingFactor)), height)
    ])
  }
}

export function concatSubTree<A>(
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

export function getHeight(node: Node): number {
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
export function appendNodeToTree<A>(l: MutableList<A>, array: A[]): MutableList<A> {
  if (l.root === undefined) {
    // The old list has no content in tree, all content is in affixes
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
      childIndex = (index >> shift) & Mask
      index &= ~(Mask << shift) // wipe just used bits
    } else {
      childIndex = currentNode.array.length - 1
      index -= currentNode.sizes[childIndex - 1]!
    }
    nodesVisited++
    if (childIndex < Mask) {
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
    if (currentNode.array.length < BranchingFactor) {
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
 * @param oldList
 * @param newList
 * @param k The number of nodes to copy. Will always be at least 1.
 * @param leafSize The number of elements in the leaf that will be inserted.
 */
export function copyFirstK(
  newList: MutableList<any>,
  k: number,
  leafSize: number
): Node {
  let currentNode = cloneNode(newList.root!) // copy root
  newList.root = currentNode // install root

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

export const concatBuffer = new Array(3)

export function concatAffixes<A>(left: List<A>, right: List<A>): number {
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

export function mapNode<A, B>(f: (a: A) => B, node: Node, depth: number): Node {
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

export function foldlNode<A, B>(
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

export function foldrNode<A, B>(
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

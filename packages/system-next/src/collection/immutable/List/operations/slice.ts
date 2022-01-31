import type { MutableList, Sizes } from "../definition"
import { List, Node } from "../definition"
import { arrayLast, emptyAffix } from "./_internal/array"
import {
  BranchBits,
  decrementDepth,
  getDepth,
  getPrefixSize,
  getSuffixSize,
  setDepth,
  setPrefix,
  setSuffix
} from "./_internal/bits"
import { cloneList, ListInternal } from "./_internal/ListInternal"
import { getPath, sizeOfSubtree } from "./_internal/node"

let newAffix: any[]
let newOffset = 0

/**
 * Returns a slice of a list. Elements are removed from the beginning and
 * end. Both the indices can be negative in which case they will count
 * from the right end of the list.
 *
 * @complexity `O(log(n))`
 * @tsplus fluent ets/List slice
 */
export function slice_<A>(self: List<A>, from: number, to: number): List<A> {
  /* eslint-disable-next-line prefer-const */
  let { bits, length } = self

  to = Math.min(length, to)
  // Handle negative indices
  if (from < 0) {
    from = length + from
  }
  if (to < 0) {
    to = length + to
  }

  // Should we just return the empty list?
  if (to <= from || to <= 0 || length <= from) {
    return List.empty()
  }

  // Return list unchanged if we are slicing nothing off
  if (from <= 0 && length <= to) {
    return self
  }

  const newLength = to - from
  let prefixSize = getPrefixSize(self)
  const suffixSize = getSuffixSize(self)

  // Both indices lie in the prefix
  if (to <= prefixSize) {
    return new ListInternal(
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
    return new ListInternal(
      setSuffix(newLength, 0),
      0,
      newLength,
      emptyAffix,
      undefined,
      self.suffix.slice(from - suffixStart, to - suffixStart)
    )
  }

  const newList = cloneList(self)
  newList.length = newLength

  // Both indices lie in the tree
  if (prefixSize <= from && to <= suffixStart) {
    sliceTreeList(
      from - prefixSize + self.offset,
      to - prefixSize + self.offset - 1,
      self.root!,
      getDepth(self),
      self.offset,
      newList
    )
    return newList
  }

  if (0 < from) {
    // we need to slice something off of the left
    if (from < prefixSize) {
      // shorten the prefix even though it's not strictly needed,
      // so that referenced items can be GC'd
      newList.prefix = self.prefix.slice(0, prefixSize - from)
      bits = setPrefix(prefixSize - from, bits)
    } else {
      // if we're here `to` can't lie in the tree, so we can set the
      // root
      newOffset = 0
      newList.root = sliceLeft(
        newList.root!,
        getDepth(self),
        from - prefixSize,
        self.offset,
        true
      )
      newList.offset = newOffset
      if (newList.root === undefined) {
        bits = setDepth(0, bits)
      }
      bits = setPrefix(newAffix.length, bits)
      prefixSize = newAffix.length
      newList.prefix = newAffix
    }
  }
  if (to < length) {
    // we need to slice something off of the right
    if (length - to < suffixSize) {
      bits = setSuffix(suffixSize - (length - to), bits)
      // slice the suffix even though it's not strictly needed,
      // to allow the removed items to be GC'd
      newList.suffix = self.suffix.slice(0, suffixSize - (length - to))
    } else {
      newList.root = sliceRight(
        newList.root!,
        getDepth(self),
        to - prefixSize - 1,
        newList.offset
      )
      if (newList.root === undefined) {
        bits = setDepth(0, bits)
        newList.offset = 0
      }
      bits = setSuffix(newAffix.length, bits)
      newList.suffix = newAffix
    }
  }
  newList.bits = bits
  return newList
}

/**
 * Returns a slice of a list. Elements are removed from the beginning and
 * end. Both the indices can be negative in which case they will count
 * from the right end of the list.
 *
 * @complexity `O(log(n))`
 * @ets_data_first slice_
 */
export function slice(from: number, to: number) {
  return <A>(self: List<A>): List<A> => self.slice(from, to)
}

export function sliceNode(
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

/**
 * Slice elements off of a tree from the left.
 */
export function sliceLeft(
  tree: Node,
  depth: number,
  index: number,
  offset: number,
  top: boolean
): Node | undefined {
  let {
    /* eslint-disable-next-line prefer-const */
    index: newIndex,
    path,
    /* eslint-disable-next-line prefer-const */
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
      newOffset |= (32 - (tree.array.length - path)) << (depth * BranchBits)
    }
    return sliceNode(tree, index, depth, path, tree.array.length - 1, child, undefined)
  }
}

/**
 * Slice elements off of a tree from the right.
 */
export function sliceRight(
  node: Node,
  depth: number,
  index: number,
  offset: number
): Node | undefined {
  /* eslint-disable-next-line prefer-const */
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

export function sliceTreeList<A>(
  from: number,
  to: number,
  tree: Node,
  depth: number,
  offset: number,
  l: MutableList<A>
): List<A> {
  const sizes = tree.sizes
  /* eslint-disable-next-line prefer-const */
  let { index: newFrom, path: pathLeft } = getPath(from, offset, depth, sizes)
  /* eslint-disable-next-line prefer-const */
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
    return sliceTreeList(
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

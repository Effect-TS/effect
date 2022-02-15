import { Option } from "../../../../../data/Option"
import type { List, Node } from "../../definition"
import { getDepth, getPrefixSize, getSuffixSize } from "./bits"

// -----------------------------------------------------------------------------
// Equals
// -----------------------------------------------------------------------------

export function elementEquals(a: any, b: any): boolean {
  if (a === b) {
    return true
  } else {
    return false
  }
}

export interface EqualsState<A> {
  iterator: Iterator<A>
  f: (a: A, b: A) => boolean
  equals: boolean
}

export function equalsCb<A>(value2: A, state: EqualsState<A>): boolean {
  const { value } = state.iterator.next()
  return (state.equals = state.f(value, value2))
}

// -----------------------------------------------------------------------------
// Fold
// -----------------------------------------------------------------------------

export interface FoldCb<Input, State> {
  (input: Input, state: State): boolean
}

function foldlArrayCb<A, B>(
  cb: FoldCb<A, B>,
  state: B,
  array: A[],
  from: number,
  to: number
): boolean {
  /* eslint-disable-next-line no-var */
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
  /* eslint-disable-next-line no-var */
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

/**
 * This function is a lot like a fold. But the reducer function is
 * supposed to mutate its state instead of returning it. Instead of
 * returning a new state it returns a boolean that tells wether or not
 * to continue the fold. `true` indicates that the folding should
 * continue.
 */
export function foldlCb<A, B>(cb: FoldCb<A, B>, state: B, l: List<A>): B {
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

export function foldrCb<A, B>(cb: FoldCb<A, B>, state: B, l: List<A>): B {
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

// -----------------------------------------------------------------------------
// FoldWhile
// -----------------------------------------------------------------------------

export interface FoldlWhileState<A, B> {
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
 * const xs = L.list(1, 3, 5, 60, 777, 800);
 * foldlWhile(isOdd, (n, m) => n + m, 0, xs) //=> 9
 *
 * const ys = L.list(2, 4, 6);
 * foldlWhile(isOdd, (n, m) => n + m, 111, ys) //=> 111
 */
export function foldlWhileCb<A, B>(a: A, state: FoldlWhileState<A, B>): boolean {
  if (state.predicate(state.result, a) === false) {
    return false
  }
  state.result = state.f(state.result, a)
  return true
}

// -----------------------------------------------------------------------------
// Predicates
// -----------------------------------------------------------------------------

export interface PredState {
  predicate: (a: any) => boolean
  result: any
}

export function everyCb<A>(value: A, state: PredState): boolean {
  return (state.result = state.predicate(value))
}

export function someCb<A>(value: A, state: PredState): boolean {
  return !(state.result = state.predicate(value))
}

export function findCb<A>(value: A, state: PredState): boolean {
  if (state.predicate(value)) {
    state.result = Option.some(value)
    return false
  } else {
    return true
  }
}

// -----------------------------------------------------------------------------
// IndexOf
// -----------------------------------------------------------------------------

export interface IndexOfState {
  element: any
  found: boolean
  index: number
}

export function indexOfCb(value: any, state: IndexOfState): boolean {
  ++state.index
  return !(state.found = elementEquals(value, state.element))
}

// -----------------------------------------------------------------------------
// FindIndex
// -----------------------------------------------------------------------------

export interface FindIndexState {
  predicate: (a: any) => boolean
  found: boolean
  index: number
}

export function findIndexCb<A>(value: A, state: FindIndexState): boolean {
  ++state.index
  return !(state.found = state.predicate(value))
}

// -----------------------------------------------------------------------------
// FindNotIndex
// -----------------------------------------------------------------------------

export interface FindNotIndexState {
  predicate: (a: any) => boolean
  index: number
}

export function findNotIndexCb(value: any, state: FindNotIndexState): boolean {
  if (state.predicate(value)) {
    ++state.index
    return true
  } else {
    return false
  }
}

// -----------------------------------------------------------------------------
// ContainsState
// -----------------------------------------------------------------------------

export interface ContainsState {
  element: any
  result: boolean
}

export const containsState: ContainsState = {
  element: undefined,
  result: false
}

export function containsCb(value: any, state: ContainsState): boolean {
  return !(state.result = value === state.element)
}

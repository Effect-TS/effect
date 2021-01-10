// copyright https://github.com/frptools
import { throwArgumentError, throwInvalidOperation } from "../Errors"
import {
  isBoolean,
  isDefined,
  isFunction,
  isIterable,
  isNothing,
  isObject,
  isPlain,
  isUndefined
} from "../Guards"
import { PCGRandom } from "../Random"

//
// Comparable
//

export const compareSymbol = Symbol()

export interface Comparable {
  readonly [compareSymbol]: (other: this) => number
}

export function isComparable(value: object): value is Comparable
export function isComparable(value: object): boolean
export function isComparable(value: object) {
  return compareSymbol in <any>value
}

export function compare<T extends Comparable>(a: T, b: T): number {
  return a[compareSymbol](b)
}

//
// Equatable
//

export const equalsSymbol = Symbol()

export interface Equatable {
  readonly [equalsSymbol]: (other: any) => boolean
}

/**
 * Checks whether the specified argument implements `Equatable`.
 */
export function isEquatable(value: object): value is Equatable
export function isEquatable(value: object): boolean
export function isEquatable(value: object) {
  return equalsSymbol in <any>value
}

/**
 * Checks whether two `Equatable` objects have equivalent data. If both objects implement
 * `Equatable` but are of different iterable types, their values are iterated over in tandem, and
 * checked for either strict equality, or with `isEqual` if both child values implement `Equatable`.
 */
export function isEqual(a: any, b: any): boolean {
  if (a === b) {
    return true
  }

  const na = isNothing(a),
    nb = isNothing(b)
  if (na || nb) {
    return na === nb
  }

  if (isObject(a)) {
    if (isEquatable(a)) {
      return a[equalsSymbol](b)
    }

    if (!isObject(b)) {
      return false
    }

    if (isEquatable(b)) {
      return b[equalsSymbol](a)
    }

    if (isIterable(a) && isIterable(b)) {
      const ita = a[Symbol.iterator]()
      const itb = b[Symbol.iterator]()
      let ca
      do {
        // eslint-disable-next-line no-var
        ca = ita.next()
        const cb = itb.next()
        if (ca.done !== cb.done) {
          return false
        }
        if (!ca.done) {
          const va = ca.value,
            vb = cb.value
          if (!isEqual(va, vb)) {
            return false
          }
        }
      } while (!ca.done)
      return true
    }
  } else if (isObject(b) && isEquatable(b)) {
    return b[equalsSymbol](a)
  }

  return false
}

//
// Persistent
//

export type PreferredContext = Persistent | MutationContext | boolean

export interface PersistentConstructor<T extends Persistent = Persistent> {
  new (...args: any[]): T
}

export const mutationContextSymbol = Symbol()
export const cloneSymbol = Symbol()

/**
 * All persistent structures must implement this interface in order to participate in batches of
 * mutations among multiple persistent objects of different types. Though designed to allow for
 * batched mutations, `Persistent` and the associated API functions provide a convenient
 * suite of functionality for providing any structural type with persistent/immutable behaviour and
 * associated mutation characteristics.
 */
export interface Persistent {
  /**
   * The associated mutation context. During construction of the first version of a persistent
   * object, use `immutableContext()` if default immutability is required, or `mutableContext()` if
   * the object should be constructed in a mutable state. Do not reassign this property after it has
   * been assigned during construction. Do not ever directly modify its internal properties.
   */
  readonly [mutationContextSymbol]: MutationContext

  /**
   * Create a clone of the structure, retaining all relevant internal properties and state as-is.
   * The method is provided with a new MutationContext instance, which should be assigned to the
   * clone of the object during construction. Internal subordinate persistent substructures should
   * not be cloned at this time. When updates are being applied to a persistent object,
   * substructures should use `asMutable()`, with their owning structure passed in as the joining
   * context.
   */
  readonly [cloneSymbol]: (mctx: MutationContext) => Persistent
}

/**
 * A mutation context stores contextual information with respect to the temporary mutability of a
 * persistent object and zero or more other persistent objects (of the same or differing types) with
 * which it is associated. Once a mutation context has been frozen, it cannot be unfrozen; the
 * associated persistent objects must first be cloned with new mutation contexts. Committing a
 * mutation context is an in-place operation; given that it indicates that mutability is permitted,
 * the committing of the context (and all associated persistent objects) is therefore the final
 * mutable operation performed against those objects.
 */
export class MutationContext {
  /**
   * A shared token indicating whether the mutation context is still active, or has become frozen.
   * A one-tuple is used because arrays can be shared by reference among multiple mutation contexts,
   * and the sole element can then be switched from `true` to `false` in order to simultaneously
   * make all associated persistent objects immutable with a single O(1) operation.
   */
  public readonly token: [boolean]

  /**
   * Indicates whether this MutationContext instance originated with the value to which it is
   * attached. If true, the shared token may be frozen when mutations are complete. If false, then
   * the committing of the shared token must be performed with reference to the value where the
   * mutation context originated. Note that a non-owned MutationContext instance can itself be
   * shared among many persistent objects. For many objects to participate in a larger mutation
   * batch, it is only necessary to have two MutationContext instances; one for the owner, and one
   * for all subsequent persistent objects that are participating in, but not in control of, the
   * scope of the mutations.
   */
  public scope: number

  constructor(token: [boolean], scope: number) {
    this.token = token
    this.scope = scope
  }
}

/**
 * Performs a shallow clone of a persistent structure. It is up to the API that provides structural
 * manipulation operations on the input type to ensure that, before applying mutations, any relevant
 * internal substructures are cloned when their associated mutation contexts do not match that of
 * their owner.
 */
export function clone<T extends Persistent>(value: T, pctx?: PreferredContext): T {
  return <T>value[cloneSymbol](selectContext(pctx))
}

/**
 * Checks whether the input function constructs an instance of the `Persistent` interface.
 */
export function isPersistentConstructor(value: Function): value is PersistentConstructor
export function isPersistentConstructor(value: Function): boolean
export function isPersistentConstructor(value: Function) {
  return isFunction(value) && isFunction(value.prototype[cloneSymbol])
}

/**
 * Checks whether the input object implements the `Persistent` interface, and narrows the input type
 * accordingly.
 */
export function isPersistent(value: object): value is Persistent
export function isPersistent(value: object): boolean
export function isPersistent(value: object) {
  return mutationContextSymbol in <any>value
}

/**
 * Returns the default frozen mutation context for use with new immutable objects. This function
 * should only be used when constructing the first version of a new persistent object. Any
 * subsequent copies of that object should use `doneMutating()` and related functions.
 */
export function immutable(): MutationContext {
  return FROZEN
}

/**
 * Makes a mutable context immutable, along with all associated subordinate contexts. If the input
 * argument is itself a subordinate context, this function does nothing.
 */
export function commitContext(mctx: MutationContext): void {
  if (isPrimaryContext(mctx)) close(mctx)
}

/**
 * Returns a new mutable context to be associated with, and owned by, a persistent object. This
 * function should only be used when constructing the first version of a new persistent object. Any
 * subsequent updates to that object should use `asMutable()` and related functions.
 */
export function mutable(): MutationContext {
  return new MutationContext([true], 0)
}

/**
 * Returns a mutation context that matches the mutability characteristics of the supplied argument.
 * If no argument is supplied, an immutable context is returned. If the argument is another mutable
 * object, the returned context will be a mutable subordinate to that context, or a direct reference
 * to that context if it is already subordinate to some other mutable context.
 */
export function selectContext(pctx?: PreferredContext): MutationContext {
  return pctx === void 0
    ? FROZEN
    : isBoolean(pctx)
    ? pctx
      ? mutable()
      : FROZEN
    : // : isMutationContext(pctx) ? isMutableContext(pctx) ? pctx : FROZEN
    isMutationContext(pctx)
    ? isMutableContext(pctx)
      ? pctx
      : FROZEN
    : getSubordinateContext(pctx)
}

export function getMutationContext(value: Persistent): MutationContext {
  const mctx = value[mutationContextSymbol]
  if (isUndefined(mctx)) {
    throwInvalidOperation(
      "Attempted to obtain a mutation context from an invalid target"
    )
  }
  return mctx
}

/**
 * Determines whether a value is a MutationContext object instance.
 */
export function isMutationContext(value: any): value is MutationContext
export function isMutationContext(value: any): boolean
export function isMutationContext(value: any) {
  return isObject(value) && value instanceof MutationContext
}

/**
 * Tests whether the value is currently in a mutable state, with changes able to be applied directly
 * to the value, rather than needing to clone the value first.
 */
export function isMutable(value: Persistent): boolean {
  return isMutableContext(getMutationContext(value))
}

/**
 * Tests whether the value is currently in an immutable state, requiring a clone to be created if
 * mutations are desired.
 */
export function isImmutable(value: Persistent): boolean {
  return !isMutable(value)
}

/**
 * Checks if the current context is mutable
 */
export function isMutableContext(mctx: MutationContext): boolean {
  return mctx.token[0]
}

/**
 * Checks if the current context is immutable
 */
export function isImmutableContext(mctx: MutationContext): boolean {
  return !isMutableContext(mctx)
}

/**
 * Tests whether two values are currently part of the same active batch of uncommitted mutations,
 * whereby committing the mutation context of the value where it originated will cause all other
 * structures that share the same mutation context to become immutable also.
 *
 * After a shared context is committed, this function can be used to lazily apply changes to data
 * structures that are private and internal to an outer data structure. An example is `Slot` objects
 * contained within the `List` data structure. Those objects are never accessed via the `List`
 * structure's public API, but are often the target of latebound changes applied well after a
 * mutation context has been committed. By checking if they shared the same context as their parent,
 * it can be determined whether they need to be cloned and replaced, or if they can be mutated in
 * place so as to apply any pending changes before their internal data is queried as part of a call
 * being made against the outer structure.
 */
export function areContextsRelated(a: Persistent, b: Persistent): boolean {
  return token(a) === token(b)
}

/**
 * Checks if the value has a related context
 */
export function hasRelatedContext(mctx: MutationContext, value: Persistent): boolean {
  return mctx.token === token(value)
}

/**
 * Returns a mutation context that is subordinate to that of the object it was created for. The
 * returned mutation context matches the mutability of the one from which it is being cloned.
 */
export function getSubordinateContext(value: Persistent): MutationContext {
  return asSubordinateContext(getMutationContext(value))
}

/**
 * Returns a mutation context that is subordinate to the input context. The returned context cannot
 * be used to complete a batch of mutations, but objects to which it is attached will automatically
 * become immutable when the original (non-subordinate) context is frozen. If the input context is
 * already subordinate to another, it can be safely shared among multiple host objects, and is
 * therefore returned as-is, rather than being cloned. Mutation contexts do not retain any
 * hierarchy beyond being subordinate to the originating/owning context, hence the lack of
 * subsequent cloning. This also reduces allocations by enabling reference sharing.
 */
export function asSubordinateContext(mctx: MutationContext): MutationContext {
  return mctx.scope >= 0 ? new MutationContext(mctx.token, -1) : mctx
}

/**
 * Checks if the mutation context is primary
 */
export function isPrimaryContext(mctx: MutationContext): boolean {
  return mctx.scope >= 0
}

/**
 * Checks if the mutation context is subordinated
 */
export function isSubordinateContext(mctx: MutationContext): boolean {
  return mctx.scope === -1
}

/**
 * Checks if the contexts are related
 */
export function isRelatedContext(a: MutationContext, b: MutationContext): boolean {
  return a.token === b.token
}

/**
 * Applies the mutation context
 */
export function modify<T extends Persistent>(value: T): T {
  const mc = getMutationContext(value)
  return isMutableContext(mc)
    ? isSubordinateContext(mc)
      ? value
      : (incScope(mc), value)
    : clone(value, mutable())
}

/**
 * Commit the changes
 */
export function commit<T extends Persistent>(value: T): T {
  const mc = getMutationContext(value)
  return isPrimaryContext(mc) && (mc.scope === 0 ? close(mc) : decScope(mc)), value
}

/**
 * Returns the second argument as a mutable subordinate of the first argument. If the first argument is already
 * subordinate to an existing mutation context, the subordinate context reference is shared as-is. Committing the
 * primary context's modifications (via commit(), passing in the context owner) has the side effect of ending
 * modifications on any mutable objects whose mutation context is subordinate to the primary context. Committing
 * modifications directly on a subordinate object has no effect; that object will remain mutable until commit() is
 * called on the context owner (i.e. the object for which the mutable context was originally created).
 */
export function modifyAsSubordinate<T extends Persistent>(
  context: Persistent | MutationContext,
  value: T
): T {
  const mctxChild = getMutationContext(value)
  const mctxParent = isMutationContext(context) ? context : getMutationContext(context)

  return isMutableContext(mctxParent)
    ? isRelatedContext(mctxChild, mctxParent) && isSubordinateContext(mctxChild)
      ? value
      : clone(value, asSubordinateContext(mctxParent))
    : throwArgumentError(
        "context",
        "The first argument must refer to a mutable object or mutation context"
      )
}

/**
 * Returns the second argument as a mutable equal of the first argument (as context owner if the first argument is the
 * context owner or is immutable, or as subordinate if the first argument also has a subordinate context)
 */
export function modifyAsEqual<T extends Persistent>(
  context: Persistent | MutationContext,
  value: T
): T {
  const mcChild = getMutationContext(value)
  const mcParent = isMutationContext(context) ? context : getMutationContext(context)

  return isMutableContext(mcParent)
    ? isRelatedContext(mcChild, mcParent) &&
      (isSubordinateContext(mcParent) || isPrimaryContext(mcChild))
      ? value
      : clone(value, mcParent)
    : throwArgumentError(
        "context",
        "The first argument must refer to a mutable object or mutation context"
      )
}

/**
 * Ensures that the specified child property is a mutable member of the same batch that is currently active for its
 * parent. If the child is already part of the same mutation batch, it is returned as-is. If not, it is cloned as a
 * subordinate of the parent's mutation batch, reassigned to the parent and then returned.
 */
export function modifyProperty<
  T extends Persistent & { [N in P]: R },
  P extends keyof T,
  R extends Persistent
>(parent: T, name: P): T[P] {
  if (isImmutable(parent))
    return throwInvalidOperation("Cannot modify properties of an immutable object")
  let child = parent[name]

  if (isRelatedContext(getMutationContext(child), getMutationContext(parent)))
    return child

  parent[name] = child = clone(child, parent)

  return child
}

/**
 * Returns a version of the input value that matches the mutability specified by the first argument. If the first
 * argument is a mutable object, the returned value will be cloned into the same mutation batch with a mutable context
 * that is subordinate to the batch owner.
 */
export function withMutability<T extends Persistent>(
  pctx: PreferredContext | undefined,
  value: T
): T {
  let mctx: MutationContext
  if (pctx === void 0) {
    mctx = FROZEN
  } else if (isBoolean(pctx)) {
    if (pctx === isMutable(value)) return value
    mctx = pctx ? mutable() : FROZEN
  } else if (isMutationContext(pctx)) {
    if (isRelatedContext(pctx, getMutationContext(value))) return value
    mctx = pctx
  } else {
    if (areContextsRelated(pctx, value)) return value
    mctx = getSubordinateContext(pctx)
  }
  value = <T>value[cloneSymbol](mctx)
  return value
}

/**
 * Returns a version of the `value` argument that is guaranteed to have the specified mutation
 * context instance. The `value` argument is cloned only if its mutation context does not match the
 * `mctx` argument. Note that the exact `mctx` reference is checked; this function does not check if
 * the contexts are related, or whether or not they're mutable, it simply ensures that the returned
 * value uses the referenced mutation context instance.
 */
export function ensureContext<T extends Persistent>(
  mctx: MutationContext,
  value: T
): T {
  return getMutationContext(value) === mctx ? value : <T>value[cloneSymbol](mctx)
}

export type UpdaterFn<T extends Persistent, U> = (value: T) => U

/**
 * Allows batches of in-place mutations to be applied to a persistent object. When mutations are
 * completed, if the input value was already mutable, it is passed to the mutation function as-is,
 * and returned when the mutation function returns. If the input value was immutable, a mutable copy
 * is passed to the mutation function, and then frozen before being returned.
 *
 * @param mutate A function that is passed a mutable version of the input value
 * @param value An updated version of the input value
 */
export function update<T extends Persistent>(value: T, mutate: UpdaterFn<T, any>): T {
  value = modify(value)
  mutate(value)
  return commit(value)
}

function token(value: Persistent): [boolean] {
  return getMutationContext(value).token
}

function close(mctx: MutationContext): void {
  mctx.token[0] = false
}

function incScope(mctx: MutationContext): void {
  ;(<any>mctx).scope++
}

function decScope(mctx: MutationContext): void {
  ;(<any>mctx).scope--
}

const FROZEN = Object.freeze(new MutationContext([false], -1))

//
// Hashable
//

export const hashSymbol = Symbol()

export interface Hashable {
  readonly [hashSymbol]: () => number
}

/**
 * Checks if value is Hashable
 */
export function isHashable(value: object): value is Hashable
export function isHashable(value: object): boolean
export function isHashable(value: object): value is Hashable {
  return hashSymbol in <any>value
}

/**
 * Computes hash
 */
export function hash(arg: any): number {
  return opt(_hash(arg))
}

/**
 * Computes hash of array
 */
export function hashArray(arr: any[]): number {
  return opt(_hashArray(arr))
}

/**
 * Computes hash of arguments
 */
export function hashArgs(...args: any[]): number
export function hashArgs(): number {
  let h = 5381
  for (let i = 0; i < arguments.length; i++) {
    // eslint-disable-next-line prefer-rest-params
    h = _combineHash(h, hash(arguments[i]))
  }
  return opt(h)
}

/**
 * Combine hashes
 */
export function combineHash(a: number, b: number): number {
  return opt(_combineHash(a, b))
}

/**
 * Computes hash of object
 */
export function hashObject(value: object): number {
  return opt(_hashObject(value))
}

/**
 * Computes hash of misc ref
 */
export function hashMiscRef(o: Object): number {
  return opt(_hashMiscRef(o))
}

/**
 * Computes hash of iterator
 */
export function hashIterator(it: Iterator<any>): number {
  return opt(_hashIterator(it))
}

/**
 * Computes hash of plain object
 */
export function hashPlainObject(o: object): number {
  return opt(_hashPlainObject(o))
}

/**
 * Computes hash of number
 */
export function hashNumber(n: number): number {
  return opt(_hashNumber(n))
}

/**
 * Computes hash of string
 */
export function hashString(str: string): number {
  return opt(_hashString(str))
}

function isZero(value: any): boolean {
  return value === null || value === void 0 || value === false
}

const RANDOM = new PCGRandom(13)
const CACHE = new WeakMap<Object, number>()

function randomInt() {
  return RANDOM.integer(0x7fffffff)
}

function _hash(arg: any): number {
  if (isZero(arg)) return 0
  if (typeof arg.valueOf === "function" && arg.valueOf !== Object.prototype.valueOf) {
    arg = arg.valueOf()
    if (isZero(arg)) return 0
  }
  switch (typeof arg) {
    case "number":
      return _hashNumber(arg)
    case "string":
      return _hashString(arg)
    case "function":
      return _hashMiscRef(arg)
    case "object":
      return _hashObject(arg)
    case "boolean":
      return arg === true ? 1 : 0
    default:
      return 0
  }
}

function _hashArray(arr: any[]): number {
  let h = 6151
  for (let i = 0; i < arr.length; i++) {
    h ^= _combineHash(_hashNumber(i), _hash(arr[i]))
  }
  return h
}

function _combineHash(a: number, b: number): number {
  return (a * 53) ^ b
}

function _hashObject(value: object): number {
  let h = CACHE.get(value)
  if (isDefined(h)) return h

  if (Array.isArray(value)) {
    h = _hashArray(value)
  } else if (isHashable(value)) {
    h = value["@@hash"]()
  } else if (isIterable(value)) {
    h = _hashIterator(value[Symbol.iterator]())
  } else if (isPlain(value)) {
    h = _hashPlainObject(value)
  } else {
    h = randomInt()
  }
  if (!isPersistent(value) || isImmutable(value)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    CACHE.set(value, h!)
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return h!
}

function _hashMiscRef(o: Object): number {
  let h = CACHE.get(o)
  if (isDefined(h)) return h
  h = randomInt()
  CACHE.set(o, h)
  return h
}

function _hashIterator(it: Iterator<any>): number {
  let h = 6151
  let current: IteratorResult<any>
  while (!(current = it.next()).done) {
    h = _combineHash(h, hash(current.value))
  }
  return h
}

function _hashPlainObject(o: object): number {
  CACHE.set(o, randomInt())
  const keys = Object.keys(o)
  let h = 12289
  for (let i = 0; i < keys.length; i++) {
    h = _combineHash(h, _hashString(keys[i]))
    h = _combineHash(h, hash((o as any)[keys[i]]))
  }
  return h
}

function _hashNumber(n: number): number {
  if (n !== n || n === Infinity) return 0
  let h = n | 0
  if (h !== n) h ^= n * 0xffffffff
  while (n > 0xffffffff) h ^= n /= 0xffffffff
  return n
}

function _hashString(str: string): number {
  let h = 5381,
    i = str.length
  while (i) h = (h * 33) ^ str.charCodeAt(--i)
  return h
}

function opt(n: number) {
  return (n & 0xbfffffff) | ((n >>> 1) & 0x40000000)
}

//
// Unwrappable
//

export const unwrapSymbol = Symbol()

/**
 * An object that implements `Unwrappable` is capable of serializing itself to a native type, such
 * as a plain object or array. If children of the object will also be unwrapped, implement
 * `RecursiveUnwrappable` instead, in order to prevent infinite recursion when circular references
 * are encountered during descent.
 */
export interface Unwrappable<T> {
  readonly [unwrapSymbol]: () => T
}

export const unwrapIntoSymbol = Symbol()

export const createUnwrapTargetSymbol = Symbol()

/**
 * An object that implements `RecursiveUnwrappable` is capable of recursively serializing itself and
 * its children to a native type, such as a plain object or array.
 */
export interface RecursiveUnwrappable<T> extends Unwrappable<T> {
  readonly [unwrapIntoSymbol]: (target: T) => T
  readonly [createUnwrapTargetSymbol]: () => T
}

/**
 * Checks whether the input argument implements the `Unwrappable<T>` interface, and narrows the type
 * accordingly.
 */
export function isUnwrappable<T>(value: object): value is Unwrappable<T>
export function isUnwrappable<T>(value: object): boolean
export function isUnwrappable(value: object) {
  return unwrapSymbol in <any>value
}

/**
 * Checks whether the input argument implements the `RecursiveUnwrappable<T>` interface, and narrows
 * the type accordingly.
 */
export function isRecursiveUnwrappable<T>(
  value: object
): value is RecursiveUnwrappable<T>
export function isRecursiveUnwrappable<T>(value: object): boolean
export function isRecursiveUnwrappable(value: object) {
  return unwrapIntoSymbol in <any>value
}

const CIRCULARS = new WeakMap<any, any>()

/**
 * Unwraps an instance of a `Unwrappable` object as a plain JavaScript value or object. The nature
 * of the return value is determined by the implementation of the `Unwrappable` interface pertaining
 * to the input argument.
 */
export function unwrap(source: any, force?: boolean): any
export function unwrap<T = any>(source: T | Unwrappable<T>, force?: boolean): T
export function unwrap<T = any>(source: any, force = false): any {
  if (!isObject(source)) {
    return source
  }

  if (Array.isArray(source)) {
    return source.map((value) => unwrap(value))
  }

  if (!isUnwrappable<T>(source)) {
    if (isPersistent(source) || force) {
      source = new Unwrapper(source)
    } else {
      return source
    }
  }

  if (CIRCULARS.has(source)) {
    return CIRCULARS.get(source)
  }
  let value: T
  if (isRecursiveUnwrappable<T>(source)) {
    const target = source[createUnwrapTargetSymbol]()
    CIRCULARS.set(source, target)
    value = source[unwrapIntoSymbol](target)
    CIRCULARS.delete(source)
  } else {
    value = source[unwrapSymbol]()
  }
  return value
}

class Unwrapper implements RecursiveUnwrappable<any> {
  constructor(public source: any) {
    this[unwrapSymbol] = this[unwrapSymbol].bind(this)
    this[unwrapIntoSymbol] = this[unwrapIntoSymbol].bind(this)
    this[createUnwrapTargetSymbol] = this[createUnwrapTargetSymbol].bind(this)
  }

  [unwrapSymbol](): any {
    return this.source
  }

  [unwrapIntoSymbol](target: any): any {
    const keys = Object.getOwnPropertyNames(this.source)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (key.startsWith("@@") || key.startsWith("_")) continue
      target[key] = unwrap(this.source[key])
    }
    return target
  }

  [createUnwrapTargetSymbol](): any {
    return {}
  }
}

export function unwrapKey(key: any): string {
  const value = unwrap(key)
  return isObject(value) ? JSON.stringify(value) : value
}

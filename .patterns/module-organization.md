# Module Organization Patterns - Effect Library

## 🎯 OVERVIEW
Established patterns for organizing modules in the Effect library, based on analysis of the core codebase structure and conventions.

## 📁 DIRECTORY STRUCTURE PATTERNS

### Core Module Organization
```
packages/effect/src/
├── collections/          # Data structures (Array, HashMap, etc.)
├── concurrency/          # Concurrent operations (Fiber, Semaphore, etc.)
├── data/                 # Core data types (Option, Either, etc.)
├── interfaces/           # Type interfaces (Equal, Hash, etc.)
├── internal/             # Private implementation details
├── platform/             # Platform abstractions
├── streaming/            # Stream operations
├── utils/                # Utility functions
└── [module].ts           # Core modules (Effect.ts, Layer.ts, etc.)
```

### Export Pattern Structure
**Index file pattern (packages/effect/src/collections/index.ts):**
```typescript
/**
 * @since 2.0.0
 */
export * as Array from "./Array.js"
export * as Chunk from "./Chunk.js"
export * as HashMap from "./HashMap.js"
export * as HashSet from "./HashSet.js"
export * as List from "./List.js"
export * as SortedMap from "./SortedMap.js"
export * as SortedSet from "./SortedSet.js"
```

### Template Files for Build Generation
**Template pattern (packages/effect/src/index.ts.tpl):**
```typescript
/**
 * @since 2.0.0
 */

// Core Effects
export * as Effect from "./Effect.js"
export * as Exit from "./Exit.js"
export * as Layer from "./Layer.js"

// Domain Exports
export * from "./collections/index.js"
export * from "./concurrency/index.js"
export * from "./data/index.js"
```

## 🏗️ MODULE STRUCTURE PATTERNS

### Standard Module File Structure
```typescript
/**
 * Module description with @since version
 */

// Imports (organized by category)
import * as internal from "../internal/moduleName.js"
import type { TypeLambda } from "../types/HKT.js"
import { dual } from "../Function.js"

// Type definitions
export interface ModuleName<A> {
  readonly [TypeId]: TypeId
  // Interface members
}

// Type Lambda for higher-kinded types
export interface ModuleNameTypeLambda extends TypeLambda {
  readonly type: ModuleName<this["Target"]>
}

// Type ID for runtime identification
const TypeId: unique symbol = Symbol.for("effect/ModuleName") as TypeId
export type TypeId = typeof TypeId

// Constructors (creation functions)
/**
 * @example
 * @since version
 * @category constructors
 */
export const make = <A>(value: A): ModuleName<A> => internal.make(value)

// Combinators (transformation functions)
/**
 * @example
 * @since version
 * @category combinators
 */
export const map = dual<
  <A, B>(f: (a: A) => B) => (self: ModuleName<A>) => ModuleName<B>,
  <A, B>(self: ModuleName<A>, f: (a: A) => B) => ModuleName<B>
>(2, internal.map)

// Utilities and other functions
```

### Internal Module Pattern
**Internal organization (packages/effect/src/internal/array.ts):**
```typescript
/** @internal */

// Private implementation details
const ArrayProto = {
  [Equal.symbol]<A>(this: ReadonlyArray<A>, that: Equal.Equal): boolean {
    return isArray(that) && arrayEquals(this, that)
  },
  [Hash.symbol]<A>(this: ReadonlyArray<A>): number {
    return Hash.array(this)
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

// Internal implementation functions
export const make = <A>(...elements: ReadonlyArray<A>): Array<A> => {
  const arr = [...elements]
  Object.setPrototypeOf(arr, ArrayProto)
  return arr as any
}

export const map = <A, B>(
  self: ReadonlyArray<A>,
  f: (a: A, i: number) => B
): Array<B> => {
  const result = new globalThis.Array(self.length)
  for (let i = 0; i < self.length; i++) {
    result[i] = f(self[i]!, i)
  }
  Object.setPrototypeOf(result, ArrayProto)
  return result as any
}
```

## 🏷️ NAMING CONVENTIONS

### Function Naming Patterns
```typescript
// Constructors - create new instances
export const make = <A>(value: A): Effect<A>
export const of = <A>(value: A): Effect<A>
export const empty = (): Effect<never>
export const fromIterable = <A>(iterable: Iterable<A>): Effect<A>

// Combinators - transform existing instances
export const map = dual<...>()
export const flatMap = dual<...>()
export const filter = dual<...>()
export const zip = dual<...>()

// Predicates - boolean-returning functions
export const isSome = <A>(option: Option<A>): boolean
export const isNone = <A>(option: Option<A>): boolean
export const isEffect = (value: unknown): value is Effect<unknown>

// Destructors - extract or convert values
export const getOrElse = dual<...>()
export const match = dual<...>()
export const toArray = <A>(chunk: Chunk<A>): ReadonlyArray<A>

// Utilities - helper functions
export const reverse = <A>(array: ReadonlyArray<A>): Array<A>
export const sort = dual<...>()
export const partition = dual<...>()
```

### Type Naming Patterns
```typescript
// Core types use PascalCase
export interface Effect<A, E = never, R = never>
export interface Option<A>
export interface Either<E, A>

// Type lambdas have TypeLambda suffix
export interface EffectTypeLambda extends TypeLambda
export interface OptionTypeLambda extends TypeLambda

// Non-empty variants use NonEmpty prefix
export type NonEmptyArray<A> = readonly [A, ...Array<A>]
export type NonEmptyString = string & { readonly NonEmptyString: unique symbol }

// Readonly variants
export type ReadonlyArray<A> = readonly A[]
export type ReadonlyRecord<K extends string | symbol, V> = { readonly [P in K]: V }
```

## 🔄 DUAL FUNCTION PATTERN

### Standard Dual Implementation
```typescript
/**
 * Maps over a structure using the provided function.
 *
 * @example
 * ```ts
 * import { Array } from "effect/collections"
 * 
 * // Data-first usage
 * const result1 = Array.map([1, 2, 3], x => x * 2)
 * 
 * // Data-last usage (pipeable)
 * const result2 = [1, 2, 3].pipe(
 *   Array.map(x => x * 2)
 * )
 * ```
 *
 * @since 2.0.0
 * @category combinators
 */
export const map = dual<
  <A, B>(f: (a: A, index: number) => B) => (self: ReadonlyArray<A>) => Array<B>,
  <A, B>(self: ReadonlyArray<A>, f: (a: A, index: number) => B) => Array<B>
>(2, (self, f) => self.map(f))
```

### Arity-Based Dual Pattern
```typescript
// When the number of parameters is fixed
export const filter = dual<
  <A, B extends A>(predicate: (a: A) => a is B) => (self: ReadonlyArray<A>) => Array<B>,
  <A, B extends A>(self: ReadonlyArray<A>, predicate: (a: A) => a is B) => Array<B>
>(2, internalArray.filter)

// When using predicate-based dual
export const update = dual<
  <A>(index: number, f: (a: A) => A) => (self: ReadonlyArray<A>) => Array<A>,
  <A>(self: ReadonlyArray<A>, index: number, f: (a: A) => A) => Array<A>
>((args) => Array.isArray(args[0]), internalArray.update)
```

## 🏷️ TYPE IDENTIFICATION PATTERN

### TypeId Pattern
```typescript
/**
 * The type identifier for this data type.
 * Used for runtime type checking and debugging.
 */
const TypeId: unique symbol = Symbol.for("effect/ModuleName") as TypeId

/**
 * @category symbols
 * @since 2.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 2.0.0
 */
export interface ModuleName<A> {
  readonly [TypeId]: TypeId
  // other properties
}
```

### Type Guard Pattern
```typescript
/**
 * Type guard to check if a value is an instance of ModuleName.
 *
 * @example
 * ```ts
 * import { ModuleName } from "effect"
 * 
 * const value: unknown = ModuleName.make(42)
 * 
 * if (ModuleName.isModuleName(value)) {
 *   // value is now typed as ModuleName<unknown>
 *   console.log("Is ModuleName")
 * }
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isModuleName = (value: unknown): value is ModuleName<unknown> =>
  typeof value === "object" && value !== null && TypeId in value
```

## 📊 VARIANCE ANNOTATION PATTERN

### Interface Variance
```typescript
/**
 * Represents the variance of the type parameters.
 * - `in ROut`: Contravariant (input position)
 * - `out E`: Covariant (output position)  
 * - `out RIn`: Covariant (output position)
 */
export interface Variance<in ROut, out E, out RIn> {
  readonly [TypeId]: {
    readonly _ROut: Types.Contravariant<ROut>
    readonly _E: Types.Covariant<E>
    readonly _RIn: Types.Covariant<RIn>
  }
}

export interface Layer<in ROut, out E = never, out RIn = never>
  extends Variance<ROut, E, RIn>, Pipeable {
  // Layer-specific methods
}
```

## 🔗 PIPEABLE INTEGRATION PATTERN

### Pipeable Implementation
```typescript
import type { Pipeable } from "../interfaces/Pipeable.js"
import { pipeArguments } from "../Function.js"

const Proto = {
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * @category models
 * @since 2.0.0
 */
export interface ModuleName<A> extends Pipeable {
  readonly [TypeId]: TypeId
  // other properties
}

// Attach to prototype for pipe support
export const make = <A>(value: A): ModuleName<A> => {
  const instance = { [TypeId]: TypeId, value }
  Object.setPrototypeOf(instance, Proto)
  return instance as ModuleName<A>
}
```

## 📝 SUCCESS CRITERIA

### Well-Organized Module Checklist
- [ ] Clear directory structure following domain separation
- [ ] Consistent export patterns using index files
- [ ] Proper internal vs public API separation
- [ ] Standard function naming conventions
- [ ] Dual function support for data-first/data-last usage
- [ ] Type identification with TypeId symbols
- [ ] Variance annotations for type parameters
- [ ] Pipeable interface integration
- [ ] Comprehensive JSDoc with examples
- [ ] Version annotations (@since) on all exports

This module organization ensures consistency, discoverability, and maintainability across the entire Effect library codebase.
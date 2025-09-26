# JSDoc Documentation Patterns - Effect Library

## 🎯 OVERVIEW
Comprehensive JSDoc documentation patterns used throughout the Effect library, ensuring consistent, practical, and compilable examples for all APIs.

## 🚨 CRITICAL REQUIREMENTS

### Documentation Standards
- **MANDATORY**: All JSDoc examples must compile via `pnpm docgen`
- **ZERO TOLERANCE**: Even pre-existing docgen errors must be fixed
- **FORBIDDEN**: Removing examples to fix compilation - always fix type issues properly
- **MANDATORY**: Use proper Effect patterns in all examples
- **FORBIDDEN**: `any` types, type assertions, or unsafe patterns in examples

## 📝 STANDARD JSDOC STRUCTURE

### Complete Function Documentation Template
```typescript
/**
 * Brief description of what the function does in one line.
 * 
 * More detailed explanation if needed, including:
 * - Important behavior notes
 * - Performance characteristics  
 * - Common use cases
 *
 * @example
 * ```ts
 * import { ModuleName, Effect } from "effect"
 *
 * // Clear description of what this example demonstrates
 * const example = ModuleName.functionName(params)
 *
 * // Usage in Effect context
 * const program = Effect.gen(function* () {
 *   const result = yield* example
 *   console.log(result) // Expected output
 *   return result
 * })
 * ```
 *
 * @example
 * ```ts  
 * import { ModuleName } from "effect"
 *
 * // Different use case or advanced usage
 * const advancedExample = ModuleName.functionName(
 *   complexParameters,
 *   withOptions
 * )
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
export const functionName = <A>(param: A): ModuleName<A> => 
  // implementation
```

### Module-Level Documentation
```typescript
/**
 * The `Array` module provides utility functions for working with arrays in TypeScript.
 * 
 * This module offers a comprehensive set of operations for creating, transforming,
 * and querying arrays while maintaining immutability and type safety.
 *
 * ## Key Features
 * 
 * - **Immutable operations**: All functions return new arrays without mutating the original
 * - **Type-safe**: Full TypeScript support with proper generic constraints
 * - **Pipeable**: All functions work seamlessly with Effect's pipe function
 * - **Performance optimized**: Efficient implementations for common operations
 *
 * @example
 * ```ts
 * import { Array, Effect } from "effect"
 *
 * // Creating and transforming arrays
 * const numbers = Array.range(1, 5) // [1, 2, 3, 4, 5]
 * const doubled = Array.map(numbers, x => x * 2) // [2, 4, 6, 8, 10]
 * 
 * // Functional composition with pipe
 * const result = [1, 2, 3, 4, 5].pipe(
 *   Array.filter(x => x % 2 === 0),
 *   Array.map(x => x * x),
 *   Array.reduce(0, (acc, x) => acc + x)
 * ) // 20
 * ```
 *
 * @since 2.0.0
 */
```

## 🔧 IMPORT PATTERN STANDARDS

### Core Effect Library Imports
```typescript
/**
 * @example
 * ```ts
 * import { Array, Effect, Console } from "effect"
 * 
 * const program = Effect.gen(function* () {
 *   const items = Array.make(1, 2, 3)
 *   yield* Console.log(`Items: ${Array.join(items, ", ")}`)
 *   return items
 * })
 * ```
 */
```

### Schema Module Imports (CRITICAL)
```typescript
/**
 * @example
 * ```ts
 * // ✅ CORRECT - Use lowercase 'schema'
 * import { Schema } from "effect/schema"
 * import { Effect } from "effect"
 * 
 * const PersonSchema = Schema.Struct({
 *   name: Schema.String,
 *   age: Schema.Number
 * })
 * 
 * const program = Effect.gen(function* () {
 *   const person = yield* Schema.decodeUnknownEffect(PersonSchema)({
 *     name: "Alice",
 *     age: 30
 *   })
 *   return person
 * })
 * ```
 */
```

### Mixed Usage Imports
```typescript
/**
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { Schema } from "effect/schema"
 * import { NodeHttpServer } from "@effect/platform-node"
 * 
 * const server = Effect.gen(function* () {
 *   const httpServer = yield* NodeHttpServer.make(app, { port: 3000 })
 *   yield* Effect.log("Server started on port 3000")
 *   return httpServer
 * })
 * ```
 */
```

## 🏗️ EXAMPLE CONTENT PATTERNS

### Constructor Examples
```typescript
/**
 * Creates a new Array from the provided elements.
 *
 * @example
 * ```ts
 * import { Array } from "effect"
 *
 * // Creating arrays with different types
 * const numbers = Array.make(1, 2, 3) // Array<number>
 * const strings = Array.make("a", "b", "c") // Array<string>
 * const mixed = Array.make(1, "hello", true) // Array<string | number | boolean>
 * 
 * console.log(numbers) // [1, 2, 3]
 * ```
 *
 * @example
 * ```ts
 * import { Array } from "effect"
 *
 * // Empty array creation
 * const empty = Array.empty<number>() // Array<number>
 * const fromIterable = Array.fromIterable(new Set([1, 2, 3])) // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
```

### Combinator Examples
```typescript
/**
 * Transforms each element of the array using the provided function.
 *
 * @example
 * ```ts
 * import { Array } from "effect"
 *
 * // Data-first usage
 * const numbers = [1, 2, 3, 4, 5]
 * const squared = Array.map(numbers, x => x * x)
 * console.log(squared) // [1, 4, 9, 16, 25]
 * ```
 *
 * @example
 * ```ts
 * import { Array } from "effect"
 *
 * // Data-last usage (pipeable)
 * const result = [1, 2, 3].pipe(
 *   Array.map(x => x * 2),
 *   Array.filter(x => x > 4),
 *   Array.reduce(0, (sum, x) => sum + x)
 * )
 * console.log(result) // 6
 * ```
 *
 * @since 2.0.0  
 * @category combinators
 */
```

### Effect Pattern Examples
```typescript
/**
 * Performs an effectful operation on each element of the array.
 *
 * @example
 * ```ts
 * import { Array, Effect, Console } from "effect"
 *
 * const logEachItem = (items: ReadonlyArray<string>) =>
 *   Array.forEach(items, item =>
 *     Console.log(`Processing: ${item}`)
 *   )
 *
 * const program = Effect.gen(function* () {
 *   const items = ["apple", "banana", "cherry"]
 *   yield* logEachItem(items)
 *   return "Done"
 * })
 * ```
 *
 * @since 2.0.0
 * @category combinators
 */
```

### Error Handling Examples
```typescript
/**
 * Validates array elements and fails fast on first error.
 *
 * @example
 * ```ts
 * import { Array, Effect, Data } from "effect"
 *
 * class ValidationError extends Data.TaggedError("ValidationError")<{
 *   value: unknown
 *   message: string
 * }> {}
 *
 * const validatePositive = (n: number) =>
 *   n > 0
 *     ? Effect.succeed(n)
 *     : Effect.fail(new ValidationError({ 
 *         value: n, 
 *         message: "Must be positive" 
 *       }))
 *
 * const program = Effect.gen(function* () {
 *   const numbers = [1, 2, -3, 4]
 *   const validated = yield* Array.validate(numbers, validatePositive)
 *   return validated
 * })
 * 
 * // This will fail with ValidationError for -3
 * ```
 *
 * @since 2.0.0
 * @category combinators
 */
```

## 🏷️ CATEGORY ANNOTATION PATTERNS

### Standard Categories Used
```typescript
// Creation functions
@category constructors

// Transformation functions  
@category combinators

// Helper utilities
@category utilities

// Boolean-returning functions
@category predicates

// Property access functions
@category getters

// Type definitions and interfaces
@category models

// Type identifiers and branded types
@category symbols

// Type guard functions
@category guards

// Type refinement functions
@category refinements

// Data transformation
@category mapping

// Data selection and filtering
@category filtering

// Data aggregation
@category folding

// Sequential operations
@category sequencing

// Error management
@category error handling

// Resource lifecycle
@category resource management

// Concurrent operations
@category concurrency

// Test utilities
@category testing

// Interoperability functions
@category interop
```

### Category Usage Examples
```typescript
/**
 * @category constructors
 */
export const make = ...

/**
 * @category combinators
 */
export const map = ...

/**
 * @category predicates  
 */
export const isEmpty = ...

/**
 * @category models
 */
export interface Array<A> ...

/**
 * @category symbols
 */
export const TypeId = ...
```

## 🧪 ADVANCED EXAMPLE PATTERNS

### Type-Level Function Examples
```typescript
/**
 * Type-level utility for extracting the success type from an Effect.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * // Demonstrate type extraction using conditional types
 * type UserEffect = Effect.Effect<{ name: string; age: number }, Error, never>
 * 
 * // Extract the success type
 * type User = Effect.Effect.Success<UserEffect>
 * // Result: { name: string; age: number }
 *
 * // Use in function signatures
 * const processUser = (user: User) => {
 *   console.log(`Processing ${user.name}, age ${user.age}`)
 * }
 * ```
 *
 * @since 2.0.0
 * @category type level
 */
```

### Advanced Usage Examples
```typescript
/**
 * Advanced function for performance-critical scenarios.
 *
 * @example
 * ```ts
 * import { Array } from "effect"
 *
 * // Note: This is an advanced function for specific performance use cases
 * // Most users should use simpler alternatives like:
 * const simpleSort = Array.sort(Order.number)
 * const simpleFilter = Array.filter(x => x > 0)
 *
 * // Advanced usage (when fine-grained control is needed):
 * const optimizedProcessing = Array.unsafePerformanceOperation(
 *   largeDataset,
 *   {
 *     batchSize: 1000,
 *     concurrency: 4
 *   }
 * )
 * ```
 *
 * @since 2.0.0
 * @category utilities
 */
```

### Complex Integration Examples
```typescript
/**
 * Integrates with multiple Effect modules for complex workflows.
 *
 * @example
 * ```ts
 * import { Effect, Schedule, Layer, Console } from "effect"
 * import { HttpClient } from "@effect/platform"
 * import { Schema } from "effect/schema"
 *
 * const UserSchema = Schema.Struct({
 *   id: Schema.Number,
 *   name: Schema.String,
 *   email: Schema.String
 * })
 *
 * const fetchUserWithRetry = (id: number) =>
 *   Effect.gen(function* () {
 *     const client = yield* HttpClient.HttpClient
 *     
 *     const response = yield* client.get(`/users/${id}`).pipe(
 *       Effect.retry(Schedule.exponential("100 millis", 2.0).pipe(
 *         Schedule.compose(Schedule.recurs(3))
 *       )),
 *       Effect.timeout("5 seconds")
 *     )
 *     
 *     const user = yield* Schema.decodeUnknownEffect(UserSchema)(response.json)
 *     yield* Console.log(`Fetched user: ${user.name}`)
 *     
 *     return user
 *   })
 *
 * // Usage with proper layer provision
 * const program = fetchUserWithRetry(123).pipe(
 *   Effect.provide(Layer.mergeAll(
 *     HttpClient.layer,
 *     Console.layer
 *   ))
 * )
 * ```
 *
 * @since 2.0.0
 * @category combinators
 */
```

## 🔍 COMMON DOCUMENTATION ISSUES TO AVOID

### ❌ Problematic Patterns
```typescript
// ❌ WRONG - Non-compiling imports
/**
 * @example
 * ```ts
 * import { Schema } from "@effect/schema"      // Wrong package
 * import { Schema } from "effect/Schema"       // Wrong casing
 * ```
 */

// ❌ WRONG - Using any types
/**
 * @example
 * ```ts
 * const data: any = someValue // Never use any in examples
 * ```
 */

// ❌ WRONG - Type assertions
/**
 * @example
 * ```ts
 * const value = something as unknown as SomeType // Avoid assertions
 * ```
 */

// ❌ WRONG - Declare patterns
/**
 * @example
 * ```ts
 * declare const Service: any // Don't use declare in examples
 * ```
 */
```

### ✅ Correct Patterns
```typescript
// ✅ CORRECT - Proper imports and types
/**
 * @example
 * ```ts
 * import { Schema } from "effect/schema"
 * import { Effect } from "effect"
 * 
 * const UserSchema = Schema.Struct({
 *   name: Schema.String,
 *   age: Schema.Number
 * })
 * 
 * const program = Effect.gen(function* () {
 *   const user = yield* Schema.decodeUnknownEffect(UserSchema)({
 *     name: "Alice",
 *     age: 30
 *   })
 *   return user
 * })
 * ```
 */

// ✅ CORRECT - Real service usage
/**
 * @example
 * ```ts
 * import { Effect, Layer } from "effect"
 * import { Console } from "effect/logging"
 * 
 * const program = Effect.gen(function* () {
 *   yield* Console.log("Hello, World!")
 *   return "Done"  
 * }).pipe(
 *   Effect.provide(Console.layer)
 * )
 * ```
 */
```

## 🎯 SUCCESS CRITERIA

### Quality JSDoc Checklist
- [ ] Brief, clear description of functionality
- [ ] At least one practical, working example
- [ ] Proper imports using correct module paths
- [ ] Examples compile with `pnpm docgen`
- [ ] No `any` types or type assertions
- [ ] Appropriate @category annotation
- [ ] @since version annotation
- [ ] Multiple examples for complex functions
- [ ] Integration examples for advanced use cases
- [ ] Real-world usage patterns demonstrated

This comprehensive JSDoc approach ensures that Effect library documentation provides practical, reliable examples that help developers understand and correctly use the APIs.
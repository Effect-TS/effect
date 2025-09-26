# Error Handling Patterns - Effect Library

## 🎯 OVERVIEW
Comprehensive error handling patterns used throughout the Effect library, emphasizing structured errors, type safety, and proper Effect composition.

## 🚨 CRITICAL FORBIDDEN PATTERNS

### ❌ NEVER: try-catch in Effect.gen
```typescript
// ❌ WRONG - This breaks Effect semantics
Effect.gen(function*() {
  try {
    const result = yield* someEffect
    return result
  } catch (error) {
    // This will never be reached!
    return yield* Effect.fail("error")
  }
})

// ✅ CORRECT - Use Effect's error handling
Effect.gen(function*() {
  const result = yield* Effect.result(someEffect)
  if (result._tag === "Failure") {
    // Handle error appropriately
    return yield* Effect.fail("handled error")
  }
  return result.value
})
```

### ✅ MANDATORY: return yield* Pattern
```typescript
// ✅ CORRECT - Always use return yield* for terminal effects
Effect.gen(function*() {
  if (invalidCondition) {
    return yield* Effect.fail("validation failed")
  }
  
  if (shouldInterrupt) {
    return yield* Effect.interrupt
  }
  
  // Continue with normal flow
  const result = yield* someOtherEffect
  return result
})
```

## 🏗️ STRUCTURED ERROR TYPES

### Data.TaggedError Pattern
The core pattern for creating structured, typed errors:

```typescript
import { Data } from "effect"

// Basic tagged error
class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string
  message: string
}> {}

// Network error with cause
class NetworkError extends Data.TaggedError("NetworkError")<{
  status: number
  url: string
  cause?: unknown
}> {
  // Custom message formatting
  override get message(): string {
    return `Network request failed: ${this.status} ${this.url}`
  }
}

// Platform error with context
class SystemError extends Data.TaggedError("SystemError")<{
  reason: SystemErrorReason
  module: string
  method: string
  pathOrDescriptor?: string | number
  cause?: unknown
}> {
  override get message(): string {
    return `${this.reason}: ${this.module}.${this.method}${
      this.pathOrDescriptor !== undefined ? ` (${this.pathOrDescriptor})` : ""
    }${this.cause ? `: ${this.cause}` : ""}`
  }
}
```

### Error Reason Classification
Standardized error reasons for consistency:

```typescript
// Platform errors
export type SystemErrorReason =
  | "AlreadyExists" | "BadResource" | "Busy" | "InvalidData"
  | "NotFound" | "PermissionDenied" | "TimedOut" | "UnexpectedEof"
  | "Unknown" | "WouldBlock" | "WriteZero"

// HTTP errors  
export type HttpErrorReason =
  | "BadRequest" | "Unauthorized" | "Forbidden" | "NotFound"
  | "InternalServerError" | "BadGateway" | "ServiceUnavailable"

// Validation errors
export type ValidationErrorReason =
  | "InvalidFormat" | "OutOfRange" | "Required" | "TooLong" | "TooShort"
```

### Error Hierarchies
```typescript
// Base error class
abstract class BaseError extends Data.TaggedError<string>()(
  class {
    abstract readonly _tag: string
    abstract readonly message: string
  }
) {}

// Specific error implementations
class ParseError extends BaseError<"ParseError">()<{
  input: string
  position: number
}> {
  readonly _tag = "ParseError"
  get message() {
    return `Parse error at position ${this.position}: ${this.input}`
  }
}

class ConfigError extends BaseError<"ConfigError">()<{
  key: string
  expectedType: string
}> {
  readonly _tag = "ConfigError"
  get message() {
    return `Configuration error for key '${this.key}': expected ${this.expectedType}`
  }
}
```

## 🔄 ERROR CREATION PATTERNS

### Effect.try Pattern
For operations that might throw:

```typescript
// Basic try pattern
const parseJson = (input: string) =>
  Effect.try({
    try: () => JSON.parse(input),
    catch: (error) => new ParseError({
      input,
      cause: error,
      message: `Failed to parse JSON: ${error}`
    })
  })

// With validation
const parsePositiveNumber = (input: string) =>
  Effect.try({
    try: () => {
      const num = Number(input)
      if (isNaN(num) || num <= 0) {
        throw new Error("Not a positive number")
      }
      return num
    },
    catch: (error) => new ValidationError({
      field: "input",
      message: String(error)
    })
  })
```

### Effect.tryPromise Pattern
For Promise-based operations:

```typescript
// Network request with structured errors
const fetchUser = (id: string) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`),
    catch: (error) => new NetworkError({
      status: 0,
      url: `/api/users/${id}`,
      cause: error
    })
  }).pipe(
    Effect.flatMap(response => 
      response.ok
        ? Effect.tryPromise({
            try: () => response.json(),
            catch: (error) => new ParseError({
              input: "response body",
              cause: error
            })
          })
        : Effect.fail(new NetworkError({
            status: response.status,
            url: response.url
          }))
    )
  )

// File operations
const readFile = (path: string) =>
  Effect.tryPromise({
    try: () => import("fs/promises").then(fs => fs.readFile(path, "utf8")),
    catch: (error: NodeJS.ErrnoException) => new SystemError({
      reason: mapErrnoToReason(error.code),
      module: "FileSystem",
      method: "readFile",
      pathOrDescriptor: path,
      cause: error
    })
  })
```

## 🔍 ERROR HANDLING COMBINATORS

### Effect.catchAll Pattern
Handle all errors uniformly:

```typescript
const robustOperation = (input: string) =>
  riskyOperation(input).pipe(
    Effect.catchAll(error => {
      // Log error for debugging
      Console.error(`Operation failed: ${error}`),
      
      // Provide fallback or re-throw
      Effect.succeed("fallback value")
    })
  )
```

### Effect.catchTag Pattern
Handle specific error types:

```typescript
const handleSpecificErrors = (input: string) =>
  complexOperation(input).pipe(
    Effect.catchTag("ValidationError", error => {
      // Handle validation errors specifically
      Console.log(`Validation failed for field: ${error.field}`)
      return Effect.succeed("default value")
    }),
    Effect.catchTag("NetworkError", error => {
      // Handle network errors with retry
      if (error.status >= 500) {
        return complexOperation(input).pipe(
          Effect.retry(Schedule.exponential("100 millis", 2.0))
        )
      }
      return Effect.fail(error)
    })
  )
```

### Effect.catchSome Pattern
Selectively handle certain errors:

```typescript
const handleRecoverableErrors = (input: string) =>
  operation(input).pipe(
    Effect.catchSome(error => {
      if (error._tag === "NetworkError" && error.status < 500) {
        // Only handle client errors, not server errors
        return Option.some(Effect.succeed("recovered"))
      }
      return Option.none()
    })
  )
```

## 🧪 ERROR TESTING PATTERNS

### Using Effect.exit for Testing
```typescript
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit } from "effect"

describe("error handling", () => {
  it.effect("should fail with specific error", () =>
    Effect.gen(function*() {
      const result = yield* Effect.exit(
        operation("invalid input")
      )
      
      if (result._tag === "Failure") {
        assert.isTrue(ValidationError.isValidationError(result.cause))
        const error = result.cause as ValidationError
        assert.strictEqual(error.field, "input")
      } else {
        assert.fail("Expected operation to fail")
      }
    }))
    
  it.effect("should handle errors with catchTag", () =>
    Effect.gen(function*() {
      let errorHandled = false
      
      const result = yield* operation("invalid").pipe(
        Effect.catchTag("ValidationError", error => {
          errorHandled = true
          return Effect.succeed("handled")
        })
      )
      
      assert.strictEqual(result, "handled")
      assert.isTrue(errorHandled)
    }))
})
```

### Testing Error Transformations
```typescript
it.effect("should transform errors correctly", () =>
  Effect.gen(function*() {
    const result = yield* Effect.exit(
      Effect.fail("string error").pipe(
        Effect.mapError(msg => new CustomError({ message: msg }))
      )
    )
    
    assert.isTrue(Exit.isFailure(result))
    if (Exit.isFailure(result)) {
      assert.isTrue(CustomError.isCustomError(result.cause))
    }
  }))
```

## 🔧 ERROR UTILITY PATTERNS

### Error Transformation Utilities
```typescript
// Convert platform errors to domain errors
const mapFileSystemError = (error: SystemError): DomainError => {
  switch (error.reason) {
    case "NotFound":
      return new ResourceNotFoundError({ resource: error.pathOrDescriptor })
    case "PermissionDenied":
      return new AccessDeniedError({ resource: error.pathOrDescriptor })
    default:
      return new UnknownError({ cause: error })
  }
}

// Error aggregation for multiple operations
const aggregateErrors = <E>(errors: ReadonlyArray<E>): E | AggregateError<E> => {
  if (errors.length === 1) {
    return errors[0]!
  }
  return new AggregateError({ errors })
}
```

### Error Logging Patterns
```typescript
const withErrorLogging = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> =>
  effect.pipe(
    Effect.tapError(error => 
      Console.error(`${name} failed:`, error)
    ),
    Effect.tapErrorCause(cause =>
      Console.error(`${name} cause:`, Cause.pretty(cause))
    )
  )
```

## 🎯 ERROR RECOVERY PATTERNS

### Retry with Exponential Backoff
```typescript
const withRetry = <A, E, R>(
  operation: Effect.Effect<A, E, R>,
  isRetryable: (error: E) => boolean = () => true
): Effect.Effect<A, E, R> =>
  operation.pipe(
    Effect.retry(
      Schedule.exponential("100 millis").pipe(
        Schedule.whileInput(isRetryable),
        Schedule.compose(Schedule.recurs(3))
      )
    )
  )
```

### Circuit Breaker Pattern
```typescript
const withCircuitBreaker = <A, E, R>(
  operation: Effect.Effect<A, E, R>,
  failureThreshold: number = 5,
  recoveryTime: Duration.Duration = Duration.seconds(30)
): Effect.Effect<A, E | CircuitBreakerError, R> =>
  // Implementation would use Ref for state management
  // and track failures/successes over time
  operation // Simplified for pattern illustration
```

### Fallback Chain Pattern
```typescript
const withFallbacks = <A, E, R>(
  primary: Effect.Effect<A, E, R>,
  fallbacks: ReadonlyArray<Effect.Effect<A, E, R>>
): Effect.Effect<A, E, R> =>
  fallbacks.reduce(
    (acc, fallback) => acc.pipe(Effect.orElse(() => fallback)),
    primary
  )
```

## 📝 SUCCESS CRITERIA

### Well-Handled Errors Checklist
- [ ] All errors use Data.TaggedError pattern
- [ ] Error types carry relevant context information
- [ ] Custom error messages are informative
- [ ] Error reasons are standardized and consistent
- [ ] No try-catch blocks in Effect.gen generators
- [ ] Always use return yield* for error termination
- [ ] Specific error handling with catchTag
- [ ] Proper error testing with Effect.exit
- [ ] Error recovery strategies implemented where appropriate
- [ ] Error logging provides debugging context

This structured approach to error handling ensures type safety, debugging clarity, and robust error recovery throughout Effect applications.
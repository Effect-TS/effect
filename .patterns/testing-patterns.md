# Testing Patterns - Effect Library

## 🎯 OVERVIEW
Comprehensive testing strategies for the Effect library using @effect/vitest, with emphasis on proper Effect patterns, TestClock usage, and type-safe testing approaches.

## 🚨 CRITICAL TESTING REQUIREMENTS

### Testing Framework Selection

#### ✅ Use @effect/vitest for Effect-based modules
```typescript
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"

// MANDATORY: Use it.effect for Effect-based tests
it.effect("should work with Effects", () =>
  Effect.gen(function*() {
    const result = yield* someEffect
    assert.strictEqual(result, expectedValue)
  }))
```

#### ✅ Use regular vitest for pure TypeScript functions
```typescript
import { describe, expect, it } from "vitest"

// For pure functions that don't return Effects
it("should work with pure functions", () => {
  const result = pureFunction(input)
  expect(result).toBe(expectedValue)
})
```

### ❌ FORBIDDEN PATTERNS

#### Never use Effect.runSync in tests
```typescript
// ❌ WRONG - Don't use Effect.runSync with regular it
import { describe, expect, it } from "vitest"

it("wrong pattern", () => {
  const result = Effect.runSync(Effect.gen(function*() {
    return yield* someEffect
  }))
  expect(result).toBe(value) // Wrong assertion method
})

// ✅ CORRECT - Use it.effect instead
import { assert, describe, it } from "@effect/vitest"

it.effect("correct pattern", () =>
  Effect.gen(function*() {
    const result = yield* someEffect
    assert.strictEqual(result, value) // Correct assertion method
  }))
```

#### Never use expect with it.effect
```typescript
// ❌ WRONG - Don't mix expect with it.effect
it.effect("wrong assertions", () =>
  Effect.gen(function*() {
    const result = yield* someEffect
    expect(result).toBe(value) // Wrong - should use assert
  }))

// ✅ CORRECT - Use assert methods
it.effect("correct assertions", () =>
  Effect.gen(function*() {
    const result = yield* someEffect
    assert.strictEqual(result, value)
  }))
```

## 🕐 TIME-DEPENDENT TESTING WITH TESTCLOCK

### ⚠️ CRITICAL: Always use TestClock for time-dependent operations
Any code that involves timing must use TestClock to avoid flaky tests:

```typescript
import { assert, describe, it } from "@effect/vitest"
import { Effect, TestClock, Duration } from "effect"

describe("time-dependent operations", () => {
  it.effect("should handle delays with TestClock", () =>
    Effect.gen(function*() {
      // Start operation that takes 5 seconds
      const fiber = yield* Effect.fork(
        Effect.gen(function*() {
          yield* Effect.sleep(Duration.seconds(5))
          return "completed"
        })
      )
      
      // Use TestClock to advance time instead of waiting
      yield* TestClock.advance(Duration.seconds(5))
      
      const result = yield* Effect.join(fiber)
      assert.strictEqual(result, "completed")
    }))
    
  it.effect("should test timeout behavior", () =>
    Effect.gen(function*() {
      const timeoutEffect = Effect.timeout(
        Effect.sleep(Duration.seconds(10)),
        Duration.seconds(5)
      )
      
      const fiber = yield* Effect.fork(timeoutEffect)
      
      // Advance time to trigger timeout
      yield* TestClock.advance(Duration.seconds(5))
      
      const result = yield* Effect.exit(Effect.join(fiber))
      assert.isTrue(result._tag === "Failure")
    }))
})
```

### Operations requiring TestClock:
- `Effect.sleep()` and `Effect.delay()`
- `Effect.timeout()` and `Effect.race()` with timeouts
- Scheduled operations and retry logic
- Queue operations with time-based completion
- Any concurrent operations dependent on timing

## 🧪 COMPREHENSIVE TESTING PATTERNS

### Basic Effect Testing Pattern
```typescript
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as MyModule from "../src/MyModule.js"

describe("MyModule", () => {
  describe("constructors", () => {
    it.effect("create should initialize with default values", () =>
      Effect.gen(function*() {
        const instance = yield* MyModule.create()
        
        assert.isTrue(MyModule.isInstance(instance))
        assert.strictEqual(MyModule.getValue(instance), 0)
      }))
      
    it.effect("create should accept custom configuration", () =>
      Effect.gen(function*() {
        const config = { initialValue: 42 }
        const instance = yield* MyModule.create(config)
        
        assert.strictEqual(MyModule.getValue(instance), 42)
      }))
  })
  
  describe("combinators", () => {
    it.effect("map should transform values", () =>
      Effect.gen(function*() {
        const instance = yield* MyModule.create({ initialValue: 10 })
        const transformed = yield* MyModule.map(instance, x => x * 2)
        
        assert.strictEqual(MyModule.getValue(transformed), 20)
      }))
  })
})
```

### Error Handling Testing Pattern
```typescript
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit } from "effect"
import * as MyModule from "../src/MyModule.js"

describe("error handling", () => {
  it.effect("should fail with validation error for negative values", () =>
    Effect.gen(function*() {
      const result = yield* Effect.exit(
        MyModule.create({ initialValue: -1 })
      )
      
      if (result._tag === "Failure") {
        assert.isTrue(MyModule.isValidationError(result.cause))
      } else {
        assert.fail("Expected operation to fail")
      }
    }))
    
  it.effect("should handle network errors gracefully", () =>
    Effect.gen(function*() {
      const mockNetworkFailure = Effect.fail(new MyModule.NetworkError({
        message: "Connection timeout"
      }))
      
      const result = yield* Effect.exit(
        MyModule.fetchWithRetry("https://api.example.com")
          .pipe(Effect.provide(Layer.succeed(NetworkService, {
            fetch: () => mockNetworkFailure
          })))
      )
      
      assert.isTrue(Exit.isFailure(result))
    }))
})
```

### Resource Management Testing Pattern
```typescript
import { assert, describe, it } from "@effect/vitest"
import { Effect, Ref } from "effect"
import * as ResourceModule from "../src/ResourceModule.js"

describe("resource management", () => {
  it.effect("should properly acquire and release resources", () =>
    Effect.gen(function*() {
      const acquired = yield* Ref.make(false)
      const released = yield* Ref.make(false)
      
      const mockResource = {
        acquire: Effect.sync(() => Ref.set(acquired, true)),
        use: (resource: unknown) => Effect.succeed("used"),
        release: Effect.sync(() => Ref.set(released, true))
      }
      
      const result = yield* ResourceModule.withResource(
        mockResource.acquire,
        mockResource.use,
        mockResource.release
      )
      
      assert.strictEqual(result, "used")
      assert.isTrue(yield* Ref.get(acquired))
      assert.isTrue(yield* Ref.get(released))
    }))
    
  it.effect("should release resources even on failure", () =>
    Effect.gen(function*() {
      const released = yield* Ref.make(false)
      
      const result = yield* Effect.exit(
        ResourceModule.withResource(
          Effect.succeed("resource"),
          () => Effect.fail("operation failed"),
          () => Ref.set(released, true)
        )
      )
      
      assert.isTrue(Exit.isFailure(result))
      assert.isTrue(yield* Ref.get(released))
    }))
})
```

### Concurrent Operations Testing Pattern
```typescript
import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, TestClock, Duration } from "effect"
import * as ConcurrentModule from "../src/ConcurrentModule.js"

describe("concurrent operations", () => {
  it.effect("should handle multiple concurrent operations", () =>
    Effect.gen(function*() {
      const operations = [
        ConcurrentModule.operation("A"),
        ConcurrentModule.operation("B"), 
        ConcurrentModule.operation("C")
      ]
      
      const results = yield* Effect.all(operations, { concurrency: "unbounded" })
      
      assert.strictEqual(results.length, 3)
      assert.includeMembers(results, ["A", "B", "C"])
    }))
    
  it.effect("should respect concurrency limits", () =>
    Effect.gen(function*() {
      const startTimes = yield* Ref.make<string[]>([])
      
      const timedOperation = (id: string) =>
        Effect.gen(function*() {
          yield* Ref.update(startTimes, arr => [...arr, id])
          yield* Effect.sleep(Duration.seconds(1))
          return id
        })
      
      const operations = ["A", "B", "C", "D"].map(timedOperation)
      
      const fiber = yield* Effect.fork(
        Effect.all(operations, { concurrency: 2 })
      )
      
      // Advance time and check concurrent execution
      yield* TestClock.advance(Duration.millis(500))
      const midResults = yield* Ref.get(startTimes)
      assert.strictEqual(midResults.length, 2) // Only 2 should start
      
      yield* TestClock.advance(Duration.seconds(1))
      const finalResults = yield* Effect.join(fiber)
      assert.strictEqual(finalResults.length, 4)
    }))
})
```

### Layer and Service Testing Pattern
```typescript
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer } from "effect"
import * as ServiceModule from "../src/ServiceModule.js"

// Test service interfaces
class TestDatabaseService extends Context.Tag("TestDatabaseService")<
  TestDatabaseService,
  {
    readonly query: (sql: string) => Effect.Effect<unknown[], never, never>
  }
>() {}

describe("service integration", () => {
  it.effect("should work with mock services", () =>
    Effect.gen(function*() {
      const mockData = [{ id: 1, name: "test" }]
      
      const result = yield* ServiceModule.findUser("1")
        .pipe(
          Effect.provide(
            Layer.succeed(TestDatabaseService, {
              query: (sql) => Effect.succeed(mockData)
            })
          )
        )
      
      assert.deepStrictEqual(result, mockData[0])
    }))
    
  it.effect("should handle service failures", () =>
    Effect.gen(function*() {
      const result = yield* Effect.exit(
        ServiceModule.findUser("1")
          .pipe(
            Effect.provide(
              Layer.succeed(TestDatabaseService, {
                query: () => Effect.fail("Database connection failed")
              })
            )
          )
      )
      
      assert.isTrue(Exit.isFailure(result))
    }))
})
```

## 🎯 ASSERTION PATTERNS

### Effect-specific Assertions
```typescript
// Use assert methods, not expect
assert.strictEqual(actual, expected)
assert.deepStrictEqual(actualObject, expectedObject)
assert.isTrue(condition)
assert.isFalse(condition)
assert.isNull(value)
assert.isUndefined(value)
assert.includeMembers(actualArray, expectedItems)

// For custom error types
assert.isTrue(MyModule.isCustomError(error))

// For Exit results
assert.isTrue(Exit.isSuccess(result))
assert.isTrue(Exit.isFailure(result))
```

### Testing Complex Data Structures
```typescript
it.effect("should handle complex data transformations", () =>
  Effect.gen(function*() {
    const input = {
      users: [
        { id: "1", name: "Alice", age: 30 },
        { id: "2", name: "Bob", age: 25 }
      ]
    }
    
    const result = yield* MyModule.processUsers(input)
    
    // Test structure
    assert.isTrue(Array.isArray(result.processedUsers))
    assert.strictEqual(result.processedUsers.length, 2)
    
    // Test individual items
    const alice = result.processedUsers.find(u => u.id === "1")
    assert.isDefined(alice)
    assert.strictEqual(alice?.name, "Alice")
    assert.strictEqual(alice?.processed, true)
  }))
```

## 🔧 TEST ORGANIZATION PATTERNS

### Group Related Tests
```typescript
describe("ModuleName", () => {
  describe("constructors", () => {
    // Tests for creation functions
  })
  
  describe("combinators", () => {
    // Tests for transformation functions
  })
  
  describe("predicates", () => {
    // Tests for boolean-returning functions
  })
  
  describe("error handling", () => {
    // Tests for error conditions
  })
  
  describe("integration", () => {
    // Tests for service integration
  })
})
```

### Progressive Test Complexity
```typescript
describe("feature progression", () => {
  it.effect("basic functionality", () => /* simple test */)
  
  it.effect("with configuration", () => /* configuration test */)
  
  it.effect("with error handling", () => /* error test */)
  
  it.effect("with concurrency", () => /* concurrent test */)
  
  it.effect("full integration", () => /* comprehensive test */)
})
```

This comprehensive testing approach ensures reliable, maintainable test suites that properly validate Effect-based code while avoiding common pitfalls and anti-patterns.
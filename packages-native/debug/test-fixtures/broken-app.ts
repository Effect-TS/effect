/**
 * Intentionally Broken Demo Application
 *
 * This code has several deliberate bugs for debugging practice:
 * 1. Off-by-one error in loop
 * 2. Incorrect calculation in fibonacci
 * 3. Closure capturing wrong value
 * 4. Missing null check
 * 5. Infinite recursion risk
 *
 * Run with: node --inspect-brk=9229 broken-app.ts
 * Then attach debugger and step through to find the bugs
 */

interface User {
  id: number
  name: string
  email: string
  metadata?: Record<string, unknown>
}

interface ProcessResult {
  processedCount: number
  errors: Array<string>
  results: Array<unknown>
}

/**
 * BUG #1: Off-by-one error
 * Should process items 0 to count-1, but processes 0 to count
 */
function processItems(items: Array<string>): ProcessResult {
  const results: Array<unknown> = []
  const errors: Array<string> = []
  let processedCount = 0

  // BUG: Should be i < items.length, not i <= items.length
  for (let i = 0; i <= items.length; i++) {
    try {
      const item = items[i]
      // This will be undefined on last iteration
      const processed = item.toUpperCase()
      results.push(processed)
      processedCount++
    } catch (error) {
      errors.push(`Error at index ${i}: ${error}`)
    }
  }

  return { processedCount, errors, results }
}

/**
 * BUG #2: Incorrect fibonacci calculation
 * Logic error: returns wrong values
 */
function fibonacci(n: number): number {
  if (n <= 1) return n

  // BUG: Should be n-1 and n-2, but using n-1 twice
  return fibonacci(n - 1) + fibonacci(n - 1)
  // Correct would be: fibonacci(n - 1) + fibonacci(n - 2)
}

/**
 * BUG #3: Closure captures wrong value
 * Classic loop closure bug
 */
function createCallbacks(): Array<() => number> {
  const callbacks: Array<() => number> = []

  // BUG: var instead of let/const causes all closures to capture same 'i'
  for (var i = 0; i < 5; i++) {
    callbacks.push(() => {
      // All closures capture the same 'i' (value after loop = 5)
      return i
    })
  }

  return callbacks
}

/**
 * BUG #4: Missing null check
 * Assumes metadata always exists
 */
function getUserMetadata(user: User, key: string): unknown {
  // BUG: No check if user.metadata exists
  // Will crash if user.metadata is undefined
  return user.metadata[key]
}

/**
 * BUG #5: Potential infinite recursion
 * Missing base case check
 */
function countDown(n: number): void {
  console.log(`Counting: ${n}`)

  // BUG: If n is negative, this recurses infinitely
  if (n === 0) {
    console.log("Done!")
    return
  }

  // Should check n > 0 before recursing
  countDown(n - 1)
}

/**
 * BUG #6: Array mutation during iteration
 * Modifies array while looping over it
 */
function deduplicateArray(arr: Array<number>): Array<number> {
  // BUG: Modifying array while iterating
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) {
        // Mutation during iteration causes skipped elements
        arr.splice(j, 1)
      }
    }
  }
  return arr
}

/**
 * BUG #7: Incorrect async timing
 * Race condition in promise handling
 */
async function fetchDataWithTimeout(url: string, timeoutMs: number): Promise<string> {
  let timeoutId: NodeJS.Timeout

  const fetchPromise = fetch(url).then((r) => r.text())

  const timeoutPromise = new Promise<string>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve("TIMEOUT")
    }, timeoutMs)
  })

  const result = await Promise.race([fetchPromise, timeoutPromise])

  // BUG: Timeout is never cleared if fetch wins the race
  // This leaves dangling timeout
  // Should be: if (timeoutId) clearTimeout(timeoutId)

  return result
}

/**
 * Main demo function that exercises all bugs
 */
async function main() {
  console.log("🐛 Starting Broken App Demo")
  console.log("This app has 7 intentional bugs for debugging practice")
  console.log("🔍 Waiting for debugger to attach and step through...\n")

  // Bug #1: Off-by-one error
  console.log("1️⃣  Testing processItems (off-by-one bug)...")
  const items = ["apple", "banana", "cherry"]
  const result1 = processItems(items)
  console.log("   Processed:", result1.processedCount, "items")
  console.log("   Errors:", result1.errors.length)
  if (result1.errors.length > 0) {
    console.log("   ❌ Found error:", result1.errors[0])
  }

  // Bug #2: Incorrect fibonacci
  console.log("\n2️⃣  Testing fibonacci (logic error)...")
  const fib5 = fibonacci(5)
  console.log("   fibonacci(5) =", fib5)
  console.log("   Expected: 5, Got:", fib5)
  if (fib5 !== 5) {
    console.log("   ❌ Incorrect result!")
  }

  // Bug #3: Closure bug
  console.log("\n3️⃣  Testing createCallbacks (closure bug)...")
  const callbacks = createCallbacks()
  const values = callbacks.map((cb) => cb())
  console.log("   Callback values:", values)
  console.log("   Expected: [0,1,2,3,4], Got:", values)
  if (values.every((v) => v === 5)) {
    console.log("   ❌ All closures captured same value!")
  }

  // Bug #4: Missing null check
  console.log("\n4️⃣  Testing getUserMetadata (null check missing)...")
  const userWithMeta: User = {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
    metadata: { role: "admin" }
  }
  const userWithoutMeta: User = {
    id: 2,
    name: "Bob",
    email: "bob@example.com"
    // metadata is undefined
  }

  try {
    const role1 = getUserMetadata(userWithMeta, "role")
    console.log("   User with metadata - role:", role1)

    const role2 = getUserMetadata(userWithoutMeta, "role")
    console.log("   User without metadata - role:", role2)
  } catch (error) {
    console.log("   ❌ Crashed:", error instanceof Error ? error.message : String(error))
  }

  // Bug #5: Infinite recursion (commented out to avoid crash)
  console.log("\n5️⃣  Testing countDown (infinite recursion risk)...")
  console.log("   Skipping countDown(-1) - would crash with stack overflow")
  console.log("   Try: countDown(3) - works fine")
  countDown(3)
  // countDown(-1)  // Uncomment to see infinite recursion

  // Bug #6: Array mutation during iteration
  console.log("\n6️⃣  Testing deduplicateArray (mutation during iteration)...")
  const duplicates = [1, 2, 2, 3, 3, 3, 4, 5, 5]
  const deduped = deduplicateArray([...duplicates])
  console.log("   Original:", duplicates)
  console.log("   Deduplicated:", deduped)
  console.log("   Expected: [1,2,3,4,5], Got:", deduped)
  if (deduped.length !== 5) {
    console.log("   ❌ Incorrect deduplication!")
  }

  // Bug #7: Timeout not cleared (creates memory leak over time)
  console.log("\n7️⃣  Testing fetchDataWithTimeout (timeout leak)...")
  console.log("   Note: Timeout is never cleared, causing memory leak")
  console.log("   Run with --expose-gc and monitor heap to see leak accumulate")

  console.log("\n✅ Initial demo complete!")
  console.log("🔁 Now looping forever for debugger to step through...")
  console.log("")

  // Infinite loop for debugger to step through
  let iteration = 0
  while (true) {
    iteration++

    // Slow down the loop so stepping is visible
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Exercise bugs repeatedly so debugger can step through them
    if (iteration % 10 === 1) {
      const result = processItems(["a", "b", "c"])
      console.log(`[${iteration}] processItems errors: ${result.errors.length}`)
    }
  }
}

// Run the demo
main().catch(console.error)

/**
 * Simple Broken Demo - CommonJS version
 *
 * Intentionally buggy code for debugger stepping practice.
 * Uses plain CommonJS to avoid V8 ESM debugger bugs.
 *
 * Run with: node --inspect-brk=9229 broken-simple.js
 */

console.log("🐛 Starting Simple Broken App")
console.log("This has intentional bugs for debugging\n")

// BUG #1: Off-by-one error
function processItems(items) {
  const results = []
  // BUG: Should be i < items.length, not i <= items.length
  for (let i = 0; i <= items.length; i++) {
    try {
      results.push(items[i].toUpperCase())
    } catch (error) {
      console.log("Error at index", i, ":", error.message)
    }
  }
  return results
}

// BUG #2: Wrong fibonacci
function fibonacci(n) {
  if (n <= 1) return n
  // BUG: Should be fibonacci(n-1) + fibonacci(n-2)
  return fibonacci(n - 1) + fibonacci(n - 1)
}

// BUG #3: Closure bug
function createCallbacks() {
  const callbacks = []
  // BUG: var instead of let
  for (var i = 0; i < 5; i++) {
    callbacks.push(function() {
      return i
    })
  }
  return callbacks
}

// BUG #4: Missing null check
function getUserRole(user) {
  // BUG: No check if user.metadata exists
  return user.metadata.role
}

// BUG #5: Wrong comparison
function findMax(numbers) {
  let max = 0
  // BUG: Doesn't handle negative numbers or empty array
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] > max) {
      max = numbers[i]
    }
  }
  return max
}

console.log("\n📝 Test 1: processItems (off-by-one)")
const result1 = processItems(["a", "b", "c"])
console.log("Result:", result1)

console.log("\n📝 Test 2: fibonacci (wrong calculation)")
const fib5 = fibonacci(5)
console.log("fibonacci(5) =", fib5, "(expected 5, got", fib5 + ")")

console.log("\n📝 Test 3: createCallbacks (closure bug)")
const callbacks = createCallbacks()
const values = callbacks.map((cb) => cb())
console.log("Values:", values, "(expected [0,1,2,3,4])")

console.log("\n📝 Test 4: getUserRole (null check missing)")
try {
  const role1 = getUserRole({ name: "Alice", metadata: { role: "admin" } })
  console.log("User with metadata:", role1)
  const role2 = getUserRole({ name: "Bob" })
  console.log("User without metadata:", role2)
} catch (error) {
  console.log("Error:", error.message)
}

console.log("\n📝 Test 5: findMax (negative numbers)")
const max1 = findMax([1, 5, 3, 9, 2])
console.log("Max of [1,5,3,9,2]:", max1)
const max2 = findMax([-5, -2, -10, -1])
console.log("Max of [-5,-2,-10,-1]:", max2, "(expected -1, got", max2 + ")")

console.log("\n✅ Tests complete\n")
console.log("🔁 Now looping forever for debugger to step through...")

// Infinite loop with visible iterations
let iteration = 0
setInterval(function() {
  iteration++

  if (iteration % 100 === 0) {
    console.log("[" + iteration + "] Still running...")
  }

  // Exercise bugs in loop
  if (iteration % 50 === 1) {
    const result = processItems(["x", "y"])
    const fib = fibonacci(3)
    const max = findMax([1, -2, 3])
  }
}, 10)

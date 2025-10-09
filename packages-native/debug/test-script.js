#!/usr/bin/env node

/**
 * Simple test script for debugging with debug-steps CLI
 */

console.log("🐛 Starting test script")

function add(a, b) {
  const result = a + b
  return result
}

function multiply(a, b) {
  const result = a * b
  return result
}

const x = 5
const y = 10

console.log("Computing sum...")
const sum = add(x, y)
console.log("Sum:", sum)

console.log("Computing product...")
const product = multiply(x, y)
console.log("Product:", product)

const items = ["apple", "banana", "cherry"]
console.log("Processing items...")

for (let i = 0; i < items.length; i++) {
  const item = items[i]
  console.log(`Item ${i}:`, item.toUpperCase())
}

console.log("✅ Test script completed")

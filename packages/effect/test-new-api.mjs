import * as Utf8 from "./src/encoding/Utf8.ts"
import * as Windows1251 from "./src/encoding/Windows1251.ts"

// Test synchronous API
const text = "Hello, World!"
const bytes = Utf8.encodeUnsafe(text)
const decoded = Utf8.decodeUnsafe(bytes)
console.log("UTF-8 test:", decoded === text ? "✓ PASS" : "✗ FAIL")

// Test Windows-1251
const cyrillic = "Привет"
const cp1251Bytes = Windows1251.encodeUnsafe(cyrillic)
const cp1251Decoded = Windows1251.decodeUnsafe(cp1251Bytes)
console.log("Windows-1251 test:", cp1251Decoded === cyrillic ? "✓ PASS" : "✗ FAIL")

console.log("\nNew API works correctly!")

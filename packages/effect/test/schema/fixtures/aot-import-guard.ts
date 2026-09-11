import assert from "node:assert/strict"
import { registerHooks } from "node:module"

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = nextResolve(specifier, context)
    assert.doesNotMatch(
      resolved.url,
      /\/(?:internal\/schema\/(?:codegen|jitCompiler)|unstable\/schema\/Schema(?:AOT|JIT)Compiler)(?:\.|\/)/,
      "Generated modules must not load source generation or the JIT compiler"
    )
    return resolved
  }
})

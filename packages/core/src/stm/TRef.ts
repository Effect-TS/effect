// codegen:start {preset: barrel, include: ./TRef/*.ts, exclude: ./TRef/Atomic.ts}
export * from "./TRef/definition"
export * from "./TRef/operations"
// codegen:end

export * as Atomic from "./TRef/Atomic"

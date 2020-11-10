/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/ZManaged.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

// codegen:start {preset: barrel, include: ./*.ts, exclude: ./deps.ts}
export * from "./core"
export * from "./do"
export * from "./fromEffect"
export * from "./managed"
export * from "./struct"
export * from "./succeed"
export * from "./tuple"
// codegen:end

// codegen:start { preset: barrel, include: ./methods/*.ts }
export * from "./methods/absolve"
export * from "./methods/absorb"
export * from "./methods/api"
export * from "./methods/ensuringFirst"
export * from "./methods/foldM_"
export * from "./methods/foldM"
export * from "./methods/fromEither"
export * from "./methods/gen"
export * from "./methods/halt"
export * from "./methods/releaseMap"
export * from "./methods/sandbox"
export * from "./methods/suspend"
export * from "./methods/switchable"
export * from "./methods/union"
// codegen:end

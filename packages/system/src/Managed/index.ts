// ets_tracing: off

import "../Operator/index.js"

/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/ZManaged.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

// codegen:start {preset: barrel, include: ./*.ts, exclude: ./deps*.ts}
export * from "./core.js"
export * from "./do.js"
export * from "./forEach.js"
export * from "./fork.js"
export * from "./fromEffect.js"
export * from "./makeExit.js"
export * from "./managed.js"
export * from "./struct.js"
export * from "./succeed.js"
export * from "./tuple.js"
export * from "./use.js"
// codegen:end

// codegen:start { preset: barrel, include: ./methods/*.ts }
export * from "./methods/absolve.js"
export * from "./methods/allocate.js"
export * from "./methods/api.js"
export * from "./methods/ensuringFirst.js"
export * from "./methods/environment.js"
export * from "./methods/foldM.js"
export * from "./methods/fromEither.js"
export * from "./methods/gen.js"
export * from "./methods/halt.js"
export * from "./methods/ifM.js"
export * from "./methods/iterate.js"
export * from "./methods/loop.js"
export * from "./methods/makeSucceedWith.js"
export * from "./methods/mapN.js"
export * from "./methods/preallocationScope.js"
export * from "./methods/releaseMap.js"
export * from "./methods/runtime.js"
export * from "./methods/suspend.js"
export * from "./methods/swap.js"
export * from "./methods/switchable.js"
export * from "./methods/union.js"
export * from "./methods/updateService.js"
// codegen:end

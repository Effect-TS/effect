// ets_tracing: off

import "../Operator"

// codegen:start {preset: barrel, include: ./*.ts}
export * from "./definition"
// codegen:end

// codegen:start {preset: barrel, include: ./operations/*.ts}
export * from "./operations/fold"
export * from "./operations/foldAll"
export * from "./operations/get"
export * from "./operations/getAndSet"
export * from "./operations/getAndUpdate"
export * from "./operations/getAndUpdateSome"
export * from "./operations/index"
export * from "./operations/make"
export * from "./operations/makeManaged"
export * from "./operations/modify"
export * from "./operations/modifySome"
export * from "./operations/set"
export * from "./operations/update"
export * from "./operations/updateAndGet"
export * from "./operations/updateSome"
export * from "./operations/updateSomeAndGet"
// codegen:end

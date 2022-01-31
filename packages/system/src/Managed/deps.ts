// ets_tracing: off

// minimize circularity by importing only a subset

export { forEach, forEachParN_, forEachPar_, forEach_ } from "../Effect/excl-forEach.js"
export { toManaged } from "../Effect/toManaged.js"
export * from "./deps-core.js"

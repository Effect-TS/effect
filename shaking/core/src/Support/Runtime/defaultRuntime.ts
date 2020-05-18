import { Runtime, RuntimeImpl } from "./runtime"

export const defaultRuntime: Runtime =
  /*#__PURE__*/
  (() => new RuntimeImpl())()

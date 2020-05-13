import type { Effect } from "../Support/Common"

export function cn<T extends Effect<any, any, any, any>>(): T {
  return {} as T
}

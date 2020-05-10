import type { Option } from "fp-ts/lib/Option"

export type AOfOptions<Ts extends Option<any>[]> = {
  [k in keyof Ts]: Ts[k] extends Option<infer A> ? A : never
}[number]

// Type-checked by scripts/check-dist-types.mjs against the built declarations
// with `skipLibCheck: false`.
import * as Hooks from "@effect/atom-solid/Hooks"
import * as RegistryContext from "@effect/atom-solid/RegistryContext"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import * as AtomRef from "effect/reactivity/AtomRef"
import type * as AtomRegistry from "effect/reactivity/AtomRegistry"
import type { Accessor, Context, Element } from "solid-js"

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false

const count = Atom.make(0)
const result = Atom.make(AsyncResult.success(1))

export const value: Accessor<number> = Hooks.useAtomValue(() => count)
export const [current, setCount] = Hooks.useAtom(() => count)
setCount((n) => n + 1)
Hooks.useAtomSubscribe(() => count, (n: number) => n)
export const ref: Accessor<string> = Hooks.useAtomRef(() => AtomRef.make("a"))
export const context: Context<AtomRegistry.AtomRegistry> = RegistryContext.RegistryContext

export const asyncResult: Accessor<AsyncResult.AsyncResult<number>> = Hooks.useAtomValue(() => result)

declare const children: Element
export const element: Element = RegistryContext.RegistryProvider({ children })
export const providerChildren: Equals<
  Parameters<typeof RegistryContext.RegistryProvider>[0]["children"],
  Element | undefined
> = true

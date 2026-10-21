import type * as Schema from "effect/Schema"

import type { ProofBinding } from "./models.ts"
import { makeProofModule } from "./module.ts"

type Options<Binding extends Schema.Codec<ProofBinding, unknown, unknown, unknown>> = Parameters<
  typeof makeProofModule<string, Binding>
>[1]

type NamespaceOf<Id> = Id extends string ? Id : "effect-auth/proofs"

const define = <
  Binding extends Schema.Codec<ProofBinding, unknown, unknown, unknown>,
  const Id extends string | undefined
>(
  namespace: Id,
  options: Options<Binding>
) =>
  // The required namespace argument preserves whether a default can be selected.
  makeProofModule((namespace ?? "effect-auth/proofs") as NamespaceOf<Id>, options)

export function make<
  Binding extends Schema.Codec<ProofBinding, unknown, unknown, unknown>,
  const Id extends string
>(options: Options<Binding> & { readonly namespace: Id }): ReturnType<typeof define<Binding, Id>>

export function make<
  Binding extends Schema.Codec<ProofBinding, unknown, unknown, unknown>,
  const Id extends string | undefined = undefined
>(
  options: Options<Binding> & { readonly namespace?: Id }
): ReturnType<typeof define<Binding, Id | undefined>>

export function make<
  Binding extends Schema.Codec<ProofBinding, unknown, unknown, unknown>,
  const Id extends string | undefined
>(options: Options<Binding> & { readonly namespace?: Id }) {
  return define(options.namespace, options)
}

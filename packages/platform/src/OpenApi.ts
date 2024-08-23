/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import { dual } from "effect/Function"
import type { ApiSecurity } from "./ApiSecurity.js"

/**
 * @since 1.0.0
 * @category annotations
 */
export class Title extends Context.Tag("@effect/platform/OpenApi/Title")<Title, string>() {
}

/**
 * @since 1.0.0
 * @category annotations
 */
export class Description extends Context.Tag("@effect/platform/OpenApi/Description")<Description, string>() {}

/**
 * @since 1.0.0
 * @category annotations
 */
export class Security extends Context.Tag("@effect/platform/OpenApi/Security")<Security, ApiSecurity>() {}

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotations = (annotations: {
  readonly title?: string | undefined
  readonly description?: string | undefined
  readonly security?: ApiSecurity | undefined
}): Context.Context<never> => {
  let context = Context.empty()
  if (annotations.title !== undefined) {
    context = Context.add(context, Title, annotations.title)
  }
  if (annotations.description !== undefined) {
    context = Context.add(context, Description, annotations.description)
  }
  if (annotations.security !== undefined) {
    context = Context.add(context, Security, annotations.security)
  }
  return context
}

/**
 * @since 1.0.0
 * @category annotations
 */
export interface Annotatable {
  readonly annotations: Context.Context<never>
}

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotate: {
  (annotations: {
    readonly title?: string | undefined
    readonly description?: string | undefined
    readonly security?: ApiSecurity | undefined
  }): <A extends Annotatable>(self: A) => A
  <A extends Annotatable>(self: A, annotations: {
    readonly title?: string | undefined
    readonly description?: string | undefined
    readonly security?: ApiSecurity | undefined
  }): A
} = dual(2, <A extends Annotatable>(self: A, annotations_: {
  readonly title?: string | undefined
  readonly description?: string | undefined
  readonly security?: ApiSecurity | undefined
}): A => {
  const context = Context.merge(
    self.annotations,
    annotations(annotations_)
  )
  return Object.assign(Object.create(Object.getPrototypeOf(self)), self, {
    annotations: context
  })
})

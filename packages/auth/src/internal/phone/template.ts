import * as Context from "effect/Context"
import * as Layer from "effect/Layer"

export interface PhoneTemplate {
  readonly render: (
    code: string,
    context: { readonly locale: string; readonly expiresAtMillis: number }
  ) => string
}

/** Optional private SMS rendering. The result stays redacted until transport. */
export class Template extends Context.Reference<PhoneTemplate>("@effect/auth/phone/Template", {
  defaultValue: (): PhoneTemplate => ({ render: (code) => `Your sign-in code is ${code}.` })
}) {
  static readonly layer = (template: PhoneTemplate) => Layer.succeed(Template, template)
}

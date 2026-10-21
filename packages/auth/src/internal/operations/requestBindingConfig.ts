import * as Context from "effect/Context"
import * as Layer from "effect/Layer"

import type { RequestBindingConfiguration } from "./requestBinding.ts"

/** Dedicated request-binding keys, shared by the selected authentication methods. */
export class RequestBindingConfig extends Context.Service<
  RequestBindingConfig,
  RequestBindingConfiguration
>()("@effect/auth/RequestBindingConfig") {
  static readonly layer = (configuration: RequestBindingConfiguration) => Layer.succeed(this, configuration)
}

/**
 * @since 1.0.0
 */
import type * as Client from "@effect/platform/Http/Client"
import type { RpcResolver } from "@effect/rpc/Resolver"
import * as internal from "./internal/resolver.js"

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: (client: Client.Client.Default) => RpcResolver<never> = internal.make

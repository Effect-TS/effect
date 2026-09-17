import * as DenoMulticast from "@effect/platform-deno/DenoMulticast"
import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import { suite } from "../../../effect/test/unstable/socket/MulticastTest.ts"

suite("DenoMulticast", DenoMulticast.layer)

it.effect("rejects IPv6 instead of silently applying IPv4 hop limits", () =>
  Effect.gen(function*() {
    const error = yield* DenoMulticast.bind({
      localAddress: NetAddress.inetAddressFromIpStringUnsafe("::", 0)
    }).pipe(Effect.flip)
    assert.strictEqual(error.reason._tag, "DatagramSocketOpenError")
    assert.instanceOf(error.cause, Error)
    assert.include((error.cause as Error).message, "IPv6 multicast hop limits")
  }))

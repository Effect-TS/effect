import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Cause from "effect/Cause"
import * as CliError from "effect/cli/CliError"
import * as Command from "effect/cli/Command"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { cli } from "./providers.ts"

Command.run(cli, { version: "0.0.0" }).pipe(
  Effect.provide([NodeServices.layer, NodeHttpClient.layerFetch, NodeCrypto.layerDigest]),
  Effect.onError((cause) => {
    if (cause.reasons.some(Cause.isDieReason)) return Console.error(Cause.pretty(cause))
    return Effect.forEach(cause.reasons, (reason) =>
      Cause.isFailReason(reason) && !CliError.isCliError(reason.error)
        ? Console.error(reason.error.message)
        : Effect.void, { discard: true })
  }),
  NodeRuntime.runMain({ disableErrorReporting: true })
)

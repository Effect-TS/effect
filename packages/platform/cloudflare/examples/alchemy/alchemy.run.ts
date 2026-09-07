/**
 * The Alchemy stack for `worker.ts`. Run `alchemy deploy` (or `alchemy dev`)
 * with Cloudflare credentials configured.
 */
import * as Alchemy from "alchemy"
import * as Cloudflare from "alchemy/Cloudflare"
import * as Effect from "effect/Effect"
import App from "./worker.ts"

export default Alchemy.Stack(
  "EffectCluster",
  { providers: Cloudflare.providers(), state: Cloudflare.state() },
  Effect.gen(function*() {
    const app = yield* App
    return { url: app.url }
  })
)

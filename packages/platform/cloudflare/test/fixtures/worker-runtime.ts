import * as CloudflareWorker from "@effect/platform-cloudflare/CloudflareWorker"
import { Effect, Layer } from "effect"
import { Sharding } from "effect/unstable/cluster"

export {
  ClusterDurableQueue,
  ClusterEntity,
  ClusterSingleton,
  ClusterWorkflow
} from "@effect/platform-cloudflare/CloudflareDurableObjects"

const runtime = CloudflareWorker.makeRuntime({
  entities: [],
  layer: Layer.effectDiscard(Effect.asVoid(Sharding.Sharding))
})

export default {
  fetch(_request: Request, env: CloudflareWorker.Bindings) {
    return runtime.run(env, Effect.as(Sharding.Sharding, "ready")).then((status) => Response.json({ status }))
  },
  scheduled: runtime.scheduled
}

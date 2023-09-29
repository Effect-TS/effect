import viteLogo from "/vite.svg"
import * as Client from "@effect/rpc-webworkers/Client"
import * as Resolver from "@effect/rpc-webworkers/Resolver"
import * as Chunk from "effect/Chunk"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Pool from "effect/Pool"
import { schema } from "./schema"
import typescriptLogo from "./typescript.svg"
import RpcWorker from "./worker?worker"
import "./style.css"

// Create the worker pool layer
const PoolLive = Resolver.makePoolLayer((spawn) =>
  Pool.make({
    acquire: spawn((id) => {
      console.log("Spawning worker", id)
      return new RpcWorker()
    }, 3),
    size: navigator.hardwareConcurrency
  })
)
// Create the resolver layer
const ResolverLive = Layer.provide(PoolLive, Resolver.RpcWorkerResolverLive)

// Example for using shared workers
export const SharedPoolLive = Resolver.makePoolLayer((spawn) =>
  Pool.make({
    acquire: spawn((id) => {
      console.log("Spawning shared worker", id)
      return new SharedWorker(new URL("./worker.ts", import.meta.url), {
        /* @vite-ignore */
        name: `worker-${id}`,
        type: "module"
      })
    }, 3),
    size: navigator.hardwareConcurrency
  })
)

const client = Client.make(schema)

// Send off 50 requests to the worker pool
pipe(
  Effect.all(
    Chunk.map(Chunk.range(1, 50), () => client.getBinary(new Uint8Array([1, 2, 3]))),
    { concurrency: "unbounded" }
  ),
  Effect.tap((_) => Effect.sync(() => console.log(_))),
  Effect.zipLeft(
    Effect.catchAll(client.crash, (e) => Effect.sync(() => console.log(e)))
  ),
  // Sleep so you can see the spawned workers in dev tools
  Effect.zipLeft(Effect.sleep(Duration.seconds(120))),
  Effect.provide(ResolverLive),
  Effect.runFork
)

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>@effect/rpc-webworkers example</h1>
    <p class="read-the-docs">
      Check the console for the result of the RPC call.
    </p>
  </div>
`

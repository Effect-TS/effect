import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Duration from "@effect/data/Duration"
import * as Client from "@effect/rpc-webworkers/Client"
import * as Resolver from "@effect/rpc-webworkers/Resolver"
import * as Chunk from "@effect/data/Chunk"
import { schema } from "./schema"
import typescriptLogo from "./typescript.svg"
import RpcWorker from "./worker?worker"
import viteLogo from "/vite.svg"
import "./style.css"

let count = 1

const ResolverLive = Resolver.makeLayer(
  () => {
    console.log("Spawning worker", count++)
    return new RpcWorker()
  },
  {
    // Set this to the number of requets per worker you want to handle
    workerPermits: 3,
  },
)

const client = Client.make(schema)

// Send off 50 requests to the worker pool
pipe(
  Chunk.map(Chunk.range(1, 50), () =>
    client.getBinary(new Uint8Array([1, 2, 3])),
  ),
  Effect.allPar,
  Effect.tap((_) => Effect.sync(() => console.log(_))),
  // Sleep so you can see the spawned workers in dev tools
  Effect.zipLeft(Effect.sleep(Duration.seconds(120))),
  Effect.provideLayer(ResolverLive),
  Effect.runFork,
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

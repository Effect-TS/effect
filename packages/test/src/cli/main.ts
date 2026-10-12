// The etest CLI. Runs on Node, Bun or Deno: the platform is picked from the runtime we are on.
import * as Command from "effect/cli/Command"
import PackageJson from "../../package.json" with { type: "json" }
import { cli } from "./Cli.ts"
import { makePlatforms } from "./Platform.ts"

const platforms = makePlatforms({
  node: () => import("./platform/node.ts"),
  bun: () => import("./platform/bun.ts"),
  deno: () => import("./platform/deno.ts")
})

platforms.run(Command.run(cli, { version: PackageJson.version }))

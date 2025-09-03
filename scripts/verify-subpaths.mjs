/* eslint-env node */
/* global console, process */
import { spawn } from "node:child_process"

const pkgs = [
  "packages-native/libcrsql",
  "packages-native/libsqlite"
]

function run(cmd, args, cwd) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd, stdio: "inherit", shell: false })
    p.on("exit", (code) => (code === 0 ? res() : rej(new Error(`${cmd} ${args.join(" ")} exited ${code}`))))
  })
}

async function main() {
  for (const dir of pkgs) {
    // Build first (idempotent)
    await run("pnpm", ["build"], dir)

    // Verify from package root
    await run("node", ["scripts/verify-exports.mjs"], dir)

    // Optionally we could also simulate from publish dir, but the script
    // isn't copied into dist/ (publishConfig.directory) so we verify from root.
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

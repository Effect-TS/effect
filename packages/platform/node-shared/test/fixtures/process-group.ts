import { spawn } from "node:child_process"
import { appendFileSync, writeFileSync } from "node:fs"

// Usage: node process-group.ts leader <exit-on-signal|ignore-signal> <marker>
//
// The leader spawns a descendant in its own process group with inherited
// stdio and keeps the default SIGTERM disposition, so a group signal kills the
// leader immediately while the descendant is still alive.
//
// exit-on-signal: the descendant writes <marker> 200ms after SIGTERM, then exits.
// ignore-signal: the descendant ignores SIGTERM and appends a heartbeat to
// <marker> every 10ms until it is killed. The first heartbeat lands before
// READY so the file always exists.
//
// The descendant prints READY once its signal handler is installed and exits
// on its own after 5 seconds as a safety net.
const [role, mode, marker] = process.argv.slice(2)

if (role === "leader") {
  spawn(process.execPath, [process.argv[1], "descendant", mode, marker], {
    stdio: ["ignore", "inherit", "inherit"]
  })
  setInterval(() => {}, 1_000)
} else {
  if (mode === "exit-on-signal") {
    process.on("SIGTERM", () => {
      setTimeout(() => {
        writeFileSync(marker, "exited")
        process.exit(0)
      }, 200)
    })
  } else {
    process.on("SIGTERM", () => {})
    appendFileSync(marker, "x")
    setInterval(() => appendFileSync(marker, "x"), 10)
  }
  setTimeout(() => process.exit(1), 5_000)
  process.stdout.write("READY\n")
}

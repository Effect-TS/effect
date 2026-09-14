import { Deferred, Effect } from "effect"
import * as Net from "node:net"
import { Duplex } from "node:stream"

// Hold one real ParameterDescription cycle before the driver can bind. With
// Sync, wait for ReadyForQuery so lock observations cannot race the commit;
// with Flush, the completed description is the analysis boundary.
export const makeDescriptionGate = (sql: string, address: Net.NetConnectOpts) => {
  const analyzed = Deferred.makeUnsafe<void>()
  const statements = new Map<string, string>()
  let connectionOpened = false
  let startup = true
  let armed = true
  let holding = false
  let syncSent = false
  let described = false
  let portalSql = ""
  let executions = 0
  let buffered = Buffer.alloc(0)
  let held: Array<Buffer> = []
  let transport: Duplex | undefined

  return {
    analyzed,
    get executions() {
      return executions
    },
    arm() {
      armed = true
      syncSent = false
      described = false
    },
    release() {
      armed = false
      holding = false
      if (held.length > 0) transport!.push(Buffer.concat(held))
      held = []
    },
    stream(): Duplex {
      const backend = Net.createConnection(address)
      // CancelRequest uses a separate connection with no StartupMessage.
      if (connectionOpened) return backend
      connectionOpened = true
      const socket: Duplex = new Duplex({
        read() {
          backend.resume()
        },
        write(chunk: Buffer, _encoding, callback) {
          if (startup) {
            startup = false
          } else {
            // PgConnection writes complete protocol frames, possibly batched.
            for (let offset = 0; offset < chunk.length; offset += 1 + chunk.readInt32BE(offset + 1)) {
              const tag = String.fromCharCode(chunk[offset])
              const payload = chunk.subarray(offset + 5, offset + 1 + chunk.readInt32BE(offset + 1))
              if (tag === "P") {
                const nameEnd = payload.indexOf(0)
                const queryEnd = payload.indexOf(0, nameEnd + 1)
                statements.set(
                  payload.subarray(0, nameEnd).toString(),
                  payload.subarray(nameEnd + 1, queryEnd).toString()
                )
              } else if (tag === "D" && payload[0] === 0x53 && armed) {
                if (statements.get(payload.subarray(1, -1).toString()) === sql) holding = true
              } else if (tag === "S" && holding) {
                syncSent = true
              } else if (tag === "B") {
                const portalEnd = payload.indexOf(0)
                const nameEnd = payload.indexOf(0, portalEnd + 1)
                portalSql = statements.get(payload.subarray(portalEnd + 1, nameEnd).toString()) ?? ""
              } else if (tag === "E" && portalSql === sql) {
                executions++
              }
            }
          }
          backend.write(chunk, callback)
        },
        final(callback) {
          backend.end(callback)
        },
        destroy(error, callback) {
          backend.destroy()
          callback(error)
        }
      })
      transport = socket
      backend.on("data", (chunk: Buffer) => {
        buffered = Buffer.concat([buffered, chunk])
        while (buffered.length >= 5) {
          const length = 1 + buffered.readInt32BE(1)
          if (buffered.length < length) break
          const frame = buffered.subarray(0, length)
          buffered = buffered.subarray(length)
          if (holding) {
            held.push(frame)
            const tag = String.fromCharCode(frame[0])
            if (tag === "t") described = true
            if (described && (syncSent ? tag === "Z" : tag === "n" || tag === "T")) {
              Deferred.doneUnsafe(analyzed, Effect.void)
            }
          } else if (!socket.push(frame)) {
            backend.pause()
          }
        }
      })
      backend.on("error", (error) => socket.destroy(error))
      backend.on("end", () => socket.push(null))
      backend.on("close", () => socket.destroy())
      return socket
    }
  }
}

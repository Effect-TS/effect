import { serve } from "@hono/node-server"
import { Hono } from "hono"
import {
  HOST,
  installServerMetrics,
  isDocumentId,
  isWritePayload,
  parseServerEnvironment,
  readDocument,
  writeDocument
} from "./shared.ts"

const { port, root } = parseServerEnvironment()
installServerMetrics()

const app = new Hono()

app.get("/documents/:id", async (context) => {
  const id = context.req.param("id")
  if (!isDocumentId(id)) {
    return context.json({ error: "invalid document id" }, 400)
  }
  return context.json(await readDocument(root, id))
})

app.put("/documents/:id", async (context) => {
  const id = context.req.param("id")
  if (!isDocumentId(id)) {
    return context.json({ error: "invalid document id" }, 400)
  }

  let payload: unknown
  try {
    payload = await context.req.json()
  } catch {
    return context.json({ error: "invalid JSON payload" }, 400)
  }
  if (!isWritePayload(payload)) {
    return context.json({ error: "invalid document payload" }, 400)
  }

  return context.json(await writeDocument(root, id, payload.content))
})

const server = serve({ fetch: app.fetch, hostname: HOST, port })

const shutdown = () => {
  server.close(() => process.exit(0))
}
process.once("SIGINT", shutdown)
process.once("SIGTERM", shutdown)

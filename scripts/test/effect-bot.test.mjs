import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { test } from "node:test"

// Intentionally absent until the implementation run; each test reports its failure.
const loadRelay = async () => (await import("../effect-bot.mjs")).relayComment
const command = "/effect-bot investigate"
const event = (overrides = {}) => ({
  action: "created",
  repository: { full_name: "Effect-TS/effect" },
  issue: { number: 42 },
  comment: {
    id: 123,
    html_url: "https://github.com/Effect-TS/effect/issues/42#issuecomment-123",
    body: command,
    user: { login: "maintainer" }
  },
  ...overrides
})

function harness(overrides = {}) {
  const calls = []
  const options = {
    eventName: "issue_comment",
    event: event(),
    githubToken: "test-token",
    webhookUrl: "https://relay.invalid/webhook",
    secret: "test-secret",
    // Policy seams, not proposed production command/key algorithms.
    isCommand: (body) => body === command,
    deliveryKey: () => "test-policy-key",
    ...overrides
  }
  options.fetch = async (input, init = {}) => {
    const url = String(input)
    calls.push({ url, ...init })
    if (url.endsWith("/collaborators/maintainer/permission")) {
      if (overrides.permissionError) return new Response("unavailable", { status: 503 })
      return Response.json({ role_name: overrides.role ?? "maintain", permission: "admin" })
    }
    if (url === options.webhookUrl) {
      if (overrides.webhookError) return new Response("unavailable", { status: 503 })
      return Response.json(overrides.response ?? { status: "accepted", run_id: "run-1" })
    }
    if (url.endsWith("/reactions")) {
      if (overrides.reactionError) return new Response("unavailable", { status: 503 })
      return Response.json({ id: 1 }, { status: 201 })
    }
    throw new Error("Unexpected request: " + url)
  }
  return { options, calls, posts: () => calls.filter((call) => call.url === options.webhookUrl) }
}

test("non-command, edited and missing-action events never reach the network", async () => {
  const relay = await loadRelay()
  for (const input of [
    event({ comment: { ...event().comment, body: "ordinary comment" } }),
    event({ action: "edited" }),
    event({ action: undefined })
  ]) {
    const h = harness({ event: input })
    await relay(h.options)
    assert.deepEqual(h.calls, [])
  }
})

test("admin and maintain are admitted using role_name", async () => {
  const relay = await loadRelay()
  for (const role of ["admin", "maintain"]) {
    const h = harness({ role })
    assert.equal((await relay(h.options)).status, "accepted")
    assert.equal(h.posts().length, 1)
    assert.equal(h.calls[0].url, "https://api.github.com/repos/Effect-TS/effect/collaborators/maintainer/permission")
  }
})

test("ordinary non-maintainer roles fail closed despite permission/association hints", async () => {
  const relay = await loadRelay()
  for (const role of ["read", "triage", "write", "none"]) {
    const input = event()
    input.comment.author_association = "OWNER"
    const h = harness({ role, event: input })
    await relay(h.options)
    assert.equal(h.calls.length, 1)
    assert.equal(h.posts().length, 0)
  }
})

test("permission lookup failure never posts or reacts", async () => {
  const relay = await loadRelay()
  const h = harness({ permissionError: true })
  await assert.rejects(() => relay(h.options))
  assert.equal(h.calls.length, 1)
})

test("missing webhook URL or signing secret fails before any network request", async () => {
  const relay = await loadRelay()
  for (const config of [{ secret: "" }, { webhookUrl: "" }]) {
    const h = harness(config)
    await assert.rejects(() => relay(h.options))
    assert.deepEqual(h.calls, [])
  }
})

test("payload preserves untrusted text as data and signs exact outgoing bytes", async () => {
  const relay = await loadRelay()
  const body = "/effect-bot $(touch NEVER) `echo nope` \"\n雪\n${{ secrets.TEST }}"
  const input = event()
  input.comment.body = body
  input.repository.private_data = "omit me"
  const h = harness({ event: input, isCommand: () => true })
  await relay(h.options)
  const post = h.posts()[0]
  assert.equal(post.method, "POST")
  assert.equal(typeof post.body, "string")
  assert.deepEqual(JSON.parse(post.body), {
    action: "created",
    repo: "Effect-TS/effect",
    number: 42,
    isPullRequest: false,
    commentId: 123,
    commentUrl: input.comment.html_url,
    body,
    author: "maintainer"
  })
  const headers = new Headers(post.headers)
  assert.equal(headers.get("X-GitHub-Event"), "issue_comment")
  assert.equal(headers.get("X-GitHub-Delivery"), "test-policy-key")
  assert.equal(headers.get("Content-Type"), "application/json")
  assert.equal(headers.get("X-Hub-Signature-256"),
    "sha256=" + createHmac("sha256", h.options.secret).update(post.body).digest("hex"))
})

test("PR conversation and same-repository review payloads preserve context", async () => {
  const relay = await loadRelay()
  const conversation = harness({ event: event({ issue: { number: 42, pull_request: {} } }) })
  await relay(conversation.options)
  assert.equal(JSON.parse(conversation.posts()[0].body).isPullRequest, true)
  const input = event({
    issue: undefined,
    pull_request: { number: 42, head: { repo: { full_name: "Effect-TS/effect" } } },
    comment: { ...event().comment, path: "src/example.ts", line: 7 }
  })
  const review = harness({ eventName: "pull_request_review_comment", event: input })
  await relay(review.options)
  const post = review.posts()[0]
  const payload = JSON.parse(post.body)
  assert.equal(payload.action, "created")
  assert.equal(payload.number, 42)
  assert.equal(payload.isPullRequest, true)
  assert.equal(payload.path, "src/example.ts")
  assert.equal(payload.line, 7)
  assert.equal(new Headers(post.headers).get("X-GitHub-Event"), "pull_request_review_comment")
  assert.equal(review.calls.at(-1).url, "https://api.github.com/repos/Effect-TS/effect/pulls/comments/123/reactions")
})

test("reruns forward the same injected key, not workflow attempt IDs", async () => {
  const relay = await loadRelay()
  const keys = []
  for (const attempt of [1, 2]) {
    const h = harness({ event: event({ workflow_run_id: attempt, workflow_run_attempt: attempt }) })
    await relay(h.options)
    keys.push(new Headers(h.posts()[0].headers).get("X-GitHub-Delivery"))
  }
  assert.deepEqual(keys, ["test-policy-key", "test-policy-key"])
})

test("only admitted runs get eyes; HTTP 200 alone is not admission", async () => {
  const relay = await loadRelay()
  for (const [response, reactionCount] of [
    [{ status: "accepted", run_id: "run-1" }, 1],
    [{ status: "duplicate", run_id: "run-1" }, 1],
    [{ status: "duplicate" }, 0],
    [{ status: "ignored" }, 0],
    [{ status: "skipped", run_id: "run-1" }, 0]
  ]) {
    const h = harness({ response })
    assert.equal((await relay(h.options)).status, response.status)
    const reactions = h.calls.filter((call) => call.url.endsWith("/reactions"))
    assert.equal(reactions.length, reactionCount)
    if (reactionCount) {
      assert.equal(h.calls.at(-1), reactions[0])
      assert.equal(reactions[0].url, "https://api.github.com/repos/Effect-TS/effect/issues/comments/123/reactions")
      assert.equal(reactions[0].method, "POST")
      assert.deepEqual(JSON.parse(reactions[0].body), { content: "eyes" })
    }
  }
})

test("webhook failure never reacts; reaction failure never retries delivery", async () => {
  const relay = await loadRelay()
  const failed = harness({ webhookError: true })
  await assert.rejects(() => relay(failed.options))
  assert.equal(failed.calls.length, 2)
  const admitted = harness({ reactionError: true })
  assert.equal((await relay(admitted.options)).status, "accepted")
  assert.equal(admitted.posts().length, 1)
})

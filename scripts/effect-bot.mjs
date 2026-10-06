import { createHmac } from "node:crypto"
import { readFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"

// Provisional v1 policies; see .github/effect-bot.md before enabling the relay.
export const isCommand = (body) => /^\/effect-bot(?:\s|$)/u.test(body)
export const deliveryKey = (eventName, event) =>
  `${event.repository.full_name}:${eventName}:${event.comment.id}`

export async function relayComment(options) {
  const { eventName, event, githubToken, webhookUrl, secret } = options
  const fetch = options.fetch ?? globalThis.fetch
  const matches = options.isCommand ?? isCommand
  const keyFor = options.deliveryKey ?? deliveryKey
  if (!(["issue_comment", "pull_request_review_comment"].includes(eventName)) ||
    event?.action !== "created" || typeof event.comment?.body !== "string" ||
    !matches(event.comment.body)) return { status: "ignored" }

  const review = eventName === "pull_request_review_comment"
  const repo = event.repository?.full_name
  // Deleted/unknown head repos and fork inline reviews are unsupported, even
  // if the runner happens to have secrets. PR conversation comments are safe.
  if (review && (!repo || event.pull_request?.head?.repo?.full_name !== repo)) {
    return { status: "unsupported_fork_review" }
  }
  const number = review ? event.pull_request?.number : event.issue?.number
  const comment = event.comment
  const author = comment.user?.login
  if (typeof repo !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repo) ||
    typeof author !== "string" || !/^[A-Za-z0-9-]+(?:\[bot\])?$/u.test(author) ||
    !Number.isSafeInteger(number) || number <= 0 ||
    !Number.isSafeInteger(comment.id) || comment.id <= 0 ||
    typeof comment.html_url !== "string") throw new Error("Malformed comment event")
  if (!githubToken || !webhookUrl || !secret) throw new Error("Missing relay configuration")
  const endpoint = new URL(webhookUrl)
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
    throw new Error("Webhook must be an HTTPS URL without credentials")
  }
  const githubHeaders = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  }
  const request = (url, init) => fetch(url, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(30_000)
  })
  const githubBase = `https://api.github.com/repos/${repo}`
  const permission = await request(`${githubBase}/collaborators/${encodeURIComponent(author)}/permission`, {
    headers: githubHeaders
  })
  if (!permission.ok) throw new Error(`Permission lookup failed: HTTP ${permission.status}`)
  const { role_name: role } = await permission.json()
  // No author_association, permission fallback, or custom-role inference.
  if (role !== "admin" && role !== "maintain") return { status: "rejected" }

  const payload = {
    action: "created",
    repo,
    number,
    isPullRequest: review || Boolean(event.issue?.pull_request),
    commentId: comment.id,
    commentUrl: comment.html_url,
    body: comment.body,
    author,
    ...(review ? { path: comment.path, line: comment.line ?? comment.original_line ?? null } : {})
  }
  const body = JSON.stringify(payload)
  const key = keyFor(eventName, event)
  if (typeof key !== "string" || !key || /[\r\n]/u.test(key)) throw new Error("Invalid delivery key")
  const response = await request(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-GitHub-Event": eventName,
      "X-GitHub-Delivery": key,
      "X-Hub-Signature-256": `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`
    },
    body
  })
  if (!response.ok) throw new Error(`Webhook failed: HTTP ${response.status}`)
  const result = await response.json()
  if (!["accepted", "duplicate", "ignored", "skipped"].includes(result?.status)) {
    throw new Error("Unrecognized webhook admission response")
  }
  if ((result.status === "accepted" || result.status === "duplicate") &&
    typeof result.run_id === "string" && result.run_id.length > 0) {
    try {
      const kind = review ? "pulls" : "issues"
      const reaction = await request(`${githubBase}/${kind}/comments/${comment.id}/reactions`, {
        method: "POST", headers: githubHeaders, body: JSON.stringify({ content: "eyes" })
      })
      if (!reaction.ok) throw new Error("Reaction HTTP error")
    } catch {
      // An admitted request must never be redelivered merely to retry feedback.
      return { ...result, reactionFailed: true }
    }
  }
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"))
    // Fixed repository boundary; no event-supplied API hosts or executable text.
    if (event.repository?.full_name !== "Effect-TS/effect") throw new Error("Unexpected repository")
    const result = await relayComment({
      eventName: process.env.GITHUB_EVENT_NAME, event,
      githubToken: process.env.GITHUB_TOKEN,
      webhookUrl: process.env.MULTICA_EFFECT_BOT_WEBHOOK_URL,
      secret: process.env.MULTICA_EFFECT_BOT_WEBHOOK_SECRET
    })
    // Never log the body, credentials, endpoint, or raw remote errors.
    console.log(`Effect bot relay: ${result.status}${result.reactionFailed ? " (reaction failed)" : ""}`)
    if (["ignored", "skipped"].includes(result.status)) process.exitCode = 1
  } catch {
    console.error("Effect bot relay failed; check configuration and API permissions. No automatic retry.")
    process.exitCode = 1
  }
}

import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

// These are contracts for the checked-in operator prompt, not proof that an
// LLM obeys it or that the deployed autopilot has been configured with it.
const setup = () => readFile(new URL("../../.github/effect-bot.md", import.meta.url), "utf8")
const prompt = async () => {
  const text = await setup()
  const block = text.match(/Suggested autopilot instructions[^\n]*:\n\n((?:>[^\n]*\n)+)/u)
  assert.ok(block, "setup must include the operator's autopilot prompt")
  return block[1].replace(/^> ?/gmu, "").replace(/\s+/gu, " ")
}

test("workflow references only the webhook URL, never a signing secret", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/effect-bot.yml", import.meta.url), "utf8")
  assert.match(workflow, /secrets\.MULTICA_EFFECT_BOT_WEBHOOK_URL/u)
  assert.doesNotMatch(workflow, /MULTICA_EFFECT_BOT_WEBHOOK_SECRET|X-Hub-Signature-256|createHmac/iu)
})

test("prompt requires GitHub comment retrieval by ID for both comment types before acting", async () => {
  const instructions = await prompt()
  assert.match(instructions, /(?:first|before)[^.]*?(?:fetch|retrieve|re-fetch|verify)/iu)
  assert.match(instructions, /repos\/Effect-TS\/effect\/issues\/comments\/(?:<[^>]+>|\{[^}]+\})/u)
  assert.match(instructions, /repos\/Effect-TS\/effect\/pulls\/comments\/(?:<[^>]+>|\{[^}]+\})/u)
})

test("prompt distrusts payload author/body and uses the GitHub command and real author", async () => {
  const instructions = await prompt()
  assert.match(instructions, /(?:untrusted|(?:not|never|do not|don't) trust)[^.]*payload|payload[^.]*untrusted/iu)
  assert.match(instructions, /(?:body|command)[^.]*starts with[^.]*\/effect-bot/iu)
  assert.match(instructions, /(?:use|take)[^.]*?(?:request|body|text)[^.]*GitHub[^.]*not[^.]*payload/iu)
  assert.match(instructions, /(?:real|actual|GitHub)[^.]*author/iu)
})

test("prompt verifies the real author's exact admin/maintain role through GitHub", async () => {
  const instructions = await prompt()
  assert.match(instructions, /repos\/Effect-TS\/effect\/collaborators\/(?:<[^>]+>|\{[^}]+\})\/permission/u)
  assert.match(instructions, /role_name/u)
  assert.match(instructions, /admin[^.]*maintain/u)
})

test("prompt fails closed without replying when any verification check fails", async () => {
  const instructions = await prompt()
  assert.match(instructions, /(?:any|a)[^.]*check[^.]*fail[^.]*stop[^.]*without (?:replying|a reply)/iu)
})

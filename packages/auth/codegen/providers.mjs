import * as GraphQLGenerator from "@effect/graphql-generator/Generator"
import * as JsonSchemaGenerator from "@effect/openapi-generator/JsonSchemaGenerator"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Effect from "effect/Effect"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const directory = import.meta.dirname
const packageRoot = resolve(directory, "..")
const repositoryRoot = resolve(packageRoot, "../..")
const generated = "src/oauth/providers/internal/generated"
const sourcesPath = resolve(directory, "sources.json")
const sources = JSON.parse(await readFile(sourcesPath, "utf8"))
const command = process.argv[2]
if (!["import", "generate", "check"].includes(command) || process.argv.length !== 3) {
  throw new Error("Usage: node codegen/providers.mjs <import|generate|check>")
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")
const format = (contents, extension) => execFileSync("pnpm", ["exec", "dprint", "fmt", "--stdin", extension], {
  cwd: repositoryRoot,
  encoding: "utf8",
  input: contents
})
const json = (value) => format(JSON.stringify(value), "json")

// Keep the public projection deliberate when upstream adds more profile fields.
const githubFields = [
  "id", "login", "name", "user_view_type", "node_id", "avatar_url", "gravatar_id", "url", "html_url",
  "followers_url", "following_url", "gists_url", "starred_url", "subscriptions_url", "organizations_url",
  "repos_url", "events_url", "received_events_url", "type", "site_admin", "company", "blog", "location",
  "email", "notification_email", "hireable", "bio", "twitter_username", "public_repos", "public_gists",
  "followers", "following", "created_at", "updated_at", "private_gists", "total_private_repos",
  "owned_private_repos", "disk_usage", "collaborators", "two_factor_authentication", "plan", "business_plus", "ldap_dn"
]
const linearFields = ["id", "name", "email", "avatarUrl", "displayName", "url"]
const select = (object, names) => Object.fromEntries(names.map((name) => {
  if (!Object.hasOwn(object, name)) throw new Error(`Missing upstream field: ${name}`)
  return [name, object[name]]
}))

function projectGitHub(spec) {
  const profile = spec.components.schemas["private-user"]
  return {
    ...profile,
    properties: select(profile.properties, githubFields),
    required: profile.required.filter((name) => githubFields.includes(name))
  }
}

function projectLinear(spec) {
  const schema = spec.__schema
  const types = Object.fromEntries(schema.types.map((type) => [type.name, type]))
  const object = (name, fields) => ({
    kind: types[name].kind,
    name,
    interfaces: [],
    fields: Object.values(select(Object.fromEntries(types[name].fields.map((field) => [field.name, field])), fields))
      .map(({ name, args, type, isDeprecated, deprecationReason }) => ({ name, args, type, isDeprecated, deprecationReason }))
  })
  // This concrete selection does not use interfaces, directives or descriptions.
  return { __schema: {
    queryType: schema.queryType,
    types: [object("Query", ["viewer"]), object("User", linearFields)]
  } }
}

if (command === "import") {
  const inputs = []
  for (const [name, project] of [["github", projectGitHub], ["linear", projectLinear]]) {
    const source = sources[name]
    const response = await fetch(source.url, { signal: AbortSignal.timeout(60_000) })
    if (!response.ok) throw new Error(`Unable to fetch ${name} schema: HTTP ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (sha256(bytes) !== source.sha256) throw new Error(`Upstream digest mismatch: ${name}`)
    const contents = json(project(JSON.parse(bytes.toString("utf8"))))
    inputs.push({ path: resolve(directory, `${name}.json`), contents })
    source.inputSha256 = sha256(contents)
  }
  for (const input of inputs) await writeFile(input.path, input.contents)
  await writeFile(sourcesPath, json(sources))
  process.stdout.write("Imported the pinned GitHub and Linear schema selections.\n")
} else {
  const inputs = {}
  for (const name of ["github", "linear"]) {
    const bytes = await readFile(resolve(directory, `${name}.json`))
    if (sha256(bytes) !== sources[name].inputSha256) throw new Error(`Local input digest mismatch: ${name}`)
    inputs[name] = JSON.parse(bytes.toString("utf8"))
  }

  // Auth owns optionality, bounds and string handling. Upstream owns field types.
  const profile = structuredClone(inputs.github)
  profile.required = ["id"]
  profile.properties.plan.properties = select(profile.properties.plan.properties, ["collaborators", "name", "space", "private_repos"])
  function applyPolicy(schema, path = []) {
    for (const key of ["description", "example", "examples", "title", "format"]) delete schema[key]
    if (schema.type === "string") {
      schema.maxLength = path.length === 1 && ["login", "name"].includes(path[0]) ? 256
        : path.length === 1 && ["email", "notification_email"].includes(path[0]) ? 320 : 2048
      if (path.length === 1 && path[0] === "login") schema.minLength = 1
    } else if (schema.type === "integer") {
      schema.minimum = path.length === 1 && path[0] === "id" ? 1 : 0
      schema.maximum = Number.MAX_SAFE_INTEGER
    } else if (schema.type === "object") {
      schema.additionalProperties = false
      for (const [name, field] of Object.entries(schema.properties)) applyPolicy(field, [...path, name])
    }
  }
  applyPolicy(profile)
  const generator = JsonSchemaGenerator.make()
  generator.addSchema("Profile", profile)
  const header = "// Generated by packages/auth/codegen/providers.mjs. Do not edit.\n"
    + "// Sources and licenses: packages/auth/codegen/sources.json and THIRD_PARTY_NOTICES.md.\n"
  // JSON Schema counts code points; the existing auth bounds count UTF-16 code units.
  const github = generator.generate("openapi-3.0", {}, false)
    .replaceAll("Schema.isMaxCodePoints(", "Schema.isMaxLength(")
    .replaceAll(" code points", " UTF-16 code units")
  const files = [{
    path: resolve(packageRoot, generated, "github.ts"),
    contents: header + 'import * as Schema from "effect/Schema"\n\n' + github
  }]
  const linear = await Effect.runPromise(GraphQLGenerator.generate({
    schema: "codegen/linear.json",
    documents: [`${generated}/linear.graphql`],
    shared: `${generated}/linear.shared.ts`,
    importExtension: ".ts"
  }, { cwd: packageRoot }).pipe(Effect.provide(NodeServices.layer)))
  if (linear.diagnostics.length > 0) throw new Error(JSON.stringify(linear.diagnostics))
  const expected = ["linear.graphql.ts", "linear.shared.ts"].map((name) => resolve(packageRoot, generated, name))
  if (linear.files.length !== expected.length || expected.some((path) => !linear.files.some((file) => file.path === path))) {
    throw new Error("Expected the Linear viewer operation and shared schemas; check linear.graphql")
  }
  files.push(...linear.files.map((file) => ({
    ...file,
    contents: header + file.contents.replace(
      'import { GraphQL, GraphQLGroup } from "effect/graphql"',
      'import * as GraphQL from "effect/graphql/GraphQL"\nimport * as GraphQLGroup from "effect/graphql/GraphQLGroup"'
    )
  })))
  for (const file of files) {
    const contents = format(file.contents, "ts")
    if (command === "check") {
      if (await readFile(file.path, "utf8") !== contents) throw new Error(`Stale generated file: ${file.path}`)
    } else {
      await mkdir(dirname(file.path), { recursive: true })
      await writeFile(file.path, contents)
    }
  }
  process.stdout.write(`${command === "check" ? "Checked" : "Generated"} ${files.length} provider schema modules.\n`)
}

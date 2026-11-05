/**
 * The receiver rule, bundled: `Users.create` is called through a namespace
 * import, which the bundle turns into a bare call, from a destructured member
 * and from `Effect.andThen`, for a plain object, a class instance with a
 * private field and an implementation that calls its sibling through the
 * operation; each with and without a test override of `find`.
 * Run as `node main.js`; it prints the results as one JSON array.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Users from "./users.ts"

const plain = {
  find: (name: string) => Effect.succeed(`live ${name}`),
  create(name: string) {
    return Effect.map(this.find(name), (found) => `created ${found}`)
  }
}

class Instance {
  #prefix = "live"
  find(name: string) {
    return Effect.succeed(`${this.#prefix} ${name}`)
  }
  create(name: string) {
    return Effect.map(this.find(name), (found) => `created ${found}`)
  }
}

const viaOperation = {
  find: plain.find,
  create: (name: string) => Effect.map(Users.find(name), (found) => `created ${found}`)
}

const sites = [
  Users.create("x"),
  Effect.flatMap(Users.Users, ({ create }) => create("x")),
  Effect.andThen(Effect.succeed("x"), Users.create)
]

const fake = (name: string) => Effect.succeed(`fake ${name}`)

const program = Effect.all(
  [plain, new Instance(), viaOperation].flatMap((impl) =>
    sites.flatMap((site) => [
      site.pipe(Effect.provide(Layer.succeed(Users.Users, impl))),
      site.pipe(Effect.provideService(Users.find, fake), Effect.provide(Layer.succeed(Users.Users, impl)))
    ])
  )
)

Effect.runPromise(program).then(
  (results) => process.stdout.write(JSON.stringify(results)),
  (error) => {
    process.stderr.write(`${error}\n`)
    process.exit(1)
  }
)

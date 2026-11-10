/**
 * The users backend the prototype app talks to, and an in-memory fake of it.
 *
 * The fake does its work when a call arrives and answers after `latency`, or,
 * while an operation is held, when the test releases that call.
 */
import { Context, Effect, Layer, Schema } from "effect"

export const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  role: Schema.String,
  team: Schema.String,
  location: Schema.String,
  joined: Schema.String,
  likes: Schema.Number
})
export type User = typeof User.Type

export const UserPage = Schema.Struct({
  page: Schema.Number,
  pages: Schema.Number,
  users: Schema.Array(User)
})
export type UserPage = typeof UserPage.Type

export class UserNotFound extends Schema.TaggedError<UserNotFound>()("UserNotFound", { id: Schema.String }) {}

export class RenameRejected extends Schema.TaggedError<RenameRejected>()("RenameRejected", {
  reason: Schema.String
}) {}

export class UsersApi extends Context.Service<UsersApi, {
  readonly list: (page: number) => Effect.Effect<UserPage>
  readonly get: (id: string) => Effect.Effect<User, UserNotFound>
  readonly rename: (id: string, name: string) => Effect.Effect<User, RenameRejected>
  readonly like: (id: string) => Effect.Effect<User>
}>()("prototype/UsersApi") {}

export type Operation = "list" | "get" | "rename" | "like"

const roles = ["Engineer", "Designer", "Product manager", "Support"]
const teams = ["Platform", "Growth", "Billing", "Mobile"]
const locations = ["Auckland", "Berlin", "Lisbon", "Toronto"]

const seed = (count: number): Map<string, User> => {
  const users = new Map<string, User>()
  for (let i = 1; i <= count; i++) {
    users.set(String(i), {
      id: String(i),
      name: `User ${i}`,
      email: `user${i}@example.com`,
      role: roles[i % roles.length]!,
      team: teams[i % teams.length]!,
      location: locations[i % locations.length]!,
      joined: `2024-${String((i % 12) + 1).padStart(2, "0")}-15`,
      likes: i % 7
    })
  }
  return users
}

export const makeFake = (options?: {
  readonly users?: number
  readonly pageSize?: number
  readonly latency?: number
  /** Real timers instead of the Clock, for tests that run on the live clock. */
  readonly live?: boolean
}) => {
  const users = seed(options?.users ?? 45)
  const pageSize = options?.pageSize ?? 20
  const latency = options?.latency ?? 10
  const calls: Record<Operation, number> = { list: 0, get: 0, rename: 0, like: 0 }
  const holding = new Set<Operation>()
  const held: Record<Operation, Array<() => void>> = { list: [], get: [], rename: [], like: [] }

  const wait = options?.live
    ? Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, latency)))
    : Effect.sleep(latency)

  /** The call has arrived and done its work: now it answers. */
  const answer = <A, E>(operation: Operation, result: Effect.Effect<A, E>): Effect.Effect<A, E> =>
    Effect.suspend(() => {
      calls[operation]++
      const settled = Effect.runSyncExit(result)
      const respond = holding.has(operation)
        ? Effect.callback<void>((resume) => {
          held[operation].push(() => resume(Effect.void))
        })
        : wait
      return Effect.andThen(respond, settled)
    })

  const find = (id: string) => {
    const user = users.get(id)
    return user === undefined ? Effect.fail(new UserNotFound({ id })) : Effect.succeed(user)
  }

  const service: UsersApi["Service"] = {
    list: (page) =>
      answer(
        "list",
        Effect.sync(() => {
          const all = Array.from(users.values())
          return {
            page,
            pages: Math.max(1, Math.ceil(all.length / pageSize)),
            users: all.slice(page * pageSize, (page + 1) * pageSize)
          }
        })
      ),
    get: (id) => answer("get", Effect.suspend(() => find(id))),
    rename: (id, name) =>
      answer(
        "rename",
        Effect.suspend(() => {
          const user = users.get(id)
          if (user === undefined) return Effect.fail(new RenameRejected({ reason: "No such user" }))
          if (name.trim() === "") return Effect.fail(new RenameRejected({ reason: "A name can't be blank" }))
          const renamed = { ...user, name }
          users.set(id, renamed)
          return Effect.succeed(renamed)
        })
      ),
    like: (id) =>
      answer(
        "like",
        Effect.sync(() => {
          const user = users.get(id)!
          const liked = { ...user, likes: user.likes + 1 }
          users.set(id, liked)
          return liked
        })
      )
  }

  return {
    users,
    calls,
    /** Calls of `operation` from now on wait for `release`. */
    hold: (operation: Operation) => {
      holding.add(operation)
    },
    /** How many calls of `operation` are waiting to answer. */
    waiting: (operation: Operation) => held[operation].length,
    /** Answers the held call at `index` (the oldest by default). */
    release: (operation: Operation, index = 0) => {
      const [resume] = held[operation].splice(index, 1)
      if (resume === undefined) throw new Error(`no held ${operation} call at ${index}`)
      resume()
    },
    /** Stops holding `operation` and answers everything waiting, oldest first. */
    resume: (operation: Operation) => {
      holding.delete(operation)
      for (const resume of held[operation].splice(0)) resume()
    },
    layer: Layer.succeed(UsersApi, service)
  }
}

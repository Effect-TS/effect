import * as Client from "@effect/rpc/Client"
import * as Resolver from "@effect/rpc/Resolver"
import * as Router from "@effect/rpc/Router"
import * as RpcSchema from "@effect/rpc/Schema"
import * as Server from "@effect/rpc/Server"
import * as Schema from "@effect/schema/Schema"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"

// Post schema
const PostId = pipe(
  Schema.number,
  Schema.positive(),
  Schema.int(),
  Schema.brand("PostId")
)
type PostId = Schema.Schema.To<typeof PostId>

const Post = Schema.struct({
  id: PostId,
  body: Schema.string
})
const CreatePost = pipe(Post, Schema.omit("id"))

// Post service schema
const posts = RpcSchema.make({
  create: {
    input: CreatePost,
    output: Post
  },
  list: {
    output: Schema.chunk(Post)
  }
})

// Post service router
const postsRouter = Router.make(posts, {
  create: (post) =>
    Effect.succeed({
      ...post,
      id: PostId(1)
    }),

  list: Effect.succeed(
    Chunk.fromIterable([
      {
        id: PostId(1),
        body: "Hello world!"
      }
    ])
  )
})

// Root service schema
const schema = RpcSchema.make({
  // Add nested post service
  posts,

  greet: {
    input: Schema.string,
    output: Schema.string
  },

  currentTime: {
    output: Schema.dateFromString(Schema.string)
  }
})

// Root service router
const router = Router.make(schema, {
  greet: (name) => Effect.succeed(`Hello ${name}!`),
  currentTime: Effect.sync(() => new Date()),
  posts: postsRouter
})

const handler = Server.handler(router)

// Create client
const client = Client.make(schema, Resolver.make(handler))

Effect.runPromise(client.posts.create({ body: "Hello!" })).then(console.log)

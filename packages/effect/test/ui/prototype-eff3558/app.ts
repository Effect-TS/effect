/**
 * EFF-3558 prototype: a users app with a list page and a detail page over a
 * Loader cache.
 */
import { Effect, Layer, Option, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { Command, Component, Route, Router } from "effect/ui"
import { Html } from "effect/ui/html"
import { User, UserNotFound, UserPage, UsersApi } from "./api.ts"

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const Users = Loader.Tag("users")

export class ListUsers extends Loader.Service<ListUsers>()(
  "users/ListUsers",
  {
    args: Schema.Struct({ page: Schema.Number }),
    success: UserPage,
    error: Schema.Never,
    staleTime: "30 seconds",
    tags: [Users]
  },
  Effect.map(UsersApi, (api) => ({ page }) => api.list(page))
) {}

export class GetUser extends Loader.Service<GetUser>()(
  "users/GetUser",
  {
    args: Schema.Struct({ id: Schema.String }),
    success: User,
    error: UserNotFound,
    staleTime: "30 seconds",
    tags: [Users]
  },
  Effect.map(UsersApi, (api) => ({ id }) => api.get(id))
) {}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export class RenameUser extends Command.Service<RenameUser>()(
  "users/RenameUser",
  Effect.map(UsersApi, (api) => (id: string, name: string) => api.rename(id, name)),
  {
    mode: "queue",
    key: (id) => id,
    invalidates: () => [ListUsers],
    optimistic: (id, name) => [
      GetUser.patch({ id }, (user) => ({ ...user, name })),
      ListUsers.patchAll((page) => ({
        ...page,
        users: page.users.map((user) => user.id === id ? { ...user, name } : user)
      }))
    ],
    writes: (user) => [GetUser.set({ id: user.id }, user)]
  }
) {}

export class LikeUser extends Command.Service<LikeUser>()(
  "users/LikeUser",
  Effect.map(UsersApi, (api) => (id: string) => api.like(id)),
  {
    invalidates: () => [Users],
    optimistic: (id) => [GetUser.patch({ id }, (user) => ({ ...user, likes: user.likes + 1 }))]
  }
) {}

export const layer = Layer.mergeAll(ListUsers.layer, GetUser.layer, RenameUser.layer, LikeUser.layer)

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const AppRoute = Route.union({
  List: Route.make("/"),
  Detail: Route.make("/users/:id", { params: { id: Schema.String } }),
  NotFound: Route.make("/*")
})
export type AppRoute = typeof AppRoute.Type

const detailUrl = (id: string) => AppRoute.print(AppRoute.make({ _tag: "Detail", params: { id } }))

// ---------------------------------------------------------------------------
// UserCard: one user, with a like button
// ---------------------------------------------------------------------------

export const UserCardMessage = Schema.TaggedUnion({
  UserChanged: { snapshot: Loader.Snapshot(GetUser, "user") },
  Like: {},
  Liked: {}
})

export const UserCard = Component.make({
  name: "UserCard",
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({ user: Loader.Snapshot(GetUser, "user") }),
  message: UserCardMessage,
  elements: Html,
  loaders: {
    user: (_model, props) => ({ id: props.id })
  },
  init: ($) => $.empty,
  update: (model, message, $) =>
    UserCardMessage.match(message, {
      UserChanged: ({ snapshot }) => ({ user: snapshot }),
      Like: () => $.run(LikeUser.make($.props.id).pipe(Command.map(() => UserCardMessage.make({ _tag: "Liked" })))),
      Liked: () => model
    }),
  subscriptions: (_model, _props, watch) => [
    watch({ user: (snapshot) => UserCardMessage.make({ _tag: "UserChanged", snapshot }) })
  ],
  view: (_model, h) =>
    AsyncResult.match(h.loaded.user, {
      onInitial: () => h.p("Loading user…"),
      onFailure: () => h.p("This user doesn't exist."),
      onSuccess: ({ value: user, waiting }) =>
        h.article(
          h.h2(user.name),
          h.p(user.email),
          h.p(`${user.role} · ${user.team} · ${user.location} · joined ${user.joined}`),
          h.button(`♥ ${user.likes}`).attr("aria-label", "Like").onClick(UserCardMessage.make({ _tag: "Like" })),
          waiting && h.small("Updating…")
        )
    })
})

// ---------------------------------------------------------------------------
// RenameForm: edits a user's name through a draft
// ---------------------------------------------------------------------------

export const RenameFormMessage = Schema.TaggedUnion({
  UserChanged: { snapshot: Loader.Snapshot(GetUser, "user") },
  Edit: { name: Schema.String },
  Cancel: {},
  Save: {},
  Saved: {},
  SaveFailed: { name: Schema.String, reason: Schema.String }
})

export const RenameForm = Component.make({
  name: "RenameForm",
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({
    user: Loader.Snapshot(GetUser, "user"),
    draft: Schema.Option(Schema.String),
    saving: Schema.Number,
    error: Schema.Option(Schema.String)
  }),
  message: RenameFormMessage,
  elements: Html,
  loaders: {
    user: (_model, props) => ({ id: props.id })
  },
  init: ($) => ({ ...$.empty, draft: Option.none(), saving: 0, error: Option.none() }),
  update: (model, message, $) =>
    RenameFormMessage.match(message, {
      UserChanged: ({ snapshot }) => ({ ...model, user: snapshot }),
      Edit: ({ name }) => ({ ...model, draft: Option.some(name), error: Option.none() }),
      Cancel: () => ({ ...model, draft: Option.none(), error: Option.none() }),
      Save: () =>
        Option.match(model.draft, {
          onNone: () => model,
          onSome: (name) =>
            $.set({ ...model, draft: Option.none(), saving: model.saving + 1, error: Option.none() }).run(
              RenameUser.make($.props.id, name).pipe(Command.match({
                onSuccess: () => RenameFormMessage.make({ _tag: "Saved" }),
                onFailure: (error) => RenameFormMessage.make({ _tag: "SaveFailed", name, reason: error.reason })
              }))
            )
        }),
      Saved: () => ({ ...model, saving: model.saving - 1 }),
      SaveFailed: ({ name, reason }) => ({
        ...model,
        saving: model.saving - 1,
        draft: Option.orElse(model.draft, () => Option.some(name)),
        error: Option.some(reason)
      })
    }),
  subscriptions: (_model, _props, watch) => [
    watch({ user: (snapshot) => RenameFormMessage.make({ _tag: "UserChanged", snapshot }) })
  ],
  view: (model, h) =>
    AsyncResult.match(h.loaded.user, {
      onInitial: () => h.p("Loading…"),
      onFailure: () => h.p("There is nothing to rename."),
      onSuccess: ({ value: user }) =>
        h.form(
          h.input().attr("aria-label", "Name").value(Option.getOrElse(model.draft, () => user.name))
            .onInput(({ value }) => RenameFormMessage.make({ _tag: "Edit", name: value })),
          h.button("Save").attr("type", "submit").disabled(Option.isNone(model.draft)),
          h.button("Cancel").attr("type", "button").disabled(Option.isNone(model.draft))
            .onClick(RenameFormMessage.make({ _tag: "Cancel" })),
          model.saving > 0 && h.small("Saving…"),
          Option.match(model.error, {
            onNone: () => null,
            onSome: (reason) => h.p(reason).attr("role", "alert")
          })
        ).onSubmit(RenameFormMessage.make({ _tag: "Save" }))
    })
})

// ---------------------------------------------------------------------------
// DetailPage
// ---------------------------------------------------------------------------

export const DetailPageMessage = Schema.TaggedUnion({ ToggleRename: {} })

export const DetailPage = Component.make({
  name: "DetailPage",
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({ renaming: Schema.Boolean }),
  message: DetailPageMessage,
  elements: Html,
  init: () => ({ renaming: false }),
  update: (model) => ({ renaming: !model.renaming }),
  view: (model, h) =>
    h.section(
      h.child(UserCard, { key: "card", props: { id: h.props.id } }),
      h.button(model.renaming ? "Close" : "Rename").onClick(DetailPageMessage.make({ _tag: "ToggleRename" })),
      model.renaming && h.child(RenameForm, { key: "rename", props: { id: h.props.id } })
    )
})

// ---------------------------------------------------------------------------
// ListPage: a paged list that keeps the previous page on screen while the
// next one loads, and a card for the row being peeked at
// ---------------------------------------------------------------------------

export const ListPageMessage = Schema.TaggedUnion({
  RequestedChanged: { snapshot: Loader.Snapshot(ListUsers, "requested") },
  ShownChanged: { snapshot: Loader.Snapshot(ListUsers, "shown") },
  GoTo: { page: Schema.Number },
  Peek: { id: Schema.String }
})

export const ListPage = Component.make({
  name: "ListPage",
  model: Schema.Struct({
    page: Schema.Number,
    shownPage: Schema.Number,
    requested: Loader.Snapshot(ListUsers, "requested"),
    shown: Loader.Snapshot(ListUsers, "shown"),
    peek: Schema.Option(Schema.String)
  }),
  message: ListPageMessage,
  elements: Html,
  loaders: {
    requested: (model) => ({ page: model.page }),
    shown: (model) => ({ page: model.shownPage })
  },
  init: ($) => ({ ...$.empty, page: 0, shownPage: 0, peek: Option.none() }),
  update: (model, message, $) =>
    ListPageMessage.match(message, {
      RequestedChanged: ({ snapshot }) => {
        const next = { ...model, requested: snapshot }
        return AsyncResult.isSuccess($.loadedOf(next).requested)
          ? { ...next, shownPage: model.page }
          : next
      },
      ShownChanged: ({ snapshot }) => ({ ...model, shown: snapshot }),
      GoTo: ({ page }) => ({ ...model, page }),
      Peek: ({ id }) => ({ ...model, peek: Option.some(id) })
    }),
  subscriptions: (_model, _props, watch) => [
    watch({
      requested: (snapshot) => ListPageMessage.make({ _tag: "RequestedChanged", snapshot }),
      shown: (snapshot) => ListPageMessage.make({ _tag: "ShownChanged", snapshot })
    })
  ],
  view: (model, h) => {
    const visible = AsyncResult.isSuccess(h.loaded.requested) ? h.loaded.requested : h.loaded.shown
    return AsyncResult.match(visible, {
      onInitial: () => h.p("Loading users…"),
      onFailure: () => h.p("The users couldn't be loaded."),
      onSuccess: ({ value: { page, pages, users } }) =>
        h.section(
          h.ul(
            users.map((user) =>
              h.li(
                h.a(user.name).attr("href", detailUrl(user.id)),
                ` ${user.email} · ${user.role} `,
                h.button("Peek").onClick(ListPageMessage.make({ _tag: "Peek", id: user.id }))
              ).key(user.id)
            )
          ),
          h.nav(
            h.button("Previous").disabled(model.page === 0)
              .onClick(ListPageMessage.make({ _tag: "GoTo", page: model.page - 1 })),
            h.span(`Page ${page + 1} of ${pages}`),
            h.button("Next").disabled(model.page >= pages - 1)
              .onClick(ListPageMessage.make({ _tag: "GoTo", page: model.page + 1 })),
            model.page !== page && h.small(`Loading page ${model.page + 1}…`)
          ),
          Option.match(model.peek, {
            onNone: () => null,
            onSome: (id) => h.child(UserCard, { key: `peek-${id}`, props: { id } })
          })
        )
    })
  }
})

// ---------------------------------------------------------------------------
// App: the layout, which holds the route
// ---------------------------------------------------------------------------

export const AppMessage = Schema.TaggedUnion({ RouteChanged: { route: AppRoute } })

export const App = Component.make({
  name: "App",
  props: Schema.Struct({ route: AppRoute }),
  model: AppRoute,
  message: AppMessage,
  elements: Html,
  init: ($) => $.props.route,
  update: (_route, message) => message.route,
  subscriptions: () => [Router.subscription(AppRoute, (route) => AppMessage.make({ _tag: "RouteChanged", route }))],
  view: (route, h) =>
    h.div(
      h.header(h.a("Users").attr("href", AppRoute.print(AppRoute.make({ _tag: "List" })))),
      h.main(
        AppRoute.match(route, {
          List: () => h.child(ListPage, { key: "list" }),
          Detail: ({ params }) => h.child(DetailPage, { key: `user-${params.id}`, props: { id: params.id } }),
          NotFound: () => h.h1("Not found")
        })
      )
    )
})

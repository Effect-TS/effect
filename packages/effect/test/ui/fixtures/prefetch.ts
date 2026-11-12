/**
 * An app that declares its routes' reads with `Router.prefetch`: a sidebar
 * mounted on every route, a detail page, a page whose walk reaches a component
 * child, a feature child and two components whose read the declarer can't
 * see, a page whose view throws, and a page whose Layer fails.
 */
import { Context, Effect, Layer, Schema } from "effect"
import { Loader } from "effect/reactivity"
import { Component, Feature, Route, Router } from "effect/ui"
import { GetPerson } from "./router.ts"

export const Routes = Route.union({
  Home: Route.make("/"),
  // A declared query: a key it doesn't declare is dropped, so it doesn't change the printed route.
  Person: Route.make("/people/:id", { params: { id: Schema.Number }, query: { tab: Schema.optional(Schema.String) } }),
  Walk: Route.make("/walk"),
  Broken: Route.make("/broken"),
  Empty: Route.make("/empty"),
  Failing: Route.make("/failing")
})
export type Routes = typeof Routes.Type

/** A read the app never provides at the declarer. */
export class GetNote extends Loader.Service<GetNote>()("GetNote", {
  args: { id: Schema.Number },
  success: Schema.String,
  error: Schema.Never,
  staleTime: "1 minute"
}, Effect.succeed(({ id }) => Effect.succeed(`Note ${id}`))) {}

const reader = <const Name extends string>(name: Name) =>
  Component.make({
    name,
    props: Schema.Struct({ id: Schema.Number }),
    model: Schema.Struct({}),
    message: Schema.Never,
    loaders: { person: { load: GetPerson, args: (_model, props) => ({ id: props.id }) } },
    init: () => ({}),
    update: (model) => model,
    view: (_, h) => h.el("p", name)
  })

export const Sidebar = reader("Sidebar")
export const Detail = reader("Detail")
export const Card = reader("Card")

/** Reads `GetNote`, which the declarer can't see. */
export const Note = Component.make({
  name: "Note",
  props: Schema.Struct({ id: Schema.Number }),
  model: Schema.Struct({}),
  message: Schema.Never,
  loaders: { note: { load: GetNote, args: (_model, props) => ({ id: props.id }) } },
  init: () => ({}),
  update: (model) => model,
  view: (_, h) => h.el("p", "Note")
})

export class Badge extends Feature.Service<Badge>()("test/Badge", { props: Schema.Struct({}) }) {}

/** Reads person 1, and shows a card for person 2, a feature, and a note with and without a `provide`. */
export const Walked = Component.make({
  name: "Walked",
  model: Schema.Struct({}),
  message: Schema.Never,
  loaders: { person: { load: GetPerson, args: () => ({ id: 1 }) } },
  init: () => ({}),
  update: (model) => model,
  view: (_, h) =>
    h.el(
      "div",
      h.child(Card, { key: "card", props: { id: 2 } }),
      h.child(Badge, { key: "badge", fallback: () => h.text("") }),
      h.child(Note.pipe(Component.provide(GetNote.layer)), { key: "provided", props: { id: 1 } }),
      h.child(Note, { key: "bare", props: { id: 2 } })
    )
})

/** Reads person 3, then its view throws. */
export const Broken = Component.make({
  name: "Broken",
  model: Schema.Struct({}),
  message: Schema.Never,
  loaders: { person: { load: GetPerson, args: () => ({ id: 3 }) } },
  init: () => ({}),
  update: (model) => model,
  view: () => {
    throw new Error("Broken view")
  }
})

class Nothing extends Context.Service<Nothing, string>()("test/Nothing") {}

/** A page whose provided Layer fails. */
export const Failing = Component.make({
  name: "Failing",
  model: Schema.Struct({}),
  message: Schema.Never,
  init: () => ({}),
  update: (model) => model,
  view: (_, h) => h.el("p", "Failing")
}).pipe(Component.provide(Layer.effect(Nothing, Effect.die("no build"))))

/** What the Person handler saw as the current location when it ran. */
export const probe = { location: (): string => "", seen: [] as Array<string> }

const AppMessage = Schema.TaggedUnion({ ChangedRoute: { route: Routes } })

export const App = Component.make({
  name: "App",
  props: Schema.Struct({ route: Routes }),
  model: Schema.Struct({ route: Routes }),
  message: AppMessage,
  init: ($) => ({ route: $.props.route }),
  update: (_, message) => ({ route: message.route }),
  subscriptions: (model) => [
    Router.subscription(Routes, model.route, (route) => AppMessage.make({ _tag: "ChangedRoute", route })),
    Router.prefetch(Routes, {
      // The sidebar is mounted already: the check after a push skips it.
      Home: () => [Router.page(Sidebar, { id: 9 })],
      Person: ({ params }) => {
        probe.seen.push(probe.location())
        // Person 7 declares an entry its page never watches.
        return [Router.page(Detail, { id: params.id === 7 ? 70 : params.id })]
      },
      Walk: () => [Router.page(Walked)],
      Broken: () => [Router.page(Broken), Router.page(Detail, { id: 4 })],
      // Nothing mounts the declared page.
      Empty: () => [Router.page(Detail, { id: 5 })],
      Failing: () => [Router.page(Detail, { id: 6 })]
    })
  ],
  view: (model, h) =>
    h.el(
      "div",
      h.child(Sidebar, { key: "sidebar", props: { id: 0 } }),
      Routes.match(model.route, {
        Home: () => h.el("h1", "Home"),
        Person: (route) => h.child(Detail, { key: Routes.print(route), props: { id: route.params.id } }),
        Walk: () => h.el("h1", "Walk"),
        Broken: () => h.el("h1", "Broken"),
        Empty: () => h.el("h1", "Empty"),
        Failing: (route) => h.child(Failing, { key: Routes.print(route), props: {} })
      })
    )
})

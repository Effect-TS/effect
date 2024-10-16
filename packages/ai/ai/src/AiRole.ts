/**
 * @since 1.0.0
 */
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/ai/AiRole")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export type AiRole = User | UserWithName | Model

/**
 * @since 1.0.0
 * @category models
 */
export class User extends Schema.TaggedClass<User>("@effect/ai/AiRole/User")("User", {}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: TypeId = TypeId

  /**
   * @since 1.0.0
   */
  readonly kind = "user" as const

  /**
   * @since 1.0.0
   */
  readonly nameOption: Option.Option<string> = Option.none()
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const user: AiRole = new User()

/**
 * @since 1.0.0
 * @category models
 */
export class UserWithName extends Schema.TaggedClass<UserWithName>("@effect/ai/AiRole/UserWithName")("UserWithName", {
  name: Schema.String
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: TypeId = TypeId

  /**
   * @since 1.0.0
   */
  readonly kind = "user" as const

  /**
   * @since 1.0.0
   */
  get nameOption(): Option.Option<string> {
    return Option.some(this.name)
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const userWithName = (name: string): AiRole => new UserWithName({ name }, { disableValidation: true })

/**
 * @since 1.0.0
 * @category models
 */
export class Model extends Schema.TaggedClass<Model>("@effect/ai/AiRole/Model")("Model", {}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: TypeId = TypeId

  /**
   * @since 1.0.0
   */
  readonly kind = "model" as const

  /**
   * @since 1.0.0
   */
  readonly nameOption: Option.Option<string> = Option.none()
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const model: AiRole = new Model()

/**
 * @since 1.0.0
 * @category roles
 */
export const AiRole: Schema.Union<[
  typeof User,
  typeof UserWithName,
  typeof Model
]> = Schema.Union(
  User,
  UserWithName,
  Model
)

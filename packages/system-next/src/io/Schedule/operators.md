## Schedule Operators

TODO(Mike/Max): Review operators

The `tsplus` operators implemented for `Schedule` should be reviewed to ensure that all operators make sense for their associated method.

### Implemented Operators

| Operator  | Method          |
|:---------:|:---------------:|
| `&&`      | `zip`           |
| `**`      | `bothInOut`     |
| `>>`      | `compose`       |
| `<<`      | `composeUsing`  |
| `+`       | `choose`        |
| `/`       | `andThen`       |
| `%`       | `andThenEither` |
| `\|`      | `either`        |
| `\|\|`    | `chooseMerge`   |
| `>`       | `zipRight`      |
| `<`       | `zipLeft`       |

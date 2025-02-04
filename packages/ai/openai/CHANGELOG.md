# @effect/ai-openai

## 0.11.2

### Patch Changes

- [#4389](https://github.com/Effect-TS/effect/pull/4389) [`f089470`](https://github.com/Effect-TS/effect/commit/f0894708e9d591b70eccf3a50ae91ac6e0f6d6e3) Thanks @IMax153! - Add support for [GenAI telemetry annotations](https://opentelemetry.io/docs/specs/semconv/attributes-registry/gen-ai/).

- [#4368](https://github.com/Effect-TS/effect/pull/4368) [`a0c85e6`](https://github.com/Effect-TS/effect/commit/a0c85e6601fd3e10d08085969f7453b7b517347b) Thanks @IMax153! - Support creation of embeddings from the AI integration packages.

  For example, the following program will create an OpenAI `Embeddings` service
  that will aggregate all embedding requests received within a `500` millisecond
  window into a single batch.

  ```ts
  import { Embeddings } from "@effect/ai"
  import { OpenAiClient, OpenAiEmbeddings } from "@effect/ai-openai"
  import { NodeHttpClient } from "@effect/platform-node"
  import { Config, Effect, Layer } from "effect"

  // Create the OpenAI client
  const OpenAi = OpenAiClient.layerConfig({
    apiKey: Config.redacted("OPENAI_API_KEY")
  }).pipe(Layer.provide(NodeHttpClient.layerUndici))

  // Create an embeddings service for the `text-embedding-3-large` model
  const TextEmbeddingsLarge = OpenAiEmbeddings.layerDataLoader({
    model: "text-embedding-3-large",
    window: "500 millis",
    maxBatchSize: 2048
  }).pipe(Layer.provide(OpenAi))

  // Use the generic `Embeddings` service interface in your program
  const program = Effect.gen(function* () {
    const embeddings = yield* Embeddings.Embeddings
    const result = yield* embeddings.embed("The input to embed")
  })

  // Provide the specific implementation to use
  program.pipe(Effect.provide(TextEmbeddingsLarge), Effect.runPromise)
  ```

- Updated dependencies [[`f5e3b1b`](https://github.com/Effect-TS/effect/commit/f5e3b1bcdf24b440251ce8425d750353cf022e96), [`59b3cfb`](https://github.com/Effect-TS/effect/commit/59b3cfbbd5713dd9475998e95fad5534c0b21466), [`766113c`](https://github.com/Effect-TS/effect/commit/766113c0ea3512cdb887650ead8ba314236e22ee), [`fcf3b7c`](https://github.com/Effect-TS/effect/commit/fcf3b7cc07a28635a5b53243b01cdeb6592dab3c), [`bb05fb8`](https://github.com/Effect-TS/effect/commit/bb05fb83457355b1ca567228a9e041edfb6fd85d), [`712277f`](https://github.com/Effect-TS/effect/commit/712277f949052a24b46e4aa234063a6abf395c90), [`f269122`](https://github.com/Effect-TS/effect/commit/f269122508693b111142994dd48698ddc75f3d69), [`8f6006a`](https://github.com/Effect-TS/effect/commit/8f6006a610fb6d6c7b8d14209a7323338a8964ff), [`f089470`](https://github.com/Effect-TS/effect/commit/f0894708e9d591b70eccf3a50ae91ac6e0f6d6e3), [`c45b559`](https://github.com/Effect-TS/effect/commit/c45b5592b5fd1189a5c932cfe05bd7d5f6d68508), [`430c846`](https://github.com/Effect-TS/effect/commit/430c846cbac05b187e3d24ac8dfee0cf22506f7c), [`7b03057`](https://github.com/Effect-TS/effect/commit/7b03057507d2dab5e6793beb9c578dedaaeb15fe), [`a9c94c8`](https://github.com/Effect-TS/effect/commit/a9c94c807755610831211a686d2fad849ab38eb4), [`107e6f0`](https://github.com/Effect-TS/effect/commit/107e6f0557a1e2d3b0dce25d62fa1e2601521752), [`c9175ae`](https://github.com/Effect-TS/effect/commit/c9175aef41cb1e3b689d0ac0a4f53d8107376b58), [`65c11b9`](https://github.com/Effect-TS/effect/commit/65c11b9266ec9447c31c26fe3ed35c73bd3b81fd), [`e386d2f`](https://github.com/Effect-TS/effect/commit/e386d2f1b3ab3ac2c14ee76de11f5963d32a3df4), [`9172efb`](https://github.com/Effect-TS/effect/commit/9172efba98bc6a82353e6ec2af61ac08f038ba64), [`a0c85e6`](https://github.com/Effect-TS/effect/commit/a0c85e6601fd3e10d08085969f7453b7b517347b)]:
  - @effect/ai@0.8.2
  - @effect/platform@0.75.2
  - effect@3.12.8
  - @effect/experimental@0.39.2

## 0.11.1

### Patch Changes

- Updated dependencies [[`8dff1d1`](https://github.com/Effect-TS/effect/commit/8dff1d1bff76cdba643cad7f0bf864300f08bc61)]:
  - effect@3.12.7
  - @effect/ai@0.8.1
  - @effect/experimental@0.39.1
  - @effect/platform@0.75.1

## 0.11.0

### Patch Changes

- [#4316](https://github.com/Effect-TS/effect/pull/4316) [`5c5612f`](https://github.com/Effect-TS/effect/commit/5c5612fa9472cde547ad182664e7173403ef0511) Thanks @IMax153! - Allow configuring OpenAI API URL and API key in OpenAI client constructor

- Updated dependencies [[`5e43ce5`](https://github.com/Effect-TS/effect/commit/5e43ce50bae116865906112e7f88d390739d778b), [`289c13b`](https://github.com/Effect-TS/effect/commit/289c13b38e8e35b214d46d385d05dead176c87cd), [`76eb7d0`](https://github.com/Effect-TS/effect/commit/76eb7d0fbce3c009c8f77e84c178cb15bbed9709), [`8b4e75d`](https://github.com/Effect-TS/effect/commit/8b4e75d35daea807c447ca760948a717aa66bb52), [`fc5e0f0`](https://github.com/Effect-TS/effect/commit/fc5e0f0d357a0051cfa01c1ede83ffdd3cb41ab1), [`004fd2b`](https://github.com/Effect-TS/effect/commit/004fd2bbd1459e64fb1b57f02eeb791ca5ea1ea5), [`b2a31be`](https://github.com/Effect-TS/effect/commit/b2a31be85c35d891351ce4f9a2cc93ece0c257f6), [`5514d05`](https://github.com/Effect-TS/effect/commit/5514d05b5cd586ff5868b8bd41c959e95e6c33cd), [`bf5f0ae`](https://github.com/Effect-TS/effect/commit/bf5f0ae9daa0170471678e22585e8ec14ce667bb), [`3b19bcf`](https://github.com/Effect-TS/effect/commit/3b19bcfd3aaadb6c9253428622df524537c8e626), [`b064b3b`](https://github.com/Effect-TS/effect/commit/b064b3b293615fd268cc5a5647d0981eb67750b8), [`eb264ed`](https://github.com/Effect-TS/effect/commit/eb264ed8a6e8c92a9dc7006f766c6ca2e5d29e03), [`289c13b`](https://github.com/Effect-TS/effect/commit/289c13b38e8e35b214d46d385d05dead176c87cd), [`f474678`](https://github.com/Effect-TS/effect/commit/f474678bf10b8f1c80e3dc096ddc7ecf20b2b23e), [`ee187d0`](https://github.com/Effect-TS/effect/commit/ee187d098007a402844c94d04f0cd8f07695377a)]:
  - @effect/experimental@0.39.0
  - @effect/platform@0.75.0
  - @effect/ai@0.8.0
  - effect@3.12.6

## 0.10.0

### Patch Changes

- Updated dependencies [[`bd0d489`](https://github.com/Effect-TS/effect/commit/bd0d4892b098bc4c589444af9f50259c2c02ec0f), [`a8b0ddb`](https://github.com/Effect-TS/effect/commit/a8b0ddb84710054799fc8f57485b95d00093ada1), [`8653072`](https://github.com/Effect-TS/effect/commit/86530720d7a03e118d2c5a8bf5a997cee7e7f3d6), [`507d546`](https://github.com/Effect-TS/effect/commit/507d546bd49db31000425fb5da88c434e4291bea), [`a8b0ddb`](https://github.com/Effect-TS/effect/commit/a8b0ddb84710054799fc8f57485b95d00093ada1), [`8db239b`](https://github.com/Effect-TS/effect/commit/8db239b9c869a3707f6566b9d9dbdf53c4df03fc), [`84a0911`](https://github.com/Effect-TS/effect/commit/84a091181634c3a022c94234cec7764a3aeef1be), [`84a0911`](https://github.com/Effect-TS/effect/commit/84a091181634c3a022c94234cec7764a3aeef1be), [`3179a9f`](https://github.com/Effect-TS/effect/commit/3179a9f65d23369a6a9a1f80f7750566dd28df22), [`6cb9b76`](https://github.com/Effect-TS/effect/commit/6cb9b766396d0b2ed995cf26957359713efd202e), [`1fcbe55`](https://github.com/Effect-TS/effect/commit/1fcbe55345042d8468f6a98c84081bd00b6bcf5a), [`bd0d489`](https://github.com/Effect-TS/effect/commit/bd0d4892b098bc4c589444af9f50259c2c02ec0f), [`d9a63d9`](https://github.com/Effect-TS/effect/commit/d9a63d9d385653865954cac895065360d54cc56b), [`6cb9b76`](https://github.com/Effect-TS/effect/commit/6cb9b766396d0b2ed995cf26957359713efd202e)]:
  - @effect/experimental@0.38.0
  - effect@3.12.5
  - @effect/platform@0.74.0
  - @effect/ai@0.7.0

## 0.9.1

### Patch Changes

- Updated dependencies [[`5b50ea4`](https://github.com/Effect-TS/effect/commit/5b50ea4a10cf9acd51f9624b2474d9d5ded74019), [`c170a68`](https://github.com/Effect-TS/effect/commit/c170a68b6266100774461fcd6c0e0fabb60112f2), [`a66c2eb`](https://github.com/Effect-TS/effect/commit/a66c2eb473245092cd41f04c2eb2b7b02cf53718), [`c9e5e1b`](https://github.com/Effect-TS/effect/commit/c9e5e1be17c0c84d3d4e2abc3c60215cdb56bbbe), [`7b3d58d`](https://github.com/Effect-TS/effect/commit/7b3d58d7aec2152ec282460871d3e9de45ed254d)]:
  - effect@3.12.4
  - @effect/platform@0.73.1
  - @effect/ai@0.6.1
  - @effect/experimental@0.37.1

## 0.9.0

### Patch Changes

- Updated dependencies [[`d7dac48`](https://github.com/Effect-TS/effect/commit/d7dac48a477cdfeec509dbe9f33fce6a1b02b63d), [`c110032`](https://github.com/Effect-TS/effect/commit/c110032322450a8824ba38ae24335a538cd2ce9a), [`1d7fd2b`](https://github.com/Effect-TS/effect/commit/1d7fd2b7ee8eeecc912d27adf76ed897db236dc5), [`1d7fd2b`](https://github.com/Effect-TS/effect/commit/1d7fd2b7ee8eeecc912d27adf76ed897db236dc5), [`23ac740`](https://github.com/Effect-TS/effect/commit/23ac740c7dd4610b7d265c2071b88b0968419e9a), [`8cd7319`](https://github.com/Effect-TS/effect/commit/8cd7319b6568bfc7a30ca16c104d189e37eac3a0)]:
  - effect@3.12.3
  - @effect/platform@0.73.0
  - @effect/ai@0.6.0
  - @effect/experimental@0.37.0

## 0.8.2

### Patch Changes

- Updated dependencies [[`734af82`](https://github.com/Effect-TS/effect/commit/734af82138e78b9c57a8355b1c6b80e80d38b222), [`b63c780`](https://github.com/Effect-TS/effect/commit/b63c78010893101520448ddda7019c487cf7eedd), [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a), [`f852cb0`](https://github.com/Effect-TS/effect/commit/f852cb02040ea2f165e9b449615b8b1366add5d5), [`7276ae2`](https://github.com/Effect-TS/effect/commit/7276ae21062896adbb7508ac5b2dece95316322f), [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a), [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a), [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a), [`c640d77`](https://github.com/Effect-TS/effect/commit/c640d77b33ad417876f4e8ffe8574ee6cbe5607f), [`0def088`](https://github.com/Effect-TS/effect/commit/0def0887cfdb6755729a64dfd52b3b9f46b0576c)]:
  - effect@3.12.2
  - @effect/platform@0.72.2
  - @effect/ai@0.5.2
  - @effect/experimental@0.36.2

## 0.8.1

### Patch Changes

- Updated dependencies [[`302b57d`](https://github.com/Effect-TS/effect/commit/302b57d2cbf9b9ccc17450945aeebfb33cfe8d43), [`0988083`](https://github.com/Effect-TS/effect/commit/0988083d4594938590df5a287e5b27d38526dd07), [`8b46be6`](https://github.com/Effect-TS/effect/commit/8b46be6a3b8160362ab5ea9171c5e6932505125c), [`bfe8027`](https://github.com/Effect-TS/effect/commit/bfe802734b450a4b4ee069d1125dd37995db2bff), [`16dd657`](https://github.com/Effect-TS/effect/commit/16dd657033d8afac2ffea567b3c8bb27c9b249b6), [`39db211`](https://github.com/Effect-TS/effect/commit/39db211414e90c8db8fdad7dc8ce5b4661bcfaef)]:
  - effect@3.12.1
  - @effect/ai@0.5.1
  - @effect/experimental@0.36.1
  - @effect/platform@0.72.1

## 0.8.0

### Patch Changes

- Updated dependencies [[`abb22a4`](https://github.com/Effect-TS/effect/commit/abb22a429b9c52c31e84856294f175d2064a9b4d), [`f369a89`](https://github.com/Effect-TS/effect/commit/f369a89e98bc682969803b9304adaf4557bb36c2), [`642376c`](https://github.com/Effect-TS/effect/commit/642376c63fd7d78754db991631a4d50a5dc79aa3), [`3d2b7a7`](https://github.com/Effect-TS/effect/commit/3d2b7a7e942a7157afae5b1cdbc6f3fef116428e), [`ef64c6f`](https://github.com/Effect-TS/effect/commit/ef64c6fec0d47da573c04230dde9ea729366d871), [`73f9c6f`](https://github.com/Effect-TS/effect/commit/73f9c6f2ff091512cf904cc54ab59965b86e87c8), [`17cb451`](https://github.com/Effect-TS/effect/commit/17cb4514590e8a86263f7aed009f24da8a237342), [`d801820`](https://github.com/Effect-TS/effect/commit/d80182060c2ee945d7e0e4728812abf9465a0d6a), [`e1eeb2d`](https://github.com/Effect-TS/effect/commit/e1eeb2d7064b3870041dab142f3057970699bbf1), [`c11f3a6`](https://github.com/Effect-TS/effect/commit/c11f3a60a05c3b5fc8e7ce90136728154dc505b0), [`618f7e0`](https://github.com/Effect-TS/effect/commit/618f7e092a1011e5090dca1e69b5e9285689654b), [`c0ba834`](https://github.com/Effect-TS/effect/commit/c0ba834d1995cf5a8b250e4780fd43f3e3881151), [`e1eeb2d`](https://github.com/Effect-TS/effect/commit/e1eeb2d7064b3870041dab142f3057970699bbf1)]:
  - effect@3.12.0
  - @effect/platform@0.72.0
  - @effect/ai@0.5.0
  - @effect/experimental@0.36.0

## 0.7.3

### Patch Changes

- Updated dependencies [[`39457d4`](https://github.com/Effect-TS/effect/commit/39457d4897d9bc7df8af5c05d352866bbeae82eb), [`a475cc2`](https://github.com/Effect-TS/effect/commit/a475cc25fd7c9f26b27a8e98f8fbe43cc9e6ee3e), [`199214e`](https://github.com/Effect-TS/effect/commit/199214e21c616d8a0ccd7ed5f92e944e6c580193), [`b3c160d`](https://github.com/Effect-TS/effect/commit/b3c160d7a1fdfc2d3fb2440530f1ab80efc65133)]:
  - effect@3.11.10
  - @effect/ai@0.4.8
  - @effect/experimental@0.35.3
  - @effect/platform@0.71.7

## 0.7.2

### Patch Changes

- Updated dependencies [[`1c08a0b`](https://github.com/Effect-TS/effect/commit/1c08a0b8505badcffb4d9cade5a746ea90c9557e), [`1ce703b`](https://github.com/Effect-TS/effect/commit/1ce703b041bbd7560c5c437c9b9be48f027937fd), [`1ce703b`](https://github.com/Effect-TS/effect/commit/1ce703b041bbd7560c5c437c9b9be48f027937fd)]:
  - effect@3.11.9
  - @effect/ai@0.4.7
  - @effect/experimental@0.35.2
  - @effect/platform@0.71.6

## 0.7.1

### Patch Changes

- Updated dependencies [[`05d71f8`](https://github.com/Effect-TS/effect/commit/05d71f85622305705d8316817694a09762e60865), [`e66b920`](https://github.com/Effect-TS/effect/commit/e66b9205f25ab425d30640886eb3fb2c4715bc26)]:
  - @effect/platform@0.71.5
  - @effect/ai@0.4.6
  - @effect/experimental@0.35.1

## 0.7.0

### Patch Changes

- Updated dependencies [[`909181a`](https://github.com/Effect-TS/effect/commit/909181a9ce9052a80432ccf52187e0723004bf7f), [`909181a`](https://github.com/Effect-TS/effect/commit/909181a9ce9052a80432ccf52187e0723004bf7f), [`1a6b52d`](https://github.com/Effect-TS/effect/commit/1a6b52dcf020d36e38a7bc90b648152cf5a8ccba)]:
  - @effect/platform@0.71.4
  - effect@3.11.8
  - @effect/ai@0.4.5
  - @effect/experimental@0.35.0

## 0.6.4

### Patch Changes

- Updated dependencies [[`6984508`](https://github.com/Effect-TS/effect/commit/6984508c87f1bd91213b44c19b25ab5e2dcc1ce0), [`883639c`](https://github.com/Effect-TS/effect/commit/883639cc8ce47757f1cd39439391a8028c0812fe)]:
  - @effect/platform@0.71.3
  - @effect/ai@0.4.4
  - @effect/experimental@0.34.3

## 0.6.3

### Patch Changes

- Updated dependencies [[`1237ae8`](https://github.com/Effect-TS/effect/commit/1237ae847f6f0ff57eb7dcb4723ae6f5073fb925)]:
  - @effect/ai@0.4.3

## 0.6.2

### Patch Changes

- Updated dependencies [[`2408616`](https://github.com/Effect-TS/effect/commit/24086163b60b09cc6d0885bd565ef080dcbe866b), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`8d978c5`](https://github.com/Effect-TS/effect/commit/8d978c53f6fcc98d9d645ecba3e4b55d4297dd36), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e)]:
  - effect@3.11.7
  - @effect/platform@0.71.2
  - @effect/ai@0.4.2
  - @effect/experimental@0.34.2

## 0.6.1

### Patch Changes

- Updated dependencies [[`1d3df5b`](https://github.com/Effect-TS/effect/commit/1d3df5bc4324e88a392c348db35fd9d029c7b25e)]:
  - @effect/platform@0.71.1
  - @effect/ai@0.4.1
  - @effect/experimental@0.34.1

## 0.6.0

### Patch Changes

- Updated dependencies [[`662d1ce`](https://github.com/Effect-TS/effect/commit/662d1ce6fb7da384a95888d5b2bb5605bdf3208d), [`c99a0f3`](https://github.com/Effect-TS/effect/commit/c99a0f376d049d3793ed33e146d9873b8a5e5b78), [`11fc401`](https://github.com/Effect-TS/effect/commit/11fc401f436f99bf4be95f56d50b0e4bdfe5edea), [`c99a0f3`](https://github.com/Effect-TS/effect/commit/c99a0f376d049d3793ed33e146d9873b8a5e5b78), [`31c62d8`](https://github.com/Effect-TS/effect/commit/31c62d83cbdcf9850a8b5331faa239601c60f78a)]:
  - effect@3.11.6
  - @effect/platform@0.71.0
  - @effect/ai@0.4.0
  - @effect/experimental@0.34.0

## 0.5.7

### Patch Changes

- Updated dependencies [[`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`ef70ffc`](https://github.com/Effect-TS/effect/commit/ef70ffc417ec035ede40c62b7316e447cc7c1932), [`22905cf`](https://github.com/Effect-TS/effect/commit/22905cf5addfb1ff3d2a6135c52036be958ae911), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`1e59e4f`](https://github.com/Effect-TS/effect/commit/1e59e4fd778da18296812a2a32f36ca8ae50f60d), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`8d914e5`](https://github.com/Effect-TS/effect/commit/8d914e504e7a22d0ea628e8af265ee450ff9530f), [`03bb00f`](https://github.com/Effect-TS/effect/commit/03bb00faa74f9e168a54a8cc0828a664fbb1ab05), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`14e1149`](https://github.com/Effect-TS/effect/commit/14e1149f1af5a022f06eb8c2e4ba9fec17fe7426), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8)]:
  - effect@3.11.5
  - @effect/experimental@0.33.7
  - @effect/platform@0.70.7
  - @effect/ai@0.3.7

## 0.5.6

### Patch Changes

- Updated dependencies [[`9a5b8e3`](https://github.com/Effect-TS/effect/commit/9a5b8e36d184bd4967a88752cb6e755e1be263af)]:
  - @effect/platform@0.70.6
  - @effect/ai@0.3.6
  - @effect/experimental@0.33.6

## 0.5.5

### Patch Changes

- Updated dependencies [[`415f4c9`](https://github.com/Effect-TS/effect/commit/415f4c98321868531727a83cbaad70164f5e4c40), [`518b258`](https://github.com/Effect-TS/effect/commit/518b258a8a67ecd332a9252c35cc060f8368dee2), [`6e323a3`](https://github.com/Effect-TS/effect/commit/6e323a36faaee46b328c8e3cf60a76b3aff9907f), [`518b258`](https://github.com/Effect-TS/effect/commit/518b258a8a67ecd332a9252c35cc060f8368dee2), [`6e323a3`](https://github.com/Effect-TS/effect/commit/6e323a36faaee46b328c8e3cf60a76b3aff9907f)]:
  - @effect/platform@0.70.5
  - effect@3.11.4
  - @effect/experimental@0.33.5
  - @effect/ai@0.3.5

## 0.5.4

### Patch Changes

- Updated dependencies [[`90906f7`](https://github.com/Effect-TS/effect/commit/90906f7f154b12c7182e8f39e3c55ef3937db857), [`3862cd3`](https://github.com/Effect-TS/effect/commit/3862cd3c7f6a542ed65fb81255b3bd696ce2f567), [`3862cd3`](https://github.com/Effect-TS/effect/commit/3862cd3c7f6a542ed65fb81255b3bd696ce2f567), [`343b6aa`](https://github.com/Effect-TS/effect/commit/343b6aa6ac4a74276bfc7c63ccbf4a1d72bc1bed), [`afba339`](https://github.com/Effect-TS/effect/commit/afba339adc11dad56b5a3b7ca94487e58f34d613)]:
  - effect@3.11.3
  - @effect/ai@0.3.4
  - @effect/experimental@0.33.4
  - @effect/platform@0.70.4

## 0.5.3

### Patch Changes

- [#4071](https://github.com/Effect-TS/effect/pull/4071) [`da3a607`](https://github.com/Effect-TS/effect/commit/da3a607bea16d4f08c5937cadfde0447c4123f40) Thanks @tim-smart! - use openai response_format for structured completions

- Updated dependencies [[`7044730`](https://github.com/Effect-TS/effect/commit/70447306be1aeeb7d87c230b2a96ec87b993ede9), [`da3a607`](https://github.com/Effect-TS/effect/commit/da3a607bea16d4f08c5937cadfde0447c4123f40)]:
  - @effect/platform@0.70.3
  - @effect/ai@0.3.3
  - @effect/experimental@0.33.3

## 0.5.2

### Patch Changes

- Updated dependencies [[`01cee56`](https://github.com/Effect-TS/effect/commit/01cee560b58d94b24cc20e98083251b73e658b41), [`c2249ea`](https://github.com/Effect-TS/effect/commit/c2249ea13fd98ab7d9aa628787931356d8ec2860), [`1358aa5`](https://github.com/Effect-TS/effect/commit/1358aa5326eaa85ef13ee8d1fed0b4a4288ed3eb), [`1de3fe7`](https://github.com/Effect-TS/effect/commit/1de3fe7d1cbafd6391eaa38c2300b99e332cc2aa)]:
  - effect@3.11.2
  - @effect/platform@0.70.2
  - @effect/ai@0.3.2
  - @effect/experimental@0.33.2

## 0.5.1

### Patch Changes

- Updated dependencies [[`dd8a2d8`](https://github.com/Effect-TS/effect/commit/dd8a2d8e80d33b16719fc69361eaedf0b59d4620), [`a71bfef`](https://github.com/Effect-TS/effect/commit/a71bfef46f5061bb2502a61a333638a987b62273)]:
  - effect@3.11.1
  - @effect/ai@0.3.1
  - @effect/experimental@0.33.1
  - @effect/platform@0.70.1

## 0.5.0

### Patch Changes

- Updated dependencies [[`147434b`](https://github.com/Effect-TS/effect/commit/147434b03d5e1fd692dd9f126e5ab0910f3b76d3), [`6e69493`](https://github.com/Effect-TS/effect/commit/6e694930048bbaf98110f35f41566aeb9752d471), [`147434b`](https://github.com/Effect-TS/effect/commit/147434b03d5e1fd692dd9f126e5ab0910f3b76d3), [`5eff3f6`](https://github.com/Effect-TS/effect/commit/5eff3f6fa3aae7e86948a62cbfd63b8d6c3bdf92), [`d9fe79b`](https://github.com/Effect-TS/effect/commit/d9fe79bb5a3fe105d8e7a3bc2922a8ad936a5d10), [`251d189`](https://github.com/Effect-TS/effect/commit/251d189420bbba71990574e91098c499065f9a9b), [`5a259f3`](https://github.com/Effect-TS/effect/commit/5a259f3711b4369f55d885b568bdb21136155261), [`b4ce4ea`](https://github.com/Effect-TS/effect/commit/b4ce4ea7fd514a7e572f2dcd879c98f334981b0e), [`15fcc5a`](https://github.com/Effect-TS/effect/commit/15fcc5a0ea4bbf40ab48fa6a04fdda74f76f4c07), [`9bc9a47`](https://github.com/Effect-TS/effect/commit/9bc9a476800dc645903c888a68bb1d3baa3383c6), [`aadb8a4`](https://github.com/Effect-TS/effect/commit/aadb8a48d2cba197c06ec9996505510e48e4e5cb), [`1e2747c`](https://github.com/Effect-TS/effect/commit/1e2747c63a4820d1459cbbc88c71212983bd68bd), [`9264162`](https://github.com/Effect-TS/effect/commit/9264162a82783a651776fb7b87604564a63e7070), [`e0b9b09`](https://github.com/Effect-TS/effect/commit/e0b9b09e70c386b2da17d1f0a15b0511861c89e8), [`c36f3b9`](https://github.com/Effect-TS/effect/commit/c36f3b95df5ce9d71b66f22f26ce12eda8d3e848), [`672bde5`](https://github.com/Effect-TS/effect/commit/672bde5bec51c7d6f9862828e6a654cb2cb6f93d), [`aadb8a4`](https://github.com/Effect-TS/effect/commit/aadb8a48d2cba197c06ec9996505510e48e4e5cb)]:
  - effect@3.11.0
  - @effect/platform@0.70.0
  - @effect/ai@0.3.0
  - @effect/experimental@0.33.0

## 0.4.17

### Patch Changes

- Updated dependencies [[`3069614`](https://github.com/Effect-TS/effect/commit/30696149271129fc618f6f2ccd1d8f2f6c0f9cd7), [`09a5e52`](https://github.com/Effect-TS/effect/commit/09a5e522fd9b221f05d85b1d1c8a740d4973c302)]:
  - effect@3.10.20
  - @effect/ai@0.2.32
  - @effect/experimental@0.32.17
  - @effect/platform@0.69.32

## 0.4.16

### Patch Changes

- Updated dependencies [[`e6d4a37`](https://github.com/Effect-TS/effect/commit/e6d4a37c1d7e657b5ea44063a1cf586808228fe5)]:
  - @effect/platform@0.69.31
  - @effect/experimental@0.32.16
  - @effect/ai@0.2.31

## 0.4.15

### Patch Changes

- Updated dependencies [[`5e17400`](https://github.com/Effect-TS/effect/commit/5e1740017cb97026e7f583c5fe71847c606df388)]:
  - @effect/experimental@0.32.15

## 0.4.14

### Patch Changes

- Updated dependencies [[`270f199`](https://github.com/Effect-TS/effect/commit/270f199b31810fd643e4c22818698adcbdb5d396)]:
  - @effect/platform@0.69.30
  - @effect/experimental@0.32.14
  - @effect/ai@0.2.30

## 0.4.13

### Patch Changes

- Updated dependencies [[`e9dfea3`](https://github.com/Effect-TS/effect/commit/e9dfea3f394444ebd8929e5cfe05ce740cf84d6e), [`24cc35e`](https://github.com/Effect-TS/effect/commit/24cc35e26d6ed4a076470bc687ffd99cc50991b3)]:
  - @effect/experimental@0.32.13
  - @effect/platform@0.69.29
  - @effect/ai@0.2.29

## 0.4.12

### Patch Changes

- Updated dependencies [[`edd72be`](https://github.com/Effect-TS/effect/commit/edd72be57b904d60c9cbffc2537901821a9da537), [`a3e2771`](https://github.com/Effect-TS/effect/commit/a3e277170a1f7cf61fd629acb60304c7e81d9498), [`944025b`](https://github.com/Effect-TS/effect/commit/944025bc5ce139f4a85846aa689bf30ec06a8ec1), [`54addee`](https://github.com/Effect-TS/effect/commit/54addee438a644bf010646c52042c7b89c5fc0a7), [`a9e00e4`](https://github.com/Effect-TS/effect/commit/a9e00e43f0b5dd22c1f9d5b78be6383daea09c20)]:
  - @effect/platform@0.69.28
  - @effect/experimental@0.32.12
  - effect@3.10.19
  - @effect/ai@0.2.28

## 0.4.11

### Patch Changes

- Updated dependencies [[`af409cf`](https://github.com/Effect-TS/effect/commit/af409cf1d2ff973be11cc079ea373eaeedca25de), [`beaccae`](https://github.com/Effect-TS/effect/commit/beaccae2d15931e9fe475fb50a0b3638243fe3f7)]:
  - effect@3.10.18
  - @effect/platform@0.69.27
  - @effect/ai@0.2.27
  - @effect/experimental@0.32.11

## 0.4.10

### Patch Changes

- Updated dependencies [[`c963886`](https://github.com/Effect-TS/effect/commit/c963886d5817986fcbd6bfa4ddf50aca8b6c8184), [`42c4ce6`](https://github.com/Effect-TS/effect/commit/42c4ce6f8d8c7d847e97757650a8ad9419a829d7)]:
  - @effect/platform@0.69.26
  - effect@3.10.17
  - @effect/ai@0.2.26
  - @effect/experimental@0.32.10

## 0.4.9

### Patch Changes

- Updated dependencies [[`320557a`](https://github.com/Effect-TS/effect/commit/320557ab18d13c5e22fc7dc0d2a157eae461012f), [`4dca30c`](https://github.com/Effect-TS/effect/commit/4dca30cfcdafe4542e236489f71d6f171a5b4e38), [`1d99867`](https://github.com/Effect-TS/effect/commit/1d998671be3cd11043f232822e91dd8c98fccfa9), [`6dae414`](https://github.com/Effect-TS/effect/commit/6dae4147991a97ec14a99289bd25fadae7541e8d), [`6b0d737`](https://github.com/Effect-TS/effect/commit/6b0d737078bf63b97891e6bc47affc04b28f9cf7), [`d8356aa`](https://github.com/Effect-TS/effect/commit/d8356aad428a0c2290db52380220f81d9ec94232), [`7b93dd6`](https://github.com/Effect-TS/effect/commit/7b93dd622e2ab79c7072d79d0d9611e446202201)]:
  - @effect/platform@0.69.25
  - effect@3.10.16
  - @effect/ai@0.2.25
  - @effect/experimental@0.32.9

## 0.4.8

### Patch Changes

- [#3949](https://github.com/Effect-TS/effect/pull/3949) [`52c4b89`](https://github.com/Effect-TS/effect/commit/52c4b89da69fa88a0fb2debe038c009c19b34573) Thanks @tim-smart! - add transformClient option to OpenAiClient layer

- Updated dependencies [[`3cc6514`](https://github.com/Effect-TS/effect/commit/3cc6514d2dd64e010cb760cc29bfce98c349bb10)]:
  - @effect/platform@0.69.24
  - @effect/ai@0.2.24
  - @effect/experimental@0.32.8

## 0.4.7

### Patch Changes

- Updated dependencies [[`3aff4d3`](https://github.com/Effect-TS/effect/commit/3aff4d38837c213bb2987973dc4b98febb9f92d2)]:
  - @effect/platform@0.69.23
  - @effect/ai@0.2.23
  - @effect/experimental@0.32.7

## 0.4.6

### Patch Changes

- Updated dependencies [[`8398b32`](https://github.com/Effect-TS/effect/commit/8398b3208242a88239d4449910b7baf923cfe3b6), [`4e9e256`](https://github.com/Effect-TS/effect/commit/4e9e256e9f0b4a9e9b202d3bb703b5a4622e75cb), [`72e55b7`](https://github.com/Effect-TS/effect/commit/72e55b7c610784fcebdbadc592c876e23e76a986)]:
  - effect@3.10.15
  - @effect/experimental@0.32.6
  - @effect/ai@0.2.22
  - @effect/platform@0.69.22

## 0.4.5

### Patch Changes

- Updated dependencies [[`f983946`](https://github.com/Effect-TS/effect/commit/f9839467b4cad6e788297764ef9f9f0b9fd203f9), [`2d8a750`](https://github.com/Effect-TS/effect/commit/2d8a75081eb83a0a81f817fdf6f428369c5064ab)]:
  - effect@3.10.14
  - @effect/ai@0.2.21
  - @effect/experimental@0.32.5
  - @effect/platform@0.69.21

## 0.4.4

### Patch Changes

- [#3916](https://github.com/Effect-TS/effect/pull/3916) [`72b0272`](https://github.com/Effect-TS/effect/commit/72b02726d62000756577464273c0dd0876cbe0b5) Thanks @tim-smart! - use effect/JSONSchema for effect/ai & allow http client transforms

- Updated dependencies [[`72b0272`](https://github.com/Effect-TS/effect/commit/72b02726d62000756577464273c0dd0876cbe0b5), [`995bbdf`](https://github.com/Effect-TS/effect/commit/995bbdffea2e332f203cd5b474cd6a1c77dfa6ae)]:
  - @effect/ai@0.2.20
  - effect@3.10.13
  - @effect/experimental@0.32.4
  - @effect/platform@0.69.20

## 0.4.3

### Patch Changes

- Updated dependencies [[`eb8c52d`](https://github.com/Effect-TS/effect/commit/eb8c52d8b4c5e067ebf0a81eb742f5822e6439b5)]:
  - @effect/platform@0.69.19
  - @effect/experimental@0.32.3
  - @effect/ai@0.2.19

## 0.4.2

### Patch Changes

- Updated dependencies [[`a0584ec`](https://github.com/Effect-TS/effect/commit/a0584ece92ed784bfb139e9c5a699f02d1e71c2d), [`dd14efe`](https://github.com/Effect-TS/effect/commit/dd14efe0ace255f571273aae876adea96267d7e6), [`dd14efe`](https://github.com/Effect-TS/effect/commit/dd14efe0ace255f571273aae876adea96267d7e6)]:
  - @effect/platform@0.69.18
  - effect@3.10.12
  - @effect/ai@0.2.18
  - @effect/experimental@0.32.2

## 0.4.1

### Patch Changes

- Updated dependencies [[`5eef499`](https://github.com/Effect-TS/effect/commit/5eef4998b6ccb7a5404d9e4fef85e57fa35fbb8a), [`8240b1c`](https://github.com/Effect-TS/effect/commit/8240b1c10d45312fc863cb679b1a1e8441af0c1a), [`5eef499`](https://github.com/Effect-TS/effect/commit/5eef4998b6ccb7a5404d9e4fef85e57fa35fbb8a)]:
  - effect@3.10.11
  - @effect/platform@0.69.17
  - @effect/ai@0.2.17
  - @effect/experimental@0.32.1

## 0.4.0

### Patch Changes

- Updated dependencies [[`12b3275`](https://github.com/Effect-TS/effect/commit/12b32753afbf252d156ff613f9e88662b160a7e5)]:
  - @effect/experimental@0.32.0

## 0.3.0

### Patch Changes

- Updated dependencies [[`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`b631f40`](https://github.com/Effect-TS/effect/commit/b631f40abbe649b2a089764585b5c39f6a695ac6), [`7d89650`](https://github.com/Effect-TS/effect/commit/7d8965036cd2ea435c8441ffec3345488baebf85)]:
  - @effect/experimental@0.31.0
  - effect@3.10.10
  - @effect/platform@0.69.16
  - @effect/ai@0.2.16

## 0.2.16

### Patch Changes

- Updated dependencies [[`8a30e1d`](https://github.com/Effect-TS/effect/commit/8a30e1dfa3a7103bf5414fc6a7fca3088d8c8c00)]:
  - @effect/platform@0.69.15
  - @effect/experimental@0.30.16
  - @effect/ai@0.2.15

## 0.2.15

### Patch Changes

- Updated dependencies [[`a123e80`](https://github.com/Effect-TS/effect/commit/a123e80f111a625428a5b5622b7f55ee1073566b), [`bd5fcd3`](https://github.com/Effect-TS/effect/commit/bd5fcd3e6b603b1e505af90d6a00627c8eca6d41), [`0289d3b`](https://github.com/Effect-TS/effect/commit/0289d3b6391031d00329365bab9791b355031fe3), [`7386b71`](https://github.com/Effect-TS/effect/commit/7386b710e5be570e17f468928a6ed19d549a3e12), [`07c493a`](https://github.com/Effect-TS/effect/commit/07c493a598e096c7810cd06def8cfa43493c46b1), [`257ab1b`](https://github.com/Effect-TS/effect/commit/257ab1b539fa6e930b7ae2583a188376372200d7), [`4211a23`](https://github.com/Effect-TS/effect/commit/4211a2355bb3af3f0e756e2aae9d293379f25662)]:
  - effect@3.10.9
  - @effect/platform@0.69.14
  - @effect/experimental@0.30.15
  - @effect/ai@0.2.14

## 0.2.14

### Patch Changes

- Updated dependencies [[`6f86821`](https://github.com/Effect-TS/effect/commit/6f8682184ac7a7e8eec61c93b028af034c2c7254), [`68b5c9e`](https://github.com/Effect-TS/effect/commit/68b5c9e44f34192cef26e1cadda5e661a027df41), [`9c9928d`](https://github.com/Effect-TS/effect/commit/9c9928dfeacd9ac33dc37eb0ca3d7d8c39175ada), [`6306e66`](https://github.com/Effect-TS/effect/commit/6306e6656092b350d4ede5746da6f245ec9f7e07), [`361c7f3`](https://github.com/Effect-TS/effect/commit/361c7f39a2c10ede9324847c3d3ba192a6f9b20a)]:
  - @effect/experimental@0.30.14
  - effect@3.10.8
  - @effect/ai@0.2.13
  - @effect/platform@0.69.13

## 0.2.13

### Patch Changes

- Updated dependencies [[`33f5b9f`](https://github.com/Effect-TS/effect/commit/33f5b9ffaebea4f1bd0e391b44c41fb6230e743a), [`50f0281`](https://github.com/Effect-TS/effect/commit/50f0281b0d2116726b8927a6217622d5f394f3e4)]:
  - effect@3.10.7
  - @effect/ai@0.2.12
  - @effect/experimental@0.30.13
  - @effect/platform@0.69.12

## 0.2.12

### Patch Changes

- Updated dependencies [[`ce1c21f`](https://github.com/Effect-TS/effect/commit/ce1c21ffc11902ac9ab453a51904207859d38552), [`81ddd45`](https://github.com/Effect-TS/effect/commit/81ddd45fc074b98206fafab416d9a5a28b31e07a)]:
  - effect@3.10.6
  - @effect/platform@0.69.11
  - @effect/ai@0.2.11
  - @effect/experimental@0.30.12

## 0.2.11

### Patch Changes

- [#3854](https://github.com/Effect-TS/effect/pull/3854) [`b521577`](https://github.com/Effect-TS/effect/commit/b521577501370e34b0672cc7a69291c7e8670c6f) Thanks @tim-smart! - update OpenAI schemas

- Updated dependencies [[`3a6d757`](https://github.com/Effect-TS/effect/commit/3a6d757badeebe00d8ef4d67530d073c8264dcfa), [`59d813a`](https://github.com/Effect-TS/effect/commit/59d813aa4973d1115cfc70cc3667508335f49693)]:
  - effect@3.10.5
  - @effect/ai@0.2.10
  - @effect/experimental@0.30.11
  - @effect/platform@0.69.10

## 0.2.10

### Patch Changes

- Updated dependencies [[`2367708`](https://github.com/Effect-TS/effect/commit/2367708be449f9526a2047e321302d7bfb16f18e)]:
  - @effect/platform@0.69.9
  - effect@3.10.4
  - @effect/ai@0.2.9
  - @effect/experimental@0.30.10

## 0.2.9

### Patch Changes

- Updated dependencies [[`522f7c5`](https://github.com/Effect-TS/effect/commit/522f7c518a5acfb55ef96d6796869f002cc3eaf8)]:
  - @effect/platform@0.69.8
  - @effect/ai@0.2.8
  - @effect/experimental@0.30.9

## 0.2.8

### Patch Changes

- Updated dependencies [[`690d6c5`](https://github.com/Effect-TS/effect/commit/690d6c54d2145adb0af545c447db7d4755bf3c6b), [`b9423d8`](https://github.com/Effect-TS/effect/commit/b9423d8bf8181a2389fdbce1e3c14ac6fe8d54f5), [`279fe3a`](https://github.com/Effect-TS/effect/commit/279fe3a7168fe84e520c2cc88ba189a15f03a2bc)]:
  - @effect/platform@0.69.7
  - effect@3.10.3
  - @effect/ai@0.2.7
  - @effect/experimental@0.30.8

## 0.2.7

### Patch Changes

- Updated dependencies [[`714e119`](https://github.com/Effect-TS/effect/commit/714e11945e45e5a2554ee058e6c43f82a8e309cf), [`c1afd55`](https://github.com/Effect-TS/effect/commit/c1afd55c54e61f9c432823d21b3d016f79160a37), [`42cd72a`](https://github.com/Effect-TS/effect/commit/42cd72a44ca9593e4d81fbb50e8111625fd0fb81)]:
  - effect@3.10.2
  - @effect/platform@0.69.6
  - @effect/ai@0.2.6
  - @effect/experimental@0.30.7

## 0.2.6

### Patch Changes

- Updated dependencies [[`9604d6b`](https://github.com/Effect-TS/effect/commit/9604d6b616435103dafea8b53637a9d1450b4750), [`9604d6b`](https://github.com/Effect-TS/effect/commit/9604d6b616435103dafea8b53637a9d1450b4750)]:
  - @effect/experimental@0.30.6
  - effect@3.10.1
  - @effect/ai@0.2.5
  - @effect/platform@0.69.5

## 0.2.5

### Patch Changes

- Updated dependencies [[`c86b1d7`](https://github.com/Effect-TS/effect/commit/c86b1d7cd47b66df190ef9775a475467c1abdbd6)]:
  - @effect/platform@0.69.4
  - @effect/ai@0.2.4
  - @effect/experimental@0.30.5

## 0.2.4

### Patch Changes

- Updated dependencies [[`d5fba63`](https://github.com/Effect-TS/effect/commit/d5fba6391e1005e374aa0238f13edfbd65848313), [`1eb2c30`](https://github.com/Effect-TS/effect/commit/1eb2c30ba064398db5790e376dedcfad55b7b005), [`02d413e`](https://github.com/Effect-TS/effect/commit/02d413e7b6bc1c64885969c37cc3e4e690c94d7d)]:
  - @effect/platform@0.69.3
  - @effect/ai@0.2.3
  - @effect/experimental@0.30.4

## 0.2.3

### Patch Changes

- Updated dependencies [[`e7afc47`](https://github.com/Effect-TS/effect/commit/e7afc47ce83e381c3f4aed2b2974e3b3d86a2340)]:
  - @effect/platform@0.69.2
  - @effect/ai@0.2.2
  - @effect/experimental@0.30.3

## 0.2.2

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.30.2

## 0.2.1

### Patch Changes

- Updated dependencies [[`7564f56`](https://github.com/Effect-TS/effect/commit/7564f56bb2844cf39d2b0d2d9e93cf9b2205e9a8), [`7564f56`](https://github.com/Effect-TS/effect/commit/7564f56bb2844cf39d2b0d2d9e93cf9b2205e9a8)]:
  - @effect/platform@0.69.1
  - @effect/ai@0.2.1
  - @effect/experimental@0.30.1

## 0.2.0

### Patch Changes

- Updated dependencies [[`4a01828`](https://github.com/Effect-TS/effect/commit/4a01828b66d6213e9bbe18979c893b13f7bb29bf), [`6d9de6b`](https://github.com/Effect-TS/effect/commit/6d9de6b871c5c08e6509a4e830c3d74758faa198), [`4a01828`](https://github.com/Effect-TS/effect/commit/4a01828b66d6213e9bbe18979c893b13f7bb29bf), [`c79c4c1`](https://github.com/Effect-TS/effect/commit/c79c4c178390fe61ff6dda88c9e058862349343a), [`38d30f0`](https://github.com/Effect-TS/effect/commit/38d30f08b8da62f9c3e308b9250738cb8d17bdb5), [`5821ce3`](https://github.com/Effect-TS/effect/commit/5821ce3455b47d25e0a40cae6ce22af9db5fa556)]:
  - effect@3.10.0
  - @effect/platform@0.69.0
  - @effect/experimental@0.30.0
  - @effect/ai@0.2.0

## 0.1.4

### Patch Changes

- Updated dependencies [[`382556f`](https://github.com/Effect-TS/effect/commit/382556f8930780c0634de681077706113a8c8239), [`97cb014`](https://github.com/Effect-TS/effect/commit/97cb0145114b2cd2f378e98f6c4ff5bf2c1865f5)]:
  - @effect/schema@0.75.5
  - @effect/ai@0.1.4
  - @effect/experimental@0.29.6
  - @effect/platform@0.68.6

## 0.1.3

### Patch Changes

- Updated dependencies [[`2036402`](https://github.com/Effect-TS/effect/commit/20364020b8b75a684791aa93d90626758023e9e9)]:
  - @effect/platform@0.68.5
  - @effect/ai@0.1.3
  - @effect/experimental@0.29.5

## 0.1.2

### Patch Changes

- Updated dependencies [[`1b1ef29`](https://github.com/Effect-TS/effect/commit/1b1ef29ae302322f69dc938f9337aa97b4c63266)]:
  - @effect/platform@0.68.4
  - @effect/ai@0.1.2
  - @effect/experimental@0.29.4

## 0.1.1

### Patch Changes

- Updated dependencies [[`61a99b2`](https://github.com/Effect-TS/effect/commit/61a99b2bf9d757870ef0c2ec9d4c877cdd364a3d), [`8c33087`](https://github.com/Effect-TS/effect/commit/8c330879425e80bed2f65e407cd59e991f0d7bec)]:
  - effect@3.9.2
  - @effect/platform@0.68.3
  - @effect/ai@0.1.1
  - @effect/experimental@0.29.3
  - @effect/schema@0.75.4

## 0.1.0

### Minor Changes

- [#3631](https://github.com/Effect-TS/effect/pull/3631) [`bd160a4`](https://github.com/Effect-TS/effect/commit/bd160a4f714b0f1cb5867e458fd70f9131b060d6) Thanks @tim-smart! - add @effect/ai packages

  Experimental modules for working with LLMs, currently only from OpenAI.

### Patch Changes

- Updated dependencies [[`bd160a4`](https://github.com/Effect-TS/effect/commit/bd160a4f714b0f1cb5867e458fd70f9131b060d6), [`bd160a4`](https://github.com/Effect-TS/effect/commit/bd160a4f714b0f1cb5867e458fd70f9131b060d6), [`360ec14`](https://github.com/Effect-TS/effect/commit/360ec14dd4102c526aef7433a8881ad4d9beab75)]:
  - @effect/experimental@0.29.2
  - @effect/ai@0.1.0
  - @effect/schema@0.75.3
  - @effect/platform@0.68.2

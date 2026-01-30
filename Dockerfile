FROM public.ecr.aws/x8v8d7g8/mars-base:latest
WORKDIR /app
COPY . .

ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
ENV PNPM_CONFIG_REGISTRY=https://registry.npmjs.org/

RUN printf "registry=https://registry.npmjs.org/\n@effect:registry=https://registry.npmjs.org/\nalways-auth=false\n" > /root/.npmrc \
    && printf "registry=https://registry.npmjs.org/\n@effect:registry=https://registry.npmjs.org/\nalways-auth=false\n" > /app/.npmrc

RUN pnpm config set registry https://registry.npmjs.org/ \
    && pnpm config set @effect:registry https://registry.npmjs.org/ \
    && pnpm config set always-auth false

RUN pnpm -r --filter "./packages/**" --filter=!./ install --frozen-lockfile
CMD ["/bin/bash"]

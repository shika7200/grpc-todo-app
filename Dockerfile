FROM oven/bun

WORKDIR /app

COPY package.json .
COPY bun.lockb .

RUN bun install 

COPY .env .env
COPY src src
COPY proto proto
COPY drizzle drizzle
COPY drizzle.config.ts .
COPY tsconfig.json .

# 🟢 Выполняем миграции при запуске, когда контейнер уже в сети
CMD ["sh", "-c", "bunx drizzle-kit migrate --config=drizzle.config.ts && bun run src/index.ts"]

EXPOSE 3000 50051

import { Elysia, t } from "elysia";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { loadPackageDefinition, Server, ServerCredentials } from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";
import { todos } from "./db/schema";
import { eq } from "drizzle-orm";
import 'dotenv/config';

// Подключение к PostgreSQL через Drizzle ORM
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Запуск gRPC сервера
function startGrpcServer() {
  const PROTO_PATH = "./proto/todo.proto";
  const packageDefinition = loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const protoDescriptor = loadPackageDefinition(packageDefinition) as any;
  const todoPackage = protoDescriptor.todo;

  async function createTodo(call: any, callback: any) {
    const { title, description } = call.request;
    const [newTodo] = await db
      .insert(todos)
      .values({ title, description })
      .returning();
    callback(null, newTodo);
  }

  async function listTodos(call: any, callback: any) {
    const allTodos = await db.select().from(todos);
    callback(null, { todos: allTodos });
  }

  const grpcServer = new Server();
  grpcServer.addService(todoPackage.TodoService.service, { createTodo, listTodos });

  grpcServer.bindAsync("0.0.0.0:50051", ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error("Ошибка запуска gRPC сервера:", err);
      return;
    }

    grpcServer.start(); // <- Запускаем сервер
    console.log("gRPC сервер запущен на порту", port);
  });
}

// Запуск HTTP-сервера Elysia с CRUD эндпоинтами
function startHttpServer() {
  const app = new Elysia()
    .get("/", () => "Hello from Elysia HTTP server!")
    .get('/todos', async () => await db.select().from(todos))
    .post('/todos', async ({ body }) => {
      const [todo] = await db.insert(todos).values(body).returning();
      return todo;
    }, {
      body: t.Object({
        title: t.String(),
        description: t.Optional(t.String())
      })
    })
    
    .put('/todos/:id', async ({ params }) => {
      const [updatedTodo] = await db.update(todos)
        .set({ completed: true })
        .where(eq(todos.id, Number(params.id)))
        .returning();
      return updatedTodo;
    })
    .delete('/todos/:id', async ({ params }) => {
      const [deletedTodo] = await db.delete(todos)
        .where(eq(todos.id, Number(params.id)))
        .returning();
      return deletedTodo;
    })
    .listen(3000, () => {
      console.log("HTTP сервер запущен на порту 3000");
    });
}

// Запускаем оба сервера одновременно
startGrpcServer();
startHttpServer();

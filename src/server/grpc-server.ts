import { createServer } from 'nice-grpc';
import { type TodoServiceImplementation, TodoServiceDefinition } from '../generated/todo';

import { db, todos } from '@/db';

const todoService: TodoServiceImplementation = {
  async createTodo(request) {
    const [todo] = await db.insert(todos).values(request).returning();
    return todo;
  },
  async listTodos() {
    const result = await db.select().from(todos);
    return { todos: result };
  }
};

export async function startGrpcServer() {
  const server = createServer();
  server.add(TodoServiceDefinition, todoService);
  await server.listen('0.0.0.0:50051');
  console.log('✅ gRPC server is running');
}

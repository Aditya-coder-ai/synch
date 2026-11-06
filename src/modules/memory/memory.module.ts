import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { MemoryRepository } from './storage/memory.repository.js';
import { MemoryService } from './storage/memory.service.js';
import { MemoryRetriever } from './retrieval/memory.retriever.js';
import { ContextBuilder } from './context/context.builder.js';
import { DeterministicMemoryExtractor } from './extraction/memory.extractor.js';
import { MemoryCategory } from '../../database/types.js';

export interface MemoryModuleOptions {
  prismaClient?: PrismaClient;
  service?: MemoryService;
  retriever?: MemoryRetriever;
  contextBuilder?: ContextBuilder;
}

export const memoryModule: FastifyPluginAsync<MemoryModuleOptions> = async (
  fastify,
  options,
): Promise<void> => {
  const repository = new MemoryRepository({ prismaClient: options.prismaClient });
  const service = options.service ?? new MemoryService({ repository });
  const retriever = options.retriever ?? new MemoryRetriever({ repository });
  const contextBuilder = options.contextBuilder ?? new ContextBuilder({ retriever });
  const extractor = new DeterministicMemoryExtractor();

  // POST /api/v1/memory - Store a candidate memory
  fastify.post('/memory', async (request, reply) => {
    const body = request.body as any;
    const memory = await service.storeMemory(body);
    return reply.status(201).send({
      success: true,
      data: memory,
    });
  });

  // GET /api/v1/projects/:projectId/memory - Query memories for a project
  fastify.get('/projects/:projectId/memory', async request => {
    const { projectId } = request.params as { projectId: string };
    const query = (request.query as any) || {};

    const memories = await retriever.retrieve({
      projectId,
      keywords: query.keywords ? String(query.keywords).split(',') : undefined,
      categories: query.category ? [query.category as MemoryCategory] : undefined,
      limit: query.limit ? Number(query.limit) : 20,
    });

    return {
      success: true,
      data: memories,
    };
  });

  // GET /api/v1/projects/:projectId/context - Build structured execution context
  fastify.get('/projects/:projectId/context', async request => {
    const { projectId } = request.params as { projectId: string };
    const query = (request.query as any) || {};

    const context = await contextBuilder.buildContext(
      projectId,
      query.taskId || 'task_adhoc',
      query.taskTitle || 'Ad-hoc Task',
      query.keywords ? String(query.keywords).split(',') : [],
    );

    return {
      success: true,
      data: context,
    };
  });

  // Decorate fastify instance
  fastify.decorate('memoryService', service);
  fastify.decorate('contextBuilder', contextBuilder);
  fastify.decorate('memoryExtractor', extractor);
};


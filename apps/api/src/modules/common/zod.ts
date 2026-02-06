import { BadRequestException } from '@nestjs/common';
import type { ZodError, ZodSchema } from 'zod';

export const zodParse = <T>(schema: ZodSchema<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new BadRequestException(zodErrorToMessage(result.error));
};

const zodErrorToMessage = (error: ZodError) => {
  const issue = error.issues[0];
  if (!issue) return 'Invalid input';
  const path = issue.path.length ? issue.path.join('.') : 'input';
  return `${path}: ${issue.message}`;
};


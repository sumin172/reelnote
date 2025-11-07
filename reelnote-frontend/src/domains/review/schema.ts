import { z } from "zod";

export const reviewCreateSchema = z.object({
  movieId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  reason: z.string().min(1).max(1000),
  tags: z.array(z.string()).max(10),
  watchedAt: z.string().min(4),
});

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;

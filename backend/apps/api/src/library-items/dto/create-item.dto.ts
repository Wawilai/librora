import { z } from "zod";

export const CreateItemSchema = z.object({
  url: z
    .string()
    .url("Invalid URL")
    .refine((u) => /^https?:\/\//.test(u), "Only http/https URLs are supported"),
  customTitle: z.string().trim().max(500).optional(),
  note: z.string().trim().max(10000).optional(),
  tags: z.array(z.string().trim().toLowerCase().max(100)).max(20).optional(),
});

export type CreateItemDto = z.infer<typeof CreateItemSchema>;

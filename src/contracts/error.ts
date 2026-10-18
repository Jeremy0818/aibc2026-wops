import { z } from "zod";

export const ApiErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_STAGE_TRANSITION",
  "UNPROCESSABLE_ENTITY",
  "INTERNAL_ERROR",
  "UPSTREAM_ERROR",
]);

export const ApiErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string().min(1),
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string().min(1),
    details: z.array(ApiErrorDetailSchema).optional(),
    requestId: z.string().optional(),
    timestamp: z.string().datetime(),
  }),
});

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

import { z } from "zod";

export const RegisterSchema = z.object({
  displayName: z.string().trim().min(1).max(150),
  email: z.string().email().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  confirmPassword: z.string(),
  turnstileToken: z.string().min(1, "CAPTCHA verification is required"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterDto = z.infer<typeof RegisterSchema>;

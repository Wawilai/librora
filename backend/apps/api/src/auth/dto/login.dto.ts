import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
  // Only required once AuthService.login() has seen enough recent failed
  // attempts from this IP to demand it — see AUTH_CAPTCHA_REQUIRED.
  turnstileToken: z.string().optional(),
});

export type LoginDto = z.infer<typeof LoginSchema>;

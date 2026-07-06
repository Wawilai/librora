import type { ApiErrorCode } from "./api/types";
import type { TKey } from "./i18n";

// Maps every backend auth-related error code to a translated frontend
// message key, so the UI never shows a raw backend string (which is always
// in whatever language the backend author happened to write it in, not the
// user's selected language). Codes not covered here fall back to
// auth.genericAuthError in the call sites below.
const AUTH_ERROR_KEYS: Partial<Record<ApiErrorCode, TKey>> = {
  AUTH_INVALID_CREDENTIALS: "auth.invalidCredentialsError",
  AUTH_EMAIL_ALREADY_EXISTS: "auth.emailAlreadyExistsError",
  AUTH_EMAIL_NOT_VERIFIED: "auth.emailNotVerifiedError",
  AUTH_CAPTCHA_REQUIRED: "auth.captchaRequiredError",
  CAPTCHA_VERIFICATION_FAILED: "auth.captchaFailedError",
  EMAIL_VERIFICATION_TOKEN_INVALID: "auth.verificationLinkInvalidError",
  PASSWORD_RESET_TOKEN_INVALID: "auth.resetLinkInvalidError",
  PASSWORD_RESET_NOT_AVAILABLE: "auth.passwordResetUnavailable",
  AUTH_REFRESH_TOKEN_INVALID: "auth.sessionExpiredError",
  RATE_LIMITED: "auth.rateLimitedError",
  VALIDATION_ERROR: "auth.genericAuthError",
};

export function authErrorKey(code: ApiErrorCode): TKey {
  return AUTH_ERROR_KEYS[code] ?? "auth.genericAuthError";
}

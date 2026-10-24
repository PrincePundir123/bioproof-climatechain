export function loginFailure(error: {
  code?: string;
  status?: number;
  name?: string;
}) {
  if (error.code === "invalid_credentials")
    return { status: 401, error: "Incorrect email or password." };
  if (error.code === "email_not_confirmed")
    return {
      status: 403,
      error:
        "Confirm your email before signing in. Contact the project administrator if you need help.",
    };
  if (error.code === "user_banned")
    return {
      status: 403,
      error: "This account is suspended. Contact the project administrator.",
    };
  if (error.status === 429 || error.code === "over_request_rate_limit")
    return {
      status: 429,
      error: "Too many sign-in attempts. Please wait before trying again.",
    };
  return {
    status: 503,
    error: "Sign-in is temporarily unavailable. Please try again shortly.",
  };
}

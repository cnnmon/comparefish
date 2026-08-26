// Convex Auth middleware: persists and refreshes the auth token in cookies
// so sessions survive reloads and server-rendered pages see the logged-in user.
import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

export default convexAuthNextjsMiddleware();

export const config = {
  // Run on all routes except static assets
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

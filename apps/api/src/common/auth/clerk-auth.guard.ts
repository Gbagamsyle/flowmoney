import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createClerkClient, verifyToken } from '@clerk/backend';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { id: string; email?: string };
    }>();

    const authorization = req.headers.authorization ?? '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new UnauthorizedException('CLERK_SECRET_KEY is not configured');
    }

    try {
      const verified = await verifyToken(token, { secretKey });
      const clerkUserId = verified.sub;

      if (!clerkUserId) {
        throw new UnauthorizedException('Invalid Clerk session');
      }

      const clerk = createClerkClient({ secretKey });
      const clerkUser = await clerk.users.getUser(clerkUserId);
      const primaryEmail = clerkUser.emailAddresses.find(
        (entry) => entry.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress;

      req.user = {
        id: clerkUserId,
        email: primaryEmail ?? clerkUser.emailAddresses[0]?.emailAddress,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired Clerk session');
    }
  }
}

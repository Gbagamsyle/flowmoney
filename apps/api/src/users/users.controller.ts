import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../common/auth/clerk-auth.guard.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(ClerkAuthGuard)
  @Get('me')
  async getCurrentUser(@Req() req: { user?: { id?: string; email?: string } }) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }

    return this.usersService.getOrCreateForClerk({
      clerkId: req.user.id,
      email: req.user.email,
    });
  }
}

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Body,
  Patch,
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
  async getCurrentUser(@Req() req: { user?: { id?: string; email?: string; emailVerified?: boolean } }) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }

    return this.usersService.getOrCreateForClerk({
      clerkId: req.user.id,
      email: req.user.email,
      emailVerified: req.user.emailVerified,
    });
  }

  @UseGuards(ClerkAuthGuard)
  @Patch('me/onboarding')
  async completeOnboarding(@Req() req: { user?: { id?: string } }) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }

    return this.usersService.markOnboardingComplete(req.user.id);
  }

  @UseGuards(ClerkAuthGuard)
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCurrentUser(@Req() req: { user?: { id?: string } }) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }

    await this.usersService.deleteAccount(req.user.id);
  }

  @UseGuards(ClerkAuthGuard)
  @Patch('me/currency')
  async updatePreferredCurrency(
    @Req() req: { user?: { id?: string } },
    @Body() body: { currency?: string },
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }

    return this.usersService.updatePreferredCurrency(req.user.id, body.currency ?? '');
  }
}

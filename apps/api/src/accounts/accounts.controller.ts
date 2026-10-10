import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../common/auth/clerk-auth.guard.js';
import { AccountsService } from './accounts.service.js';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @UseGuards(ClerkAuthGuard)
  @Get()
  async listAccounts(@Req() req: { user?: { id?: string } }) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }

    return this.accountsService.listAccounts(req.user.id);
  }

  @UseGuards(ClerkAuthGuard)
  @Post()
  async createAccount(
    @Req() req: { user?: { id?: string } },
    @Body() body: { name: string; balance: number; currency?: string },
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }

    return this.accountsService.createAccount(req.user.id, body);
  }

  @UseGuards(ClerkAuthGuard)
  @Patch(':id')
  async updateAccount(
    @Req() req: { user?: { id?: string } },
    @Param('id') id: string,
    @Body() body: { name?: string; balance?: number; currency?: string },
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }

    return this.accountsService.updateAccount(req.user.id, id, body);
  }

  @UseGuards(ClerkAuthGuard)
  @Delete(':id')
  async deleteAccount(@Req() req: { user?: { id?: string } }, @Param('id') id: string) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }

    return this.accountsService.deleteAccount(req.user.id, id);
  }
}

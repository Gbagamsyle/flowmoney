import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  async listAccounts(@Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'demo-user';
    return this.accountsService.listAccounts(userId);
  }

  @Post()
  async createAccount(
    @Req() req: { user?: { id?: string } },
    @Body() body: { name: string; balance: number; currency?: string },
  ) {
    const userId = req.user?.id ?? 'demo-user';
    return this.accountsService.createAccount(userId, body);
  }
}

import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ExpectedIncomeService } from './expected-income.service.js';

@Controller('expected-income')
export class ExpectedIncomeController {
  constructor(private readonly expectedIncomeService: ExpectedIncomeService) {}

  @Get()
  async list(@Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'demo-user';
    return this.expectedIncomeService.list(userId);
  }

  @Post()
  async create(
    @Req() req: { user?: { id?: string } },
    @Body() body: { title: string; amount: number; expectedDate: string; confidence: string; status?: string },
  ) {
    const userId = req.user?.id ?? 'demo-user';
    return this.expectedIncomeService.create(userId, body);
  }
}

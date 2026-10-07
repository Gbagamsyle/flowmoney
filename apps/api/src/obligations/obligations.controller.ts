import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ObligationsService } from './obligations.service.js';

@Controller('obligations')
export class ObligationsController {
  constructor(private readonly obligationsService: ObligationsService) {}

  @Get()
  async list(@Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'demo-user';
    return this.obligationsService.list(userId);
  }

  @Post()
  async create(
    @Req() req: { user?: { id?: string } },
    @Body() body: { title: string; amount: number; dueDate: string; priority: string; status?: string },
  ) {
    const userId = req.user?.id ?? 'demo-user';
    return this.obligationsService.create(userId, body);
  }
}

import { Controller, Get, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'demo-user';
    return this.dashboardService.getDashboard(userId);
  }
}

import { Body, Controller, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../common/auth/clerk-auth.guard.js';
import { ScenariosService } from './scenarios.service.js';

@Controller('scenarios')
export class ScenariosController {
  constructor(private readonly scenariosService: ScenariosService) {}

  @UseGuards(ClerkAuthGuard)
  @Post('evaluate')
  async evaluate(
    @Req() req: { user?: { id?: string } },
    @Body() body: {
      changes?: {
        expectedIncomeDelayDays?: number;
        expectedIncomeReduction?: number;
        addedExpense?: number;
        bufferOverride?: number;
      };
    },
  ) {
    if (!req.user?.id) throw new UnauthorizedException();
    return this.scenariosService.evaluate(req.user.id, body.changes ?? {});
  }
}

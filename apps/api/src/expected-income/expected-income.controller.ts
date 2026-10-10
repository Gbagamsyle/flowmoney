import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../common/auth/clerk-auth.guard.js';
import { ExpectedIncomeService } from './expected-income.service.js';

@Controller('expected-income')
export class ExpectedIncomeController {
  constructor(private readonly expectedIncomeService: ExpectedIncomeService) {}

  @UseGuards(ClerkAuthGuard)
  @Get()
  async list(@Req() req: { user?: { id?: string } }) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }

    return this.expectedIncomeService.list(req.user.id);
  }

  @UseGuards(ClerkAuthGuard)
  @Post()
  async create(
    @Req() req: { user?: { id?: string } },
    @Body() body: { title: string; amount: number; expectedDate: string; confidence: string; status?: string },
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }

    return this.expectedIncomeService.create(req.user.id, body);
  }
}

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
import { ObligationsService } from './obligations.service.js';

@Controller('obligations')
export class ObligationsController {
  constructor(private readonly obligationsService: ObligationsService) {}

  @UseGuards(ClerkAuthGuard)
  @Get()
  async list(@Req() req: { user?: { id?: string } }) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }

    return this.obligationsService.list(req.user.id);
  }

  @UseGuards(ClerkAuthGuard)
  @Post()
  async create(
    @Req() req: { user?: { id?: string } },
    @Body() body: { title: string; amount: number; dueDate: string; priority: string; status?: string },
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }

    return this.obligationsService.create(req.user.id, body);
  }
}

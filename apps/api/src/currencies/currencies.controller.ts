import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../common/auth/clerk-auth.guard.js';
import { CurrenciesService } from './currencies.service.js';
@Controller('currencies')
@UseGuards(ClerkAuthGuard)
export class CurrenciesController {
  constructor(private readonly currencies: CurrenciesService) {}
  private id(req: { user?: { id?: string } }) {
    if (!req.user?.id) throw new UnauthorizedException();
    return req.user.id;
  }
  @Header('Cache-Control', 'private, no-store')
  @Get('display')
  display(@Req() req: { user?: { id?: string } }) {
    return this.currencies.display(this.id(req));
  }
  @Header('Cache-Control', 'private, no-store')
  @Get('summary/:kind/:id')
  summary(
    @Req() req: { user?: { id?: string } },
    @Param('kind') kind: string,
    @Param('id') id: string,
  ) {
    return this.currencies.summary(this.id(req), kind, id);
  }
  @Header('Cache-Control', 'private, no-store')
  @Get('review')
  review(@Req() req: { user?: { id?: string } }) {
    return this.currencies.review(this.id(req));
  }
  @Header('Cache-Control', 'private, no-store')
  @Patch('review')
  confirm(@Req() req: { user?: { id?: string } }, @Body() body: unknown) {
    return this.currencies.confirm(this.id(req), body);
  }
}

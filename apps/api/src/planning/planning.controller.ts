import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../common/auth/clerk-auth.guard.js';
import { PlanningService } from './planning.service.js';
import { PlanningDatabaseInterceptor } from './planning.interceptor.js';
@Controller('planning')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(PlanningDatabaseInterceptor)
export class PlanningController {
  constructor(private readonly planning: PlanningService) {}
  private identity(req: { user?: { id?: string } }) {
    if (!req.user?.id) throw new UnauthorizedException();
    return req.user.id;
  }
  @Get()
  @Header('Cache-Control', 'no-store')
  get(
    @Req() req: { user?: { id?: string } },
    @Query('month') month: string,
    @Query('mode') mode?: string,
  ) {
    return this.planning.get(this.identity(req), month, mode);
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  create(@Req() req: { user?: { id?: string } }, @Body() body: unknown) {
    return this.planning.create(this.identity(req), body);
  }
  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  save(
    @Req() req: { user?: { id?: string } },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.planning.save(this.identity(req), id, body);
  }
  @Post(':id/assign')
  @Header('Cache-Control', 'no-store')
  assign(
    @Req() req: { user?: { id?: string } },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.planning.assign(this.identity(req), id, body);
  }
  @Post(':id/from-statement')
  @Header('Cache-Control', 'no-store')
  fromStatement(
    @Req() req: { user?: { id?: string } },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.planning.fromStatement(this.identity(req), id, body);
  }
}

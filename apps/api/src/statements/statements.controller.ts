import { StatementsDatabaseInterceptor } from './statements-database.interceptor.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClerkAuthGuard } from '../common/auth/clerk-auth.guard.js';
import { StatementsService } from './statements.service.js';
import { MAX_BYTES } from './statement.extract.js';

@Controller('statements')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(StatementsDatabaseInterceptor)
export class StatementsController {
  constructor(private readonly statements: StatementsService) {}
  private identity(req: { user?: { id?: string } }) {
    if (!req.user?.id) throw new UnauthorizedException();
    return req.user.id;
  }
  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Req() req: { user?: { id?: string } }) {
    return this.statements.list(this.identity(req));
  }
  @Get('category-rules')
  @Header('Cache-Control', 'no-store')
  rules(@Req() req: { user?: { id?: string } }) {
    return this.statements.listRules(this.identity(req));
  }
  @Delete('category-rules/:ruleId')
  forgetRule(
    @Req() req: { user?: { id?: string } },
    @Param('ruleId') ruleId: string,
  ) {
    return this.statements.forgetRule(this.identity(req), ruleId);
  }
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  get(@Req() req: { user?: { id?: string } }, @Param('id') id: string) {
    return this.statements.get(this.identity(req), id);
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_BYTES,
        files: 1,
        fields: 1,
        parts: 2,
        fieldSize: 20,
      },
    }),
  )
  upload(
    @Req() req: { user?: { id?: string } },
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
    @Body('currency') currency: unknown,
  ) {
    return this.statements.upload(this.identity(req), file, currency);
  }
  @Post(':id/approve')
  @Header('Cache-Control', 'no-store')
  approve(
    @Req() req: { user?: { id?: string } },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.statements.approve(this.identity(req), id, body);
  }
  @Delete(':id')
  remove(@Req() req: { user?: { id?: string } }, @Param('id') id: string) {
    return this.statements.remove(this.identity(req), id);
  }
}

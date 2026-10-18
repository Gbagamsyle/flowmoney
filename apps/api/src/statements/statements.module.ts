import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module.js';
import { UsersModule } from '../users/users.module.js';
import { StatementsController } from './statements.controller.js';
import { StatementsService } from './statements.service.js';
@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [StatementsController],
  providers: [StatementsService],
})
export class StatementsModule {}

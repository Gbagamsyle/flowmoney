import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module.js';
import { UsersModule } from '../users/users.module.js';
import { ObligationsController } from './obligations.controller.js';
import { ObligationsService } from './obligations.service.js';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [ObligationsController],
  providers: [ObligationsService],
})
export class ObligationsModule {}

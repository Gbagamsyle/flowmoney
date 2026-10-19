import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module.js';
import { UsersModule } from '../users/users.module.js';
import { PlanningService } from './planning.service.js';
import { PlanningController } from './planning.controller.js';
@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [PlanningController],
  providers: [PlanningService],
})
export class PlanningModule {}

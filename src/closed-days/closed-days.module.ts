import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClosedDay } from './entities/closed-day.entity';
import { ClosedDaysService } from './closed-days.service';
import { ClosedDaysController } from './closed-days.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClosedDay])],
  controllers: [ClosedDaysController],
  providers: [ClosedDaysService],
  exports: [ClosedDaysService],
})
export class ClosedDaysModule {}

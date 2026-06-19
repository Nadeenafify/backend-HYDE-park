import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Unit } from '../units/entities/unit.entity';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Unit])],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}

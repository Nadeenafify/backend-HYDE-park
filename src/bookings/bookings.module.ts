import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { UnitsModule } from '../units/units.module';
import { ClosedDaysModule } from '../closed-days/closed-days.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking]), UnitsModule, ClosedDaysModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockEvent } from './entities/block-event.entity';
import { BlockEventsService } from './block-events.service';
import { BlockEventsController } from './block-events.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BlockEvent])],
  controllers: [BlockEventsController],
  providers: [BlockEventsService],
  exports: [BlockEventsService],
})
export class BlockEventsModule {}

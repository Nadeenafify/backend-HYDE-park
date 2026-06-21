import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Postpone } from './entities/postpone.entity';
import { PostponesService } from './postpones.service';
import { PostponesController } from './postpones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Postpone])],
  controllers: [PostponesController],
  providers: [PostponesService],
  exports: [PostponesService],
})
export class PostponesModule {}

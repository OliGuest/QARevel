import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceProfilesService } from './device-profiles.service';
import { DeviceProfilesController } from './device-profiles.controller';
import { DeviceProfile } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceProfile])],
  providers: [DeviceProfilesService],
  controllers: [DeviceProfilesController],
  exports: [DeviceProfilesService],
})
export class DeviceProfilesModule {}

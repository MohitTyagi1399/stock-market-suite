import { Module } from '@nestjs/common';

import { CryptoService } from '../common/crypto.service';
import { AuthModule } from '../auth/auth.module';
import { BrokersController } from './brokers.controller';
import { BrokersService } from './brokers.service';

@Module({
  imports: [AuthModule],
  controllers: [BrokersController],
  providers: [BrokersService, CryptoService],
  exports: [BrokersService],
})
export class BrokersModule {}


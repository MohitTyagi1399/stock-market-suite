import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { CryptoService } from '../common/crypto.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, CryptoService],
  exports: [AuthGuard, AuthService],
})
export class AuthModule {}


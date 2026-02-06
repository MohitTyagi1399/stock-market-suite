import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { PortfolioService } from './portfolio.service';

@UseGuards(AuthGuard)
@Controller('/portfolio')
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get('/summary')
  async summary(@Req() req: Request) {
    return await this.portfolio.getSummary((req as any).auth.userId);
  }

  @Get('/positions')
  async positions(@Req() req: Request) {
    return await this.portfolio.syncAndGetPositions((req as any).auth.userId);
  }
}


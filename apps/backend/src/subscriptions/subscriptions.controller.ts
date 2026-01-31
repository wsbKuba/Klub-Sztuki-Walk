import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('my')
  async getMySubscriptions(@Request() req) {
    return this.subscriptionsService.getMySubscriptions(req.user.id);
  }

  @Get(':id')
  async getSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.subscriptionsService.getSubscriptionById(id, req.user.id);
  }

  @Post('checkout')
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @Request() req,
  ) {
    return this.subscriptionsService.createCheckoutSession(
      req.user.id,
      dto.classTypeId,
    );
  }

  @Post(':id/cancel')
  async cancelSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.subscriptionsService.cancelSubscription(id, req.user.id);
  }

  @Post(':id/reactivate')
  async reactivateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.subscriptionsService.reactivateSubscription(id, req.user.id);
  }

  @Post('customer-portal')
  async createCustomerPortalSession(@Request() req) {
    return this.subscriptionsService.createCustomerPortalSession(req.user.id);
  }
}

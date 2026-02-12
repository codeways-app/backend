import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';
import { SessionService } from '../session/session.service';

@Module({ providers: [EventsGateway, EventsService, SessionService] })
export class EventsModule {}

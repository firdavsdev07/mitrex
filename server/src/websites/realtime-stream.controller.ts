import {
  Controller,
  Param,
  Query,
  Sse,
  MessageEvent,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiExcludeController } from '@nestjs/swagger';
import { Observable, interval } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { WebsitesService } from './websites.service';
import { PrismaService } from '../prisma/prisma.service';
import { getErrorMessage } from '../common/utils/error.util';

// EventSource brauzer API'si so'rov headerlariga to'liq nazorat bermaydi
// (Authorization header qo'sha olmaydi) — shuning uchun bu marshrut alohida
// controllerda, class-level JwtGuard'siz joylashtirilgan va tokenni query
// parametridan olib qo'lda tekshiradi.
@ApiExcludeController()
@Controller('websites')
export class RealtimeStreamController {
  constructor(
    private readonly websitesService: WebsitesService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Sse(':id/realtime/stream')
  realtimeStream(
    @Param('id') id: string,
    @Query('token') token: string,
  ): Observable<MessageEvent> {
    return interval(5000).pipe(
      switchMap(async () => {
        // JwtStrategy.validate bilan bir xil tekshiruvlar — bu yerda alohida
        // qo'lda tekshirilganligi sababli ular avtomatik qo'llanmaydi:
        // 2FA oraliq tokeni (twofa:true) to'liq API kirish uchun ishlatilmasligi
        // va o'chirilgan/bloklangan hisob har so'rovda qayta tekshirilishi kerak.
        let payload: { sub: string; twofa?: boolean };
        try {
          payload = this.jwt.verify<{ sub: string; twofa?: boolean }>(token);
        } catch {
          throw new UnauthorizedException('Invalid or expired token');
        }
        if (payload.twofa) throw new UnauthorizedException();

        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, deletedAt: true },
        });
        if (!user || user.deletedAt) throw new UnauthorizedException();

        const data = await this.websitesService.getRealtime(user.id, id);
        return { data };
      }),
      catchError((err: unknown) =>
        of({ data: { error: getErrorMessage(err) } } as MessageEvent),
      ),
    );
  }
}

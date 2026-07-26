import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService, RequestMeta } from './auth.service';
import { OAuthUser } from './types/oauth-user.type';
import { TwoFactorService } from './two-factor.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtGuard } from './guards/jwt.guard';
import { GoogleGuard } from './guards/google.guard';
import { GithubGuard } from './guards/github.guard';
import { DiscordAuthGuard } from './guards/discord-auth.guard';
import { FacebookGuard } from './guards/facebook.guard';
import { AppleGuard } from './guards/apple.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
} from '../common/utils/refresh-token.util';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  private getMeta(req: Request): RequestMeta {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
    return { ip, userAgent: req.headers['user-agent'] };
  }

  // httpOnly refresh cookie'ni o'rnatadi. Faqat JS o'qiy olmaydigan bu
  // cookie orqali access token silently yangilanadi — XSS access-token'ni
  // o'g'irlay olmaydi.
  //
  // Path '/' (nafaqat '/auth') — chunki Next.js frontend (boshqa portda/
  // domenda) o'zining middleware'ida shu cookie mavjudligini "sessiya bormi"
  // degan tezkor belgi sifatida tekshiradi (haqiqiy tekshiruv baribir
  // /auth/me chaqiruvi orqali server tomonda bo'ladi). Production'da
  // frontend va API alohida subdomenlarda bo'lsa (app.x.com / api.x.com),
  // COOKIE_DOMAIN=.x.com o'rnatilsa cookie ikkalasiga ham ko'rinadi.
  private setRefreshCookie(res: Response, rawToken: string) {
    res.cookie(REFRESH_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
  }

  // ─── Email / Password ──────────────────────────────────────────────

  @Post('register')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created — returns access token, sets refresh cookie',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or email already taken',
  })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto, this.getMeta(req));
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description:
      'Returns access token + sets refresh cookie, OR { twoFactorRequired: true, tempToken } if 2FA is enabled',
  })
  @ApiResponse({ status: 401, description: 'Wrong email or password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, this.getMeta(req));
    if ('twoFactorRequired' in result) return result;
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 8 } })
  @ApiOperation({ summary: 'Complete login by submitting a TOTP code' })
  @ApiResponse({
    status: 200,
    description: 'Returns access token + sets refresh cookie',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid code or expired 2FA session',
  })
  async verifyTwoFactor(
    @Body('tempToken') tempToken: string,
    @Body('code') code: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyTwoFactor(
      tempToken,
      code,
      this.getMeta(req),
    );
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 20 } })
  @ApiOperation({
    summary: 'Exchange the refresh cookie for a new access token',
  })
  @ApiResponse({ status: 200, description: 'Returns a new access token' })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid, or expired refresh token',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (!rawToken) throw new UnauthorizedException('No refresh token');

    try {
      const result = await this.authService.refreshSession(
        rawToken,
        this.getMeta(req),
      );
      this.setRefreshCookie(res, result.refreshToken);
      return { user: result.user, accessToken: result.accessToken };
    } catch (err) {
      this.clearRefreshCookie(res);
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current refresh session' })
  @ApiResponse({ status: 200, description: '{ loggedOut: true }' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (rawToken) await this.authService.revokeRefreshToken(rawToken);
    this.clearRefreshCookie(res);
    return { loggedOut: true };
  }

  @UseGuards(JwtGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Revoke every active session for the current user' })
  @ApiResponse({ status: 200, description: '{ revoked: true }' })
  async logoutAll(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.revokeAllSessions(userId);
    this.clearRefreshCookie(res);
    return result;
  }

  @UseGuards(JwtGuard)
  @Get('me')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  @UseGuards(JwtGuard)
  @Get('login-history')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'List recent login events for the current user' })
  @ApiResponse({ status: 200, description: 'Array of login events' })
  getLoginHistory(@CurrentUser('id') userId: string) {
    return this.authService.getLoginHistory(userId);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent (always succeeds to prevent enumeration)',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ─── 2FA management (requires being logged in already) ─────────────

  @UseGuards(JwtGuard)
  @Post('2fa/setup')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Start 2FA enrollment — returns a QR code to scan' })
  @ApiResponse({ status: 200, description: '{ secret, qrDataUrl }' })
  setupTwoFactor(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') email: string,
  ) {
    return this.twoFactorService.generateSetup(userId, email);
  }

  @UseGuards(JwtGuard)
  @Post('2fa/confirm')
  @Throttle({ short: { ttl: 60000, limit: 8 } })
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Confirm 2FA enrollment with a code from the authenticator app',
  })
  @ApiResponse({ status: 200, description: '{ enabled: true }' })
  @ApiResponse({ status: 401, description: 'Wrong code' })
  confirmTwoFactor(
    @CurrentUser('id') userId: string,
    @Body('code') code: string,
  ) {
    return this.twoFactorService.confirm(userId, code);
  }

  @UseGuards(JwtGuard)
  @Post('2fa/disable')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Disable 2FA (requires current password)' })
  @ApiResponse({ status: 200, description: '{ disabled: true }' })
  disableTwoFactor(
    @CurrentUser('id') userId: string,
    @Body('password') password: string,
  ) {
    return this.twoFactorService.disable(userId, password);
  }

  // ─── OAuth (browser-only flows — not testable via Swagger) ─────────

  @ApiExcludeEndpoint()
  @Get('google')
  @UseGuards(GoogleGuard)
  googleLogin() {}

  @ApiExcludeEndpoint()
  @Get('google/callback')
  @UseGuards(GoogleGuard)
  async googleCallback(
    @Req() req: Request & { user: OAuthUser },
    @Res() res: Response,
  ) {
    const result = await this.authService.oauthLogin(
      req.user,
      this.getMeta(req),
    );
    this.setRefreshCookie(res, result.refreshToken);
    return this.redirectWithToken(res, result.accessToken);
  }

  @ApiExcludeEndpoint()
  @Get('github')
  @UseGuards(GithubGuard)
  githubLogin() {}

  @ApiExcludeEndpoint()
  @Get('github/callback')
  @UseGuards(GithubGuard)
  async githubCallback(
    @Req() req: Request & { user: OAuthUser },
    @Res() res: Response,
  ) {
    const result = await this.authService.oauthLogin(
      req.user,
      this.getMeta(req),
    );
    this.setRefreshCookie(res, result.refreshToken);
    return this.redirectWithToken(res, result.accessToken);
  }

  @ApiExcludeEndpoint()
  @Get('discord')
  @UseGuards(DiscordAuthGuard)
  discordLogin() {}

  @ApiExcludeEndpoint()
  @Get('discord/callback')
  @UseGuards(DiscordAuthGuard)
  async discordCallback(
    @Req() req: Request & { user: OAuthUser },
    @Res() res: Response,
  ) {
    const result = await this.authService.oauthLogin(
      req.user,
      this.getMeta(req),
    );
    this.setRefreshCookie(res, result.refreshToken);
    return this.redirectWithToken(res, result.accessToken);
  }

  @ApiExcludeEndpoint()
  @Get('facebook')
  @UseGuards(FacebookGuard)
  facebookLogin() {}

  @ApiExcludeEndpoint()
  @Get('facebook/callback')
  @UseGuards(FacebookGuard)
  async facebookCallback(
    @Req() req: Request & { user: OAuthUser },
    @Res() res: Response,
  ) {
    const result = await this.authService.oauthLogin(
      req.user,
      this.getMeta(req),
    );
    this.setRefreshCookie(res, result.refreshToken);
    return this.redirectWithToken(res, result.accessToken);
  }

  @ApiExcludeEndpoint()
  @Get('apple')
  @UseGuards(AppleGuard)
  appleLogin() {}

  @ApiExcludeEndpoint()
  @Post('apple/callback')
  @UseGuards(AppleGuard)
  async appleCallback(
    @Req() req: Request & { user: OAuthUser },
    @Res() res: Response,
  ) {
    const result = await this.authService.oauthLogin(
      req.user,
      this.getMeta(req),
    );
    this.setRefreshCookie(res, result.refreshToken);
    return this.redirectWithToken(res, result.accessToken);
  }

  private redirectWithToken(res: Response, accessToken: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
  }
}

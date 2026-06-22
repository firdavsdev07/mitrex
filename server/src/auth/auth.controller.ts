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
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Email / Password ──────────────────────────────────────────────
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  // ─── Google ────────────────────────────────────────────────────────
  @Get('google')
  @UseGuards(GoogleGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleGuard)
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.oauthLogin(req.user);
    return this.redirectWithToken(res, result.token);
  }

  // ─── GitHub ────────────────────────────────────────────────────────
  @Get('github')
  @UseGuards(GithubGuard)
  githubLogin() {}

  @Get('github/callback')
  @UseGuards(GithubGuard)
  async githubCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.oauthLogin(req.user);
    return this.redirectWithToken(res, result.token);
  }

  // ─── Discord ───────────────────────────────────────────────────────
  @Get('discord')
  @UseGuards(DiscordAuthGuard)
  discordLogin() {}

  @Get('discord/callback')
  @UseGuards(DiscordAuthGuard)
  async discordCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.oauthLogin(req.user);
    return this.redirectWithToken(res, result.token);
  }

  // ─── Facebook ──────────────────────────────────────────────────────
  @Get('facebook')
  @UseGuards(FacebookGuard)
  facebookLogin() {}

  @Get('facebook/callback')
  @UseGuards(FacebookGuard)
  async facebookCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.oauthLogin(req.user);
    return this.redirectWithToken(res, result.token);
  }

  // ─── Apple ─────────────────────────────────────────────────────────
  @Get('apple')
  @UseGuards(AppleGuard)
  appleLogin() {}

  @Post('apple/callback')
  @UseGuards(AppleGuard)
  async appleCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.oauthLogin(req.user);
    return this.redirectWithToken(res, result.token);
  }

  // Frontend ga token bilan redirect
  private redirectWithToken(res: Response, token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
}

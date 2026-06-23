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
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Email / Password ──────────────────────────────────────────────

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created — returns JWT token' })
  @ApiResponse({ status: 400, description: 'Validation error or email already taken' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Returns JWT token' })
  @ApiResponse({ status: 401, description: 'Wrong email or password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent (always succeeds to prevent enumeration)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
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

  // ─── OAuth (browser-only flows — not testable via Swagger) ─────────

  @ApiExcludeEndpoint()
  @Get('google')
  @UseGuards(GoogleGuard)
  googleLogin() {}

  @ApiExcludeEndpoint()
  @Get('google/callback')
  @UseGuards(GoogleGuard)
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.oauthLogin(req.user);
    return this.redirectWithToken(res, result.token);
  }

  @ApiExcludeEndpoint()
  @Get('github')
  @UseGuards(GithubGuard)
  githubLogin() {}

  @ApiExcludeEndpoint()
  @Get('github/callback')
  @UseGuards(GithubGuard)
  async githubCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.oauthLogin(req.user);
    return this.redirectWithToken(res, result.token);
  }

  @ApiExcludeEndpoint()
  @Get('discord')
  @UseGuards(DiscordAuthGuard)
  discordLogin() {}

  @ApiExcludeEndpoint()
  @Get('discord/callback')
  @UseGuards(DiscordAuthGuard)
  async discordCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.oauthLogin(req.user);
    return this.redirectWithToken(res, result.token);
  }

  @ApiExcludeEndpoint()
  @Get('facebook')
  @UseGuards(FacebookGuard)
  facebookLogin() {}

  @ApiExcludeEndpoint()
  @Get('facebook/callback')
  @UseGuards(FacebookGuard)
  async facebookCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.oauthLogin(req.user);
    return this.redirectWithToken(res, result.token);
  }

  @ApiExcludeEndpoint()
  @Get('apple')
  @UseGuards(AppleGuard)
  appleLogin() {}

  @ApiExcludeEndpoint()
  @Post('apple/callback')
  @UseGuards(AppleGuard)
  async appleCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.oauthLogin(req.user);
    return this.redirectWithToken(res, result.token);
  }

  private redirectWithToken(res: Response, token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
}

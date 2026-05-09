import { Controller, Post, Get, Delete, Body, UseGuards, Request, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, InviteUserDto, AcceptInviteDto } from './dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new organization and admin user' })
  @ApiResponse({ status: 201, description: 'Organization and user created' })
  @ApiResponse({ status: 400, description: 'Slug or email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh JWT token' })
  async refresh(@Request() req: any) {
    return this.authService.refreshToken(req.user);
  }

  @Post('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  async getCurrentUser(@Request() req: any) {
    return req.user;
  }

  // ── Invite system ──────────────────────────────────────────────────────────

  @Post('invite')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a user to your organization' })
  @ApiResponse({ status: 201, description: 'Invitation created, returns invite URL' })
  async invite(@Body() inviteDto: InviteUserDto, @Request() req: any) {
    return this.authService.inviteUser(inviteDto, req.user);
  }

  @Get('invitations')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all invitations for the current organization' })
  async listInvitations(@Request() req: any) {
    return this.authService.listInvitations(req.user.organizationId);
  }

  @Delete('invitations/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  async revokeInvitation(@Param('id') id: string, @Request() req: any) {
    return this.authService.revokeInvitation(id, req.user.organizationId);
  }

  @Get('check-invite/:token')
  @ApiOperation({ summary: 'Validate an invitation token (public)' })
  @ApiResponse({ status: 200, description: 'Token valid, returns email and org name' })
  @ApiResponse({ status: 404, description: 'Token not found or expired' })
  async checkInvite(@Param('token') token: string) {
    return this.authService.checkInvite(token);
  }

  @Post('accept-invite/:token')
  @ApiOperation({ summary: 'Accept an invitation and create account (public)' })
  @ApiResponse({ status: 201, description: 'Account created, returns JWT' })
  async acceptInvite(@Param('token') token: string, @Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(token, dto);
  }

  @Get('members')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all members of the current organization' })
  async listMembers(@Request() req: any) {
    return this.authService.listMembers(req.user.organizationId);
  }
}

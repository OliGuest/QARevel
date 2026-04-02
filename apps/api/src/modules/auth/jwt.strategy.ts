import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const publicKeyPath =
      process.env.JWT_PUBLIC_KEY_PATH ||
      path.resolve(process.cwd(), '../../keys/jwt-public.pem');

    let secretOrKey: string | Buffer;
    try {
      secretOrKey = fs.readFileSync(publicKeyPath, 'utf8');
    } catch {
      // Fallback to symmetric secret for development
      secretOrKey = process.env.JWT_SECRET || 'dev-secret-change-me';
    }

    const algorithms = secretOrKey.toString().includes('BEGIN')
      ? ['RS256' as const]
      : ['HS256' as const];

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
      algorithms,
    } as any);
  }

  validate(payload: { sub: string; email: string; role: string }) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}

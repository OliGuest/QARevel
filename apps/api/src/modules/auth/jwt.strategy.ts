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
      path.resolve(process.cwd(), '../../keys/public.pem');

    let secretOrKey: string | Buffer | undefined;
    try {
      secretOrKey = fs.readFileSync(publicKeyPath, 'utf8');
    } catch {
      // No public key: only fall back to an explicitly-provided symmetric
      // secret. Never a hardcoded default — must match auth.module.ts.
      secretOrKey = process.env.JWT_SECRET;
    }

    if (!secretOrKey) {
      throw new Error(
        'JWT is not configured: no public key at JWT_PUBLIC_KEY_PATH and ' +
          'JWT_SECRET is not set. Run `npm run generate:keys` or set JWT_SECRET.',
      );
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

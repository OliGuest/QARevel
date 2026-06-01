import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../../database/entities';

function loadKey(envVar: string, filename: string): string | undefined {
  const keyPath = process.env[envVar] || path.resolve(process.cwd(), `../../keys/${filename}`);
  try {
    return fs.readFileSync(keyPath, 'utf8');
  } catch {
    return undefined;
  }
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const privateKey = loadKey('JWT_PRIVATE_KEY_PATH', 'private.pem');
        const publicKey = loadKey('JWT_PUBLIC_KEY_PATH', 'public.pem');

        if (privateKey && publicKey) {
          return {
            privateKey,
            publicKey,
            signOptions: { algorithm: 'RS256' as const, expiresIn: '1h' },
            verifyOptions: { algorithms: ['RS256' as const] },
          };
        }

        // No RS256 keys: only allow a symmetric secret if it is explicitly
        // provided. Refuse to start on a hardcoded default — a guessable
        // signing key is an auth bypass.
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error(
            'JWT is not configured: no RS256 key pair found ' +
              '(JWT_PRIVATE_KEY_PATH / JWT_PUBLIC_KEY_PATH) and JWT_SECRET is not set. ' +
              'Run `npm run generate:keys` to create RS256 keys, or set JWT_SECRET. ' +
              'Refusing to start with an insecure default signing key.',
          );
        }
        return {
          secret,
          signOptions: { expiresIn: '1h' },
        };
      },
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

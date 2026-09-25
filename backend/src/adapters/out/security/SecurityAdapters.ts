import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RolUsuario } from '../../../domain/entities/Usuario';
import { PasswordHasherPort, TokenProviderPort } from '../../../application/ports/output/OutputPorts';

export class BcryptPasswordHasher implements PasswordHasherPort {
  async hash(plano: string): Promise<string> {
    return bcrypt.hash(plano, 10);
  }

  async verificar(plano: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plano, hash);
  }
}

export class JwtTokenProvider implements TokenProviderPort {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  emitir(payload: { usuarioId: string; rol: RolUsuario }): string {
    return jwt.sign({ sub: payload.usuarioId, rol: payload.rol }, this.secret, {
      expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  verificar(token: string): { usuarioId: string; rol: RolUsuario } {
    const decoded = jwt.verify(token, this.secret) as jwt.JwtPayload;
    return { usuarioId: String(decoded.sub), rol: decoded.rol as RolUsuario };
  }
}

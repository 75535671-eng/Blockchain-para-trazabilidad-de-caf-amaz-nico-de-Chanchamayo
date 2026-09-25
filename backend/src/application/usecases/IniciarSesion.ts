import { ValidationError } from '../../domain/errors/DomainError';
import { IniciarSesionUseCase } from '../ports/input/UseCases';
import { PasswordHasherPort, ProductorRepositoryPort, TokenProviderPort, UsuarioRepositoryPort } from '../ports/output/OutputPorts';
import { aUsuarioDto } from './RegistrarUsuario';

export class IniciarSesion implements IniciarSesionUseCase {
  constructor(
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly hasher: PasswordHasherPort,
    private readonly tokens: TokenProviderPort,
  ) {}

  async ejecutar(comando: { email: string; password: string }) {
    const usuario = await this.usuarios.buscarPorEmail(comando.email.trim().toLowerCase());
    const valido = usuario ? await this.hasher.verificar(comando.password, usuario.passwordHash) : false;
    if (!usuario || !valido) {
      throw new ValidationError('El correo o la contraseña no son válidos.');
    }
    const productor = await this.productores.buscarPorUsuarioId(usuario.id);
    return {
      token: this.tokens.emitir({ usuarioId: usuario.id, rol: usuario.rol }),
      usuario: aUsuarioDto(usuario),
      productorId: productor?.id ?? null,
    };
  }
}

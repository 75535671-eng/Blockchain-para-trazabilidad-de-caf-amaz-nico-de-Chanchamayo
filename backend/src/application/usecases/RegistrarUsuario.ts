import { Productor } from '../../domain/entities/Productor';
import { Usuario } from '../../domain/entities/Usuario';
import { ConflictError } from '../../domain/errors/DomainError';
import { ProductorDto, UsuarioDto } from '../dto/dtos';
import { RegistrarUsuarioUseCase } from '../ports/input/UseCases';
import { PasswordHasherPort, ProductorRepositoryPort, RegistroCuentaProductorPort, UsuarioRepositoryPort } from '../ports/output/OutputPorts';
import { nuevoId, validarPasswordPlano } from '../support/apoyo';

export class RegistrarUsuario implements RegistrarUsuarioUseCase {
  constructor(
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly productores: ProductorRepositoryPort,
    private readonly registro: RegistroCuentaProductorPort,
    private readonly hasher: PasswordHasherPort,
  ) {}

  async ejecutar(comando: {
    nombre: string;
    email: string;
    password: string;
    documento: string;
    telefono?: string | null;
    organizacion?: string | null;
  }): Promise<UsuarioDto> {
    validarPasswordPlano(comando.password);
    const usuario = Usuario.crear({
      id: nuevoId(),
      nombre: comando.nombre,
      email: comando.email,
      passwordHash: await this.hasher.hash(comando.password),
      rol: 'PRODUCTOR',
    });
    const productor = Productor.crear({
      id: nuevoId(),
      usuarioId: usuario.id,
      nombre: comando.nombre,
      documento: comando.documento,
      telefono: comando.telefono,
      organizacion: comando.organizacion,
    });
    if (await this.usuarios.buscarPorEmail(usuario.email.valor)) {
      throw new ConflictError('Ya existe un usuario con ese correo.');
    }
    if (await this.productores.buscarPorDocumento(productor.documento.valor)) {
      throw new ConflictError('Ya existe un productor con ese documento.');
    }
    await this.registro.guardar(usuario, productor);
    return aUsuarioDto(usuario);
  }
}

export function aUsuarioDto(usuario: Usuario): UsuarioDto {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email.valor,
    rol: usuario.rol,
  };
}

export function aProductorDto(productor: Productor): ProductorDto {
  return {
    id: productor.id,
    usuarioId: productor.usuarioId,
    nombre: productor.nombre,
    documento: productor.documento.valor,
    telefono: productor.telefono,
    organizacion: productor.organizacion,
  };
}

import { Router } from 'express';
import { LoteController } from './LoteController';
import { InMemoryLoteRepository } from '../repositories/InMemoryLoteRepository'; // 👈 Importar el mock
import { RegistrarLote } from '../../application/RegistrarLote';
import { ConsultarTrazabilidad } from '../../application/ConsultarTrazabilidad';

const router = Router();

// Usar el repositorio en memoria en lugar de Postgres:
// Usar el repositorio en memoria castedeado a 'any':
const loteRepo = new InMemoryLoteRepository();
const registrarLote = new RegistrarLote(loteRepo as any);
const consultarTrazabilidad = new ConsultarTrazabilidad(loteRepo as any);

const loteController = new LoteController(registrarLote, consultarTrazabilidad);

router.post('/lotes', (req, res) => loteController.registrar(req, res));
router.get('/lotes/:codigo', (req, res) => loteController.consultar(req, res));

export default router;
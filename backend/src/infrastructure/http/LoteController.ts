import { Request, Response } from 'express';
import { RegistrarLote } from '../../application/RegistrarLote';
import { ConsultarTrazabilidad } from '../../application/ConsultarTrazabilidad';

export class LoteController {
  constructor(
    private registrarLoteUseCase: RegistrarLote,
    private consultarTrazabilidadUseCase: ConsultarTrazabilidad
  ) {}

  public registrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const { codigoLote, idParcela, variedad, pesoKg, altitudMsnm, fechaCosecha } = req.body;
      const lote = await this.registrarLoteUseCase.ejecutar({
        codigoLote,
        idParcela,
        variedad,
        pesoKg: Number(pesoKg),
        altitudMsnm: Number(altitudMsnm),
        fechaCosecha: new Date(fechaCosecha)
      });
      res.status(201).json({ ok: true, data: lote });
    } catch (error: any) {
      res.status(400).json({ ok: false, mensaje: error.message });
    }
  };

  public consultar = async (req: Request, res: Response): Promise<void> => {
    try {
      const { codigo } = req.params;
      const lote = await this.consultarTrazabilidadUseCase.ejecutar(codigo as string);
      res.status(200).json({ ok: true, data: lote });
    } catch (error: any) {
      res.status(404).json({ ok: false, mensaje: error.message });
    }
  };
}
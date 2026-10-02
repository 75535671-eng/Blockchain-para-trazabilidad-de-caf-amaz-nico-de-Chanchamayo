export class InMemoryLoteRepository {
  private lotes: any[] = [];

  async guardar(lote: any): Promise<any> {
    this.lotes.push(lote);
    return lote;
  }

  async obtenerPorCodigo(codigo: string): Promise<any> {
    const encontrado = this.lotes.find((item: any) => {
      const itemCodigo = typeof item.getCodigo === 'function' 
        ? item.getCodigo() 
        : (item.codigo || item.codigoLote);
      return itemCodigo === codigo;
    });
    return encontrado || null;
  }
}
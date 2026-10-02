import express from 'express';
import cors from 'cors'; // 👈 1. Importar cors
import loteRoutes from './infrastructure/http/loteRoutes';

const app = express();

app.use(cors()); // 👈 2. Permitir peticiones desde React (http://localhost:5173)
app.use(express.json());

app.use('/api/v1', loteRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend ejecutándose en http://localhost:${PORT}`);
});
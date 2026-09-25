import { createApp } from './app';
import { createProductionContainer, leerConfig } from '../configuration/container';

const config = leerConfig();
const app = createApp(createProductionContainer(config));

app.listen(config.port, () => {
  console.log(`API escuchando en el puerto ${config.port}`);
});

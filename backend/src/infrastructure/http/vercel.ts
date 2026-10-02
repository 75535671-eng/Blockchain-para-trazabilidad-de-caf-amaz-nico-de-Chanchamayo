import express from 'express';
import { createApp } from './app';
import { createProductionContainer, leerConfig } from '../configuration/container';

const api = createApp(createProductionContainer(leerConfig()));
const app = express();

app.use((req, _res, next) => {
  const url = req.url ?? '/';
  if (!url.startsWith('/api')) {
    req.url = `/api${url.startsWith('/') ? url : `/${url}`}`;
  }
  next();
});

app.use(api);

export const maxDuration = 30;
export default app;

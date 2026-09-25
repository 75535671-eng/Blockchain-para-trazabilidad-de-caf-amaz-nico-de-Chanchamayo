import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
  { path: 'registro', loadComponent: () => import('./features/auth/registro.component').then((m) => m.RegistroComponent) },
  {
    path: 'inicio',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'productores',
    canActivate: [authGuard],
    loadComponent: () => import('./features/productores/productores.component').then((m) => m.ProductoresComponent),
  },
  {
    path: 'parcelas',
    canActivate: [authGuard],
    loadComponent: () => import('./features/parcelas/parcelas.component').then((m) => m.ParcelasComponent),
  },
  {
    path: 'lotes',
    canActivate: [authGuard],
    loadComponent: () => import('./features/lotes/lotes.component').then((m) => m.LotesComponent),
  },
  {
    path: 'lotes/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/lotes/lote-detalle.component').then((m) => m.LoteDetalleComponent),
  },
  {
    path: 'analisis',
    canActivate: [authGuard],
    loadComponent: () => import('./features/analisis/analisis.component').then((m) => m.AnalisisComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: '**', redirectTo: 'inicio' },
];

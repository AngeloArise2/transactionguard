import { Routes } from '@angular/router';

import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register.component';
import { TransactionListComponent } from './features/transactions/transaction-list.component';
import { TransactionCreateComponent } from './features/transactions/transaction-create.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'transactions', component: TransactionListComponent, canActivate: [authGuard] },
  { path: 'transactions/new', component: TransactionCreateComponent, canActivate: [authGuard] },
];

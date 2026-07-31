import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { TransactionRequest, TransactionResponse } from './interfaces';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  constructor(private readonly http: HttpClient) {}

  findByCustomerId(customerId: number): Observable<TransactionResponse[]> {
    return this.http.get<TransactionResponse[]>('/api/transactions', {
      params: { customerId: String(customerId) },
    });
  }

  create(request: TransactionRequest): Observable<TransactionResponse> {
    return this.http.post<TransactionResponse>('/api/transactions', request);
  }
}

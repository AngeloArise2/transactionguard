import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { CustomerRequest, CustomerResponse, Page } from './interfaces';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Page<CustomerResponse>> {
    return this.http.get<Page<CustomerResponse>>('/api/customers', {
      params: { page: '0', size: '100' },
    });
  }

  getById(id: number): Observable<CustomerResponse> {
    return this.http.get<CustomerResponse>(`/api/customers/${id}`);
  }

  create(request: CustomerRequest): Observable<CustomerResponse> {
    return this.http.post<CustomerResponse>('/api/customers', request);
  }
}

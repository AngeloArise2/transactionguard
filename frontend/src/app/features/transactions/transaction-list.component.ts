import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CustomerService } from '../../core/customer.service';
import { TransactionService } from '../../core/transaction.service';
import { CustomerResponse, TransactionResponse } from '../../core/interfaces';

@Component({
  selector: 'app-transaction-list',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './transaction-list.component.html',
  styleUrl: './transaction-list.component.scss',
})
export class TransactionListComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly transactionService = inject(TransactionService);

  protected readonly customers = signal<CustomerResponse[]>([]);
  protected readonly transactions = signal<TransactionResponse[]>([]);
  protected readonly selectedCustomerId = signal<number | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loading.set(true);
    this.customerService.getAll().subscribe({
      next: (page) => {
        this.customers.set(page.content);
        if (page.content.length > 0) {
          // Auto-select the first customer so the table has content on first paint.
          this.onCustomerChange(page.content[0].id);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load customers');
      },
    });
  }

  onCustomerChange(customerId: number): void {
    this.selectedCustomerId.set(customerId);
    this.error.set(null);
    this.loading.set(true);
    this.transactionService.findByCustomerId(customerId).subscribe({
      next: (transactions) => {
        this.transactions.set(transactions);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load transactions');
      },
    });
  }

  formatAmount(amount: number): string {
    // Locale-aware currency formatting keeps amounts readable and unambiguous.
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }
}

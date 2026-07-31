import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CustomerService } from '../../core/customer.service';
import { TransactionService } from '../../core/transaction.service';
import { CustomerResponse } from '../../core/interfaces';

@Component({
  selector: 'app-transaction-create',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './transaction-create.component.html',
  styleUrl: './transaction-create.component.scss',
})
export class TransactionCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly transactionService = inject(TransactionService);
  private readonly router = inject(Router);

  protected readonly customers = signal<CustomerResponse[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    customerId: [0, [Validators.required, Validators.min(1)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    merchant: ['', [Validators.required]],
    category: [''],
  });

  ngOnInit(): void {
    this.customerService.getAll().subscribe({
      next: (page) => {
        this.customers.set(page.content);
        if (page.content.length > 0) {
          this.form.controls.customerId.setValue(page.content[0].id);
        }
      },
      error: () => this.error.set('Failed to load customers'),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    this.error.set(null);
    this.transactionService
      .create({
        customerId: value.customerId,
        amount: value.amount,
        merchant: value.merchant,
        category: value.category || null,
      })
      .subscribe({
        next: () => this.router.navigate(['/transactions']),
        error: () => this.error.set('Failed to create transaction'),
      });
  }
}

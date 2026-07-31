import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSignal = signal<Toast[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();
  private nextId = 1;

  show(message: string, type: 'error' | 'success' = 'error'): void {
    const toast: Toast = { id: this.nextId++, message, type };
    this.toastsSignal.update((list) => [...list, toast]);
    // Auto-dismiss after 4s so toasts never require manual dismissal.
    setTimeout(() => {
      this.toastsSignal.update((list) => list.filter((t) => t.id !== toast.id));
    }, 4000);
  }
}

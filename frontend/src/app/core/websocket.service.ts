import { Injectable, signal } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';

import { FlaggedTransaction } from './interfaces';

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private client: Client | null = null;
  readonly flaggedTransactions = signal<FlaggedTransaction[]>([]);
  // Emits 'connected'/'disconnected' so the dashboard can show live connection state.
  readonly onStatusChange = new Subject<string>();

  connect(): void {
    if (this.client?.active) {
      return;
    }
    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        this.onStatusChange.next('connected');
        // Safe: onConnect only fires while this.client is the active connection.
        this.client!.subscribe('/topic/flagged-transactions', (message) => {
          const flagged: FlaggedTransaction = JSON.parse(message.body);
          // Cap the in-memory feed at 50 so an idle dashboard can't grow unbounded.
          this.flaggedTransactions.update((list) => [flagged, ...list].slice(0, 50));
        });
      },
      onWebSocketClose: () => this.onStatusChange.next('disconnected'),
      reconnectDelay: 5000,
    });
    this.client.activate();
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
  }
}

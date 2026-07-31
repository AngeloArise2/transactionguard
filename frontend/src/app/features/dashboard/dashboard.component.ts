import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { Subscription } from 'rxjs';

import { WebsocketService } from '../../core/websocket.service';
import { FlaggedTransaction } from '../../core/interfaces';

const BUCKET_MINUTES = 10;

function buildBuckets(events: FlaggedTransaction[]): { labels: string[]; counts: number[] } {
  const now = Date.now();
  const labels: string[] = [];
  const counts: number[] = [];
  // Rolling window of one-minute buckets; older buckets fall off as time moves on.
  for (let i = BUCKET_MINUTES - 1; i >= 0; i--) {
    const bucketStart = new Date(now - i * 60_000);
    labels.push(bucketStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    counts.push(0);
  }
  for (const event of events) {
    const minutesAgo = Math.floor((now - new Date(event.timestamp).getTime()) / 60_000);
    const index = BUCKET_MINUTES - 1 - minutesAgo;
    if (index >= 0 && index < BUCKET_MINUTES) {
      counts[index]++;
    }
  }
  return { labels, counts };
}

@Component({
  selector: 'app-dashboard',
  imports: [BaseChartDirective, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly websocketService = inject(WebsocketService);
  private statusSubscription: Subscription | null = null;

  protected readonly flaggedTransactions = this.websocketService.flaggedTransactions;
  protected readonly connectionStatus = signal<string>('connecting');

  // Recomputes on every incoming event so both feed and chart stay live without a reload.
  protected readonly chartData = computed<ChartData<'bar'>>(() => {
    const { labels, counts } = buildBuckets(this.flaggedTransactions());
    return {
      labels,
      datasets: [
        {
          label: 'Flagged transactions',
          data: counts,
          backgroundColor: '#dc2626',
          borderRadius: 4,
        },
      ],
    };
  });

  protected readonly chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  };

  ngOnInit(): void {
    this.websocketService.connect();
    // STOMP reconnects on its own; reflect the state once the first connection is established.
    // Unsubscribe only our own Subscription — never the shared Subject itself.
    this.statusSubscription = this.websocketService.onStatusChange.subscribe((status) =>
      this.connectionStatus.set(status),
    );
  }

  ngOnDestroy(): void {
    this.statusSubscription?.unsubscribe();
    this.websocketService.disconnect();
  }

  formatAmount(amount: number): string {
    // Locale-aware currency formatting keeps amounts readable and unambiguous.
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }
}

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {

  notifications: any[] = [];
  isLoading    = true;
  userId!: number;
  unreadCount  = 0;

  private notifSub!: Subscription;

  constructor(
    private auth:    AuthService,
    private notifSvc: NotificationService
  ) {}

  ngOnInit(): void {
    this.userId = this.auth.getUserId()!;
    this.notifSvc.initSSE(this.userId);
    this.loadAll();
  }

  ngOnDestroy(): void { this.notifSub?.unsubscribe(); }

  loadAll(): void {
    this.isLoading = true;
    this.notifSvc.getAll(this.userId).subscribe({
      next: (data) => {
        this.notifications = data;
        this.unreadCount   = data.filter((n: any) => !n.isRead).length;
        this.notifSvc.setUnread(this.unreadCount);
        this.isLoading     = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  markRead(n: any): void {
    if (n.isRead) return;
    this.notifSvc.markRead(n.id).subscribe(() => {
      n.isRead = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.notifSvc.decrementUnread();
    });
  }

  markAllRead(): void {
    this.notifSvc.markAllRead(this.userId).subscribe(() => {
      this.notifications.forEach((n: any) => n.isRead = true);
      this.unreadCount = 0;
      this.notifSvc.resetUnread();
    });
  }

  typeIcon(type: string): string {
    switch ((type || '').toUpperCase()) {
      case 'EMERGENCY_JOB': return 'bi-exclamation-triangle-fill text-danger';
      case 'SHIFT':         return 'bi-calendar-check-fill text-success';
      case 'PAYMENT':       return 'bi-cash-stack text-primary';
      default:              return 'bi-bell-fill text-secondary';
    }
  }

  typeLabel(type: string): string {
    switch ((type || '').toUpperCase()) {
      case 'EMERGENCY_JOB': return 'Emergency';
      case 'SHIFT':         return 'Shift';
      case 'PAYMENT':       return 'Payment';
      default:              return 'Notification';
    }
  }

  typeBadgeClass(type: string): string {
    switch ((type || '').toUpperCase()) {
      case 'EMERGENCY_JOB': return 'badge-emerg';
      case 'SHIFT':         return 'badge-shift';
      case 'PAYMENT':       return 'badge-pay';
      default:              return 'badge-general';
    }
  }

  formatDate(d: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    const now = new Date();
    const diff = Math.floor((now.getTime() - dt.getTime()) / 1000);
    if (diff < 60)   return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  logout(): void { this.auth.logout(); }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$: Observable<Notification[]> = this.notificationsSubject.asObservable();

  private readonly DEFAULT_DURATION = 5000; // 5 seconds

  constructor() {}

  /**
   * Show success notification
   */
  success(title: string, message?: string, duration?: number): string {
    return this.show({
      type: 'success',
      title,
      message,
      duration: duration || this.DEFAULT_DURATION
    });
  }

  /**
   * Show error notification
   */
  error(title: string, message?: string, persistent: boolean = false): string {
    return this.show({
      type: 'error',
      title,
      message,
      persistent,
      duration: persistent ? undefined : this.DEFAULT_DURATION * 2 // Longer for errors
    });
  }

  /**
   * Show warning notification
   */
  warning(title: string, message?: string, duration?: number): string {
    return this.show({
      type: 'warning',
      title,
      message,
      duration: duration || this.DEFAULT_DURATION
    });
  }

  /**
   * Show info notification
   */
  info(title: string, message?: string, duration?: number): string {
    return this.show({
      type: 'info',
      title,
      message,
      duration: duration || this.DEFAULT_DURATION
    });
  }

  /**
   * Show custom notification
   */
  show(notification: Omit<Notification, 'id'>): string {
    const id = this.generateId();
    const newNotification: Notification = {
      id,
      ...notification
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, newNotification]);

    // Auto-dismiss after duration (if not persistent)
    if (!notification.persistent && notification.duration) {
      setTimeout(() => {
        this.dismiss(id);
      }, notification.duration);
    }

    return id;
  }

  /**
   * Dismiss notification by ID
   */
  dismiss(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this.notificationsSubject.next(filteredNotifications);
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    this.notificationsSubject.next([]);
  }

  /**
   * Get notification by ID
   */
  getNotification(id: string): Observable<Notification | undefined> {
    return this.notifications$.pipe(
      filter(notifications => notifications.some(n => n.id === id)),
      map(notifications => notifications.find(n => n.id === id))
    );
  }

  /**
   * Show API error notification with retry option
   */
  apiError(error: any, retryAction?: () => void): string {
    let title = 'API Fehler';
    let message = 'Ein unbekannter Fehler ist aufgetreten';

    if (error?.error?.message) {
      message = error.error.message;
    } else if (error?.message) {
      message = error.message;
    }

    if (error?.status) {
      title = `Fehler ${error.status}`;
    }

    const actions: NotificationAction[] = [];
    
    if (retryAction) {
      actions.push({
        label: 'Wiederholen',
        action: retryAction,
        style: 'primary'
      });
    }

    return this.show({
      type: 'error',
      title,
      message,
      persistent: true,
      actions
    });
  }

  /**
   * Show confirmation notification with actions
   */
  confirm(
    title: string, 
    message: string, 
    onConfirm: () => void, 
    onCancel?: () => void
  ): string {
    const actions: NotificationAction[] = [
      {
        label: 'Bestätigen',
        action: () => {
          onConfirm();
        },
        style: 'primary'
      }
    ];

    if (onCancel) {
      actions.push({
        label: 'Abbrechen',
        action: () => {
          onCancel();
        },
        style: 'secondary'
      });
    }

    return this.show({
      type: 'warning',
      title,
      message,
      persistent: true,
      actions
    });
  }

  /**
   * Generate unique ID for notification
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}

// Import map operator
import { map } from 'rxjs/operators';
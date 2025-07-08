import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private loadingCount = 0;

  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  constructor() {}

  /**
   * Show loading spinner
   */
  show(): void {
    this.loadingCount++;
    if (this.loadingCount === 1) {
      this.loadingSubject.next(true);
    }
  }

  /**
   * Hide loading spinner
   */
  hide(): void {
    if (this.loadingCount > 0) {
      this.loadingCount--;
    }
    
    if (this.loadingCount === 0) {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Force hide loading spinner (reset counter)
   */
  forceHide(): void {
    this.loadingCount = 0;
    this.loadingSubject.next(false);
  }

  /**
   * Get current loading state
   */
  isLoading(): boolean {
    return this.loadingSubject.value;
  }

  /**
   * Execute function with loading state
   */
  withLoading<T>(operation: () => Observable<T>): Observable<T> {
    this.show();
    const result = operation();
    
    // Hide loading when operation completes (success or error)
    result.subscribe({
      next: () => {},
      error: () => this.hide(),
      complete: () => this.hide()
    });

    return result;
  }
}
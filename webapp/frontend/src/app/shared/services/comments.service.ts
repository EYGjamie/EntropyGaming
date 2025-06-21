import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Comment {
  id: number;
  content: string;
  authorId: number;
  author: {
    id: number;
    username: string;
    profile: {
      displayName?: string;
      avatarUrl?: string;
    };
  };
  entityType: string;
  entityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  content: string;
  entityType: string;
  entityId: string;
}

export interface UpdateCommentRequest {
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommentsService {
  private readonly apiUrl = '/api/comments';
  private commentsSubject = new BehaviorSubject<Comment[]>([]);
  public comments$ = this.commentsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get comments for a specific entity
   */
  getCommentsForEntity(entityType: string, entityId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/${entityType}/${entityId}`)
      .pipe(
        tap(comments => this.commentsSubject.next(comments))
      );
  }

  /**
   * Alternative method name for compatibility
   */
  getComments(entityType: string, entityId: string): Observable<Comment[]> {
    return this.getCommentsForEntity(entityType, entityId);
  }

  /**
   * Create a new comment
   */
  createComment(request: CreateCommentRequest): Observable<Comment> {
    return this.http.post<Comment>(this.apiUrl, request)
      .pipe(
        tap(newComment => {
          const currentComments = this.commentsSubject.value;
          this.commentsSubject.next([...currentComments, newComment]);
        })
      );
  }

  /**
   * Alternative method name for compatibility
   */
  addComment(request: CreateCommentRequest): Observable<Comment> {
    return this.createComment(request);
  }

  /**
   * Update an existing comment
   */
  updateComment(commentId: number, request: UpdateCommentRequest): Observable<Comment> {
    return this.http.put<Comment>(`${this.apiUrl}/${commentId}`, request)
      .pipe(
        tap(updatedComment => {
          const currentComments = this.commentsSubject.value;
          const index = currentComments.findIndex(c => c.id === commentId);
          if (index !== -1) {
            currentComments[index] = updatedComment;
            this.commentsSubject.next([...currentComments]);
          }
        })
      );
  }

  /**
   * Delete a comment
   */
  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${commentId}`)
      .pipe(
        tap(() => {
          const currentComments = this.commentsSubject.value;
          const filteredComments = currentComments.filter(c => c.id !== commentId);
          this.commentsSubject.next(filteredComments);
        })
      );
  }

  /**
   * Get a single comment by ID
   */
  getComment(commentId: number): Observable<Comment> {
    return this.http.get<Comment>(`${this.apiUrl}/${commentId}`);
  }

  /**
   * Clear the local comments cache
   */
  clearComments(): void {
    this.commentsSubject.next([]);
  }

  /**
   * Check if user can edit comment
   */
  canEditComment(comment: Comment, currentUserId: number): boolean {
    return comment.authorId === currentUserId;
  }

  /**
   * Check if user can delete comment
   */
  canDeleteComment(comment: Comment, currentUserId: number, userRoles: string[]): boolean {
    // User can delete their own comments or admins can delete any comment
    return comment.authorId === currentUserId || userRoles.includes('admin');
  }

  /**
   * Format comment date
   */
  formatCommentDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Gerade eben';
    } else if (diffInMinutes < 60) {
      return `vor ${diffInMinutes} Minute${diffInMinutes !== 1 ? 'n' : ''}`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `vor ${hours} Stunde${hours !== 1 ? 'n' : ''}`;
    } else {
      return date.toLocaleDateString('de-DE');
    }
  }

  /**
   * Get comment author display name
   */
  getAuthorDisplayName(comment: Comment): string {
    return comment.author.profile?.displayName || comment.author.username;
  }

  /**
   * Get comment author avatar
   */
  getAuthorAvatar(comment: Comment): string | null {
    return comment.author.profile?.avatarUrl || null;
  }

  /**
   * Get comment author initials
   */
  getAuthorInitials(comment: Comment): string {
    const name = this.getAuthorDisplayName(comment);
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  }
}
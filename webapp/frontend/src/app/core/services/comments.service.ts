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
    profile?: {
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
}
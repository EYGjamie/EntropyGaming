import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
}

interface CommentData {
  content: string;
  entityType: string;
  entityId: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommentsService {
  private apiUrl = '/api/comments';

  constructor(private http: HttpClient) {}

  getComments(entityType: string, entityId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/${entityType}/${entityId}`);
  }

  addComment(data: CommentData): Observable<Comment> {
    return this.http.post<Comment>(this.apiUrl, data);
  }

  updateComment(commentId: string, content: string): Observable<Comment> {
    return this.http.put<Comment>(`${this.apiUrl}/${commentId}`, { content });
  }

  deleteComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${commentId}`);
  }
}
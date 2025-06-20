import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Comment {
  id: number;
  content: string;
  entityType: string;
  entityId: string;
  isPrivate: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    username: string;
    role: {
      name: string;
      color: string;
    };
  };
}

export interface CreateCommentRequest {
  content: string;
  entityType: string;
  entityId: string;
  isPrivate?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CommentsService {
  private readonly API_BASE = '/api/comments';

  constructor(private http: HttpClient) {}

  createComment(comment: CreateCommentRequest): Observable<Comment> {
    return this.http.post<Comment>(this.API_BASE, comment);
  }

  getCommentsForEntity(entityType: string, entityId: string, includePrivate = false): Observable<Comment[]> {
    let params = new HttpParams();
    if (includePrivate) {
      params = params.set('includePrivate', 'true');
    }
    
    return this.http.get<Comment[]>(`${this.API_BASE}/entity/${entityType}/${entityId}`, { params });
  }

  updateComment(commentId: number, content: string, isPrivate?: boolean): Observable<Comment> {
    const update: any = { content };
    if (isPrivate !== undefined) {
      update.isPrivate = isPrivate;
    }
    
    return this.http.patch<Comment>(`${this.API_BASE}/${commentId}`, update);
  }

  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/${commentId}`);
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.API_BASE}/stats`);
  }
}
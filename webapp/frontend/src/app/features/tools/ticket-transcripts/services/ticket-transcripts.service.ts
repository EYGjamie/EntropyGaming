import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface TicketTranscript {
  id: string;
  ticketId: number;
  channelId: string;
  channelName: string;
  creatorId: string;
  creatorUsername: string;
  createdAt: string;
  closedAt?: string;
  messageCount: number;
  participantCount: number;
  status: 'open' | 'closed' | 'archived';
  category?: string;
  topic?: string;
  tags: string[];
  fileSize: number;
  filePath: string;
  participants: TranscriptParticipant[];
  comments?: number;
}

export interface TranscriptParticipant {
  userId: string;
  username: string;
  messageCount: number;
  joinedAt: string;
  leftAt?: string;
}

export interface TranscriptMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  attachments?: TranscriptAttachment[];
  embeds?: any[];
  reactions?: any[];
  isBot: boolean;
  isSystemMessage: boolean;
}

export interface TranscriptAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  contentType: string;
  localPath?: string;
}

export interface TicketTranscriptStats {
  totalTranscripts: number;
  openTickets: number;
  closedTickets: number;
  archivedTickets: number;
  totalMessages: number;
  avgMessagesPerTicket: number;
  avgResolutionTime: number; // in hours
  topCategories: { category: string; count: number }[];
}

export interface TranscriptFilters {
  search?: string;
  status?: 'open' | 'closed' | 'archived' | 'all';
  category?: string;
  creatorId?: string;
  participantId?: string;
  createdAfter?: string;
  createdBefore?: string;
  closedAfter?: string;
  closedBefore?: string;
  minMessages?: number;
  maxMessages?: number;
  tags?: string[];
}

export interface PaginatedTranscripts {
  transcripts: TicketTranscript[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class TicketTranscriptsService {
  private readonly apiUrl = '/api/tools/ticket-transcripts';
  private transcriptsSubject = new BehaviorSubject<TicketTranscript[]>([]);
  public transcripts$ = this.transcriptsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of ticket transcripts
   */
  getTranscripts(page: number = 1, limit: number = 50, filters?: TranscriptFilters): Observable<PaginatedTranscripts> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            params = params.set(key, value.join(','));
          } else {
            params = params.set(key, value.toString());
          }
        }
      });
    }

    return this.http.get<PaginatedTranscripts>(this.apiUrl, { params })
      .pipe(
        tap(response => this.transcriptsSubject.next(response.transcripts))
      );
  }

  /**
   * Get a specific ticket transcript by ID
   */
  getTranscript(transcriptId: string): Observable<TicketTranscript> {
    return this.http.get<TicketTranscript>(`${this.apiUrl}/${transcriptId}`);
  }

  /**
   * Get messages from a ticket transcript
   */
  getTranscriptMessages(transcriptId: string, page: number = 1, limit: number = 100): Observable<{
    messages: TranscriptMessage[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<{
      messages: TranscriptMessage[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`${this.apiUrl}/${transcriptId}/messages`, { params });
  }

  /**
   * Search within transcript messages
   */
  searchTranscriptMessages(transcriptId: string, query: string): Observable<TranscriptMessage[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<TranscriptMessage[]>(`${this.apiUrl}/${transcriptId}/search`, { params });
  }

  /**
   * Get ticket transcript statistics
   */
  getStats(): Observable<TicketTranscriptStats> {
    return this.http.get<TicketTranscriptStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Download transcript as JSON
   */
  downloadTranscript(transcriptId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${transcriptId}/download`, { 
      responseType: 'blob' 
    });
  }

  /**
   * Download transcript as HTML
   */
  downloadTranscriptHTML(transcriptId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${transcriptId}/download/html`, { 
      responseType: 'blob' 
    });
  }

  /**
   * Export transcripts as CSV
   */
  exportTranscripts(filters?: TranscriptFilters): Observable<Blob> {
    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            params = params.set(key, value.join(','));
          } else {
            params = params.set(key, value.toString());
          }
        }
      });
    }

    return this.http.get(`${this.apiUrl}/export`, { 
      params, 
      responseType: 'blob' 
    });
  }

  /**
   * Update transcript metadata (admin only)
   */
  updateTranscript(transcriptId: string, updates: {
    category?: string;
    topic?: string;
    tags?: string[];
    status?: 'open' | 'closed' | 'archived';
  }): Observable<TicketTranscript> {
    return this.http.patch<TicketTranscript>(`${this.apiUrl}/${transcriptId}`, updates);
  }

  /**
   * Delete transcript (admin only)
   */
  deleteTranscript(transcriptId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${transcriptId}`);
  }

  /**
   * Get available categories
   */
  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`);
  }

  /**
   * Get available tags
   */
  getTags(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/tags`);
  }

  /**
   * Search transcripts
   */
  searchTranscripts(query: string, limit: number = 20): Observable<TicketTranscript[]> {
    const params = new HttpParams()
      .set('search', query)
      .set('limit', limit.toString());

    return this.http.get<TicketTranscript[]>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Clear the local transcripts cache
   */
  clearTranscripts(): void {
    this.transcriptsSubject.next([]);
  }

  /**
   * Format transcript duration
   */
  formatDuration(createdAt: string, closedAt?: string): string {
    const start = new Date(createdAt);
    const end = closedAt ? new Date(closedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Get status color class
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'open':
        return 'text-green-600 bg-green-100';
      case 'closed':
        return 'text-blue-600 bg-blue-100';
      case 'archived':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
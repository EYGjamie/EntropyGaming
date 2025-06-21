import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface TicketTranscript {
  filename: string;
  ticketId: string;
  guildId: string;
  channelId: string;
  createdAt: string;
  closedAt: string;
  messageCount: number;
  participants: string[];
  topic?: string;
  size: number;
}

export interface TranscriptDetail {
  filename: string;
  ticketId: string;
  guildId: string;
  channelId: string;
  createdAt: string;
  closedAt: string;
  topic?: string;
  participants: TranscriptParticipant[];
  messages: TranscriptMessage[];
  messageCount: number;
  attachments: TranscriptAttachment[];
}

export interface TranscriptParticipant {
  id: string;
  username: string;
  discriminator: string;
  nickname?: string;
  avatar?: string;
  messageCount: number;
}

export interface TranscriptMessage {
  id: string;
  timestamp: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
    nickname?: string;
    avatar?: string;
  };
  content: string;
  attachments: TranscriptAttachment[];
  embeds: any[];
  reactions: TranscriptReaction[];
  type: 'default' | 'system';
}

export interface TranscriptAttachment {
  id: string;
  filename: string;
  size: number;
  url: string;
  contentType?: string;
}

export interface TranscriptReaction {
  emoji: {
    name: string;
    id?: string;
    animated: boolean;
  };
  count: number;
  users: string[];
}

export interface TranscriptStats {
  totalTranscripts: number;
  totalMessages: number;
  avgMessages: number;
  totalParticipants: number;
  totalAttachments: number;
  oldestTranscript: string;
  newestTranscript: string;
}

export interface TranscriptFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  minMessages?: number;
  maxMessages?: number;
  participant?: string;
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
   * Get paginated list of transcripts
   */
  getTranscripts(page: number = 1, limit: number = 50, filters?: TranscriptFilters): Observable<PaginatedTranscripts> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedTranscripts>(this.apiUrl, { params })
      .pipe(
        tap(response => this.transcriptsSubject.next(response.transcripts))
      );
  }

  /**
   * Get a specific transcript by filename
   */
  getTranscript(filename: string): Observable<TranscriptDetail> {
    return this.http.get<TranscriptDetail>(`${this.apiUrl}/${filename}`);
  }

  /**
   * Get a specific transcript detail by filename (alternative method name)
   */
  getTranscriptDetail(filename: string): Observable<TranscriptDetail> {
    return this.getTranscript(filename);
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
   * Get transcript statistics
   */
  getStats(): Observable<TranscriptStats> {
    return this.http.get<TranscriptStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Get transcripts by date range
   */
  getTranscriptsByDateRange(startDate: string, endDate: string): Observable<TicketTranscript[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<TicketTranscript[]>(`${this.apiUrl}/date-range`, { params });
  }

  /**
   * Download transcript as JSON
   */
  downloadTranscript(filename: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${filename}/download`, { 
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
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get(`${this.apiUrl}/export`, { 
      params, 
      responseType: 'blob' 
    });
  }

  /**
   * Delete a transcript (admin only)
   */
  deleteTranscript(filename: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${filename}`)
      .pipe(
        tap(() => {
          const currentTranscripts = this.transcriptsSubject.value;
          const filteredTranscripts = currentTranscripts.filter(t => t.filename !== filename);
          this.transcriptsSubject.next(filteredTranscripts);
        })
      );
  }

  /**
   * Get user avatar URL
   */
  getAvatarUrl(user: { id: string; avatar?: string }, size: number = 32): string {
    if (user.avatar) {
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
    }
    // Default avatar
    return `https://cdn.discordapp.com/embed/avatars/0.png`;
  }

  /**
   * Format user display name
   */
  getDisplayName(user: { username: string; nickname?: string }): string {
    return user.nickname || user.username;
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

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE');
  }

  /**
   * Format datetime
   */
  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('de-DE');
  }

  /**
   * Get message type display text
   */
  getMessageTypeText(type: string): string {
    switch (type) {
      case 'default': return 'Nachricht';
      case 'system': return 'System';
      default: return 'Unbekannt';
    }
  }

  /**
   * Check if message has attachments
   */
  hasAttachments(message: TranscriptMessage): boolean {
    return message.attachments && message.attachments.length > 0;
  }

  /**
   * Check if message has embeds
   */
  hasEmbeds(message: TranscriptMessage): boolean {
    return message.embeds && message.embeds.length > 0;
  }

  /**
   * Check if message has reactions
   */
  hasReactions(message: TranscriptMessage): boolean {
    return message.reactions && message.reactions.length > 0;
  }

  /**
   * Clear transcripts cache
   */
  clearTranscripts(): void {
    this.transcriptsSubject.next([]);
  }
}
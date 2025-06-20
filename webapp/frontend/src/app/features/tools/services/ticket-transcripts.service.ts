import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface TicketTranscript {
  filename: string;
  ticketId: string;
  userId: string;
  username: string;
  messageCount: number;
  createdAt: string;
  closedAt: string;
  category: string;
}

interface TranscriptDetail {
  filename: string;
  ticketId: string;
  userId: string;
  username: string;
  category: string;
  createdAt: string;
  closedAt: string;
  messageCount: number;
  messages: any[];
}

interface TranscriptStats {
  totalTranscripts: number;
  totalMessages: number;
  avgMessages: number;
  categories: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class TicketTranscriptsService {
  private apiUrl = '/api/tools/ticket-transcripts';

  constructor(private http: HttpClient) {}

  getTranscripts(): Observable<TicketTranscript[]> {
    return this.http.get<TicketTranscript[]>(this.apiUrl);
  }

  getTranscriptDetail(filename: string): Observable<TranscriptDetail> {
    return this.http.get<TranscriptDetail>(`${this.apiUrl}/${filename}`);
  }

  downloadTranscript(filename: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${filename}/download`, {
      responseType: 'blob'
    });
  }

  getStats(): Observable<TranscriptStats> {
    return this.http.get<TranscriptStats>(`${this.apiUrl}/stats`);
  }
}
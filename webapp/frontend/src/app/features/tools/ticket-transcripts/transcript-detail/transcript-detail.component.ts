import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TicketTranscriptsService } from '../services/ticket-transcripts.service';
import { CommentsService } from '../../../shared/services/comments.service';

interface TranscriptMessage {
  id: string;
  author: string;
  authorId: string;
  content: string;
  timestamp: string;
  attachments?: string[];
  embeds?: any[];
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
  messages: TranscriptMessage[];
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

@Component({
  selector: 'app-transcript-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [TicketTranscriptsService, CommentsService],
  template: `
    <div class="space-y-6">
      <!-- Back Button -->
      <div>
        <button
          (click)="goBack()"
          class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          ← Zurück zur Übersicht
        </button>
      </div>

      <!-- Transcript Header -->
      <div class="bg-white shadow rounded-lg" *ngIf="transcript">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Ticket {{ transcript.ticketId }}</h1>
              <div class="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                <span>👤 {{ transcript.username }}</span>
                <span>📁 {{ transcript.category }}</span>
                <span>💬 {{ transcript.messageCount }} Nachrichten</span>
                <span>📅 {{ formatDate(transcript.createdAt) }}</span>
              </div>
            </div>
            <div class="flex space-x-2">
              <button
                (click)="downloadTranscript()"
                class="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
              >
                Download
              </button>
              <span 
                [class.bg-green-100]="transcript.closedAt"
                [class.text-green-800]="transcript.closedAt"
                [class.bg-yellow-100]="!transcript.closedAt"
                [class.text-yellow-800]="!transcript.closedAt"
                class="inline-flex px-3 py-1 text-sm font-medium rounded-full"
              >
                {{ transcript.closedAt ? 'Geschlossen' : 'Offen' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages Container -->
      <div class="bg-white shadow rounded-lg" *ngIf="transcript">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">Nachrichten</h2>
        </div>
        
        <div class="px-6 py-4 max-h-96 overflow-y-auto">
          <div *ngFor="let message of transcript.messages; let i = index" class="mb-4 last:mb-0">
            <div class="flex space-x-3">
              <!-- Avatar -->
              <div class="flex-shrink-0">
                <div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span class="text-white text-xs font-medium">
                    {{ message.author.charAt(0).toUpperCase() }}
                  </span>
                </div>
              </div>
              
              <!-- Message Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2">
                  <h4 class="text-sm font-medium text-gray-900">{{ message.author }}</h4>
                  <span class="text-xs text-gray-500">{{ formatDateTime(message.timestamp) }}</span>
                </div>
                
                <div class="mt-1">
                  <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ message.content }}</p>
                  
                  <!-- Attachments -->
                  <div *ngIf="message.attachments && message.attachments.length > 0" class="mt-2">
                    <div class="text-xs text-gray-500 mb-1">Anhänge:</div>
                    <div class="space-y-1">
                      <div *ngFor="let attachment of message.attachments" 
                           class="text-sm text-indigo-600 hover:text-indigo-800">
                        📎 {{ attachment }}
                      </div>
                    </div>
                  </div>
                  
                  <!-- Embeds -->
                  <div *ngIf="message.embeds && message.embeds.length > 0" class="mt-2">
                    <div *ngFor="let embed of message.embeds" 
                         class="border-l-4 border-indigo-500 pl-3 py-2 bg-gray-50 rounded-r">
                      <div class="text-sm text-gray-700">{{ embed.title || 'Embed' }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Message separator -->
            <div *ngIf="i < transcript.messages.length - 1" class="mt-4 border-b border-gray-100"></div>
          </div>
        </div>
      </div>

      <!-- Comments Section -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">Kommentare zu diesem Ticket</h2>
        </div>
        
        <!-- Add Comment Form -->
        <div class="px-6 py-4 border-b border-gray-200">
          <form [formGroup]="commentForm" (ngSubmit)="addComment()">
            <div class="mb-3">
              <textarea
                formControlName="content"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Kommentar zu diesem Ticket hinzufügen..."
              ></textarea>
            </div>
            <div class="flex justify-end">
              <button
                type="submit"
                [disabled]="commentForm.invalid || isSubmittingComment"
                class="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
              >
                <span *ngIf="isSubmittingComment">Hinzufügen...</span>
                <span *ngIf="!isSubmittingComment">Kommentar hinzufügen</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Comments List -->
        <div class="px-6 py-4">
          <div *ngIf="comments.length === 0" class="text-center py-8">
            <p class="text-gray-500">Noch keine Kommentare zu diesem Ticket vorhanden.</p>
          </div>
          
          <div *ngFor="let comment of comments" class="mb-6 last:mb-0">
            <div class="flex space-x-3">
              <div class="flex-shrink-0">
                <div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span class="text-white text-sm font-medium">
                    {{ comment.authorName.charAt(0).toUpperCase() }}
                  </span>
                </div>
              </div>
              <div class="flex-1">
                <div class="flex items-center space-x-2">
                  <h4 class="text-sm font-medium text-gray-900">{{ comment.authorName }}</h4>
                  <span class="text-sm text-gray-500">{{ formatDateTime(comment.createdAt) }}</span>
                </div>
                <p class="mt-1 text-sm text-gray-700">{{ comment.content }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-2 text-gray-500">Lade Transkript...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 class="text-lg font-medium text-red-900 mb-2">Fehler beim Laden</h3>
        <p class="text-red-700">{{ error }}</p>
        <button
          (click)="loadTranscript()"
          class="mt-4 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  `
})
export class TranscriptDetailComponent implements OnInit {
  transcript: TranscriptDetail | null = null;
  comments: Comment[] = [];
  commentForm: FormGroup;
  isLoading = true;
  isSubmittingComment = false;
  error: string | null = null;
  filename: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private ticketTranscriptsService: TicketTranscriptsService,
    private commentsService: CommentsService
  ) {
    this.commentForm = this.fb.group({
      content: ['']
    });
  }

  ngOnInit(): void {
    this.filename = this.route.snapshot.paramMap.get('filename');
    if (this.filename) {
      this.loadTranscript();
      this.loadComments();
    }
  }

  private loadTranscript(): void {
    if (!this.filename) return;
    
    this.isLoading = true;
    this.error = null;
    
    this.ticketTranscriptsService.getTranscriptDetail(this.filename).subscribe({
      next: (transcript: TranscriptDetail) => {
      this.transcript = transcript;
      this.isLoading = false;
      },
      error: (error: any) => {
      console.error('Error loading transcript:', error);
      this.error = 'Transkript konnte nicht geladen werden.';
      this.isLoading = false;
      }
    });
  }

  private loadComments(): void {
    if (!this.filename) return;
    
    this.commentsService.getComments('ticket_transcript', this.filename).subscribe({
      next: (comments) => {
        this.comments = comments;
      },
      error: (error) => {
        console.error('Error loading comments:', error);
      }
    });
  }

  addComment(): void {
    if (this.commentForm.valid && this.filename) {
      this.isSubmittingComment = true;
      
      const commentData = {
        content: this.commentForm.get('content')?.value,
        entityType: 'ticket_transcript',
        entityId: this.filename
      };

      this.commentsService.addComment(commentData).subscribe({
        next: (comment) => {
          this.comments.unshift(comment);
          this.commentForm.reset();
          this.isSubmittingComment = false;
        },
        error: (error) => {
          console.error('Error adding comment:', error);
          this.isSubmittingComment = false;
        }
      });
    }
  }

  downloadTranscript(): void {
    if (this.filename) {
      this.ticketTranscriptsService.downloadTranscript(this.filename).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.filename!;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error downloading transcript:', error);
        }
      });
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE');
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('de-DE');
  }

  goBack(): void {
    this.router.navigate(['/tools/ticket-transcripts']);
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TicketTranscriptsService, TranscriptDetail, TranscriptMessage, TranscriptParticipant } from '../services/ticket-transcripts.service';
import { CommentsService, Comment } from '../../../../shared/services/comments.service';

@Component({
  selector: 'app-transcript-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transcript-detail.component.html',
  styleUrl: './transcript-detail.component.css'
})
export class TranscriptDetailComponent implements OnInit {
  transcript: TranscriptDetail | null = null;
  comments: Comment[] = [];
  commentForm: FormGroup;
  isLoading = true;
  isSubmittingComment = false;
  error: string | null = null;
  filename: string | null = null;
  showMessages = true;
  filteredMessages: TranscriptMessage[] = [];
  messageFilter = '';
  selectedParticipant = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private ticketTranscriptsService: TicketTranscriptsService,
    private commentsService: CommentsService
  ) {
    this.commentForm = this.createCommentForm();
  }

  ngOnInit(): void {
    this.filename = this.route.snapshot.paramMap.get('filename');
    if (this.filename) {
      this.loadTranscript();
      this.loadComments();
    } else {
      this.error = 'Transkript-Dateiname nicht gefunden';
      this.isLoading = false;
    }
  }

  private createCommentForm(): FormGroup {
    return this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(1000)]]
    });
  }

  private loadTranscript(): void {
    if (!this.filename) return;
    
    this.isLoading = true;
    this.error = null;
    
    this.ticketTranscriptsService.getTranscriptDetail(this.filename).subscribe({
      next: (transcript) => {
        this.transcript = transcript;
        this.filteredMessages = transcript.messages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading transcript:', error);
        this.error = 'Transkript konnte nicht geladen werden';
        this.isLoading = false;
      }
    });
  }

  private loadComments(): void {
    if (!this.filename) return;
    
    this.commentsService.getCommentsForEntity('ticket_transcript', this.filename).subscribe({
      next: (comments) => {
        this.comments = comments;
      },
      error: (error) => {
        console.error('Error loading comments:', error);
      }
    });
  }

  addComment(): void {
    if (this.commentForm.valid && this.filename && !this.isSubmittingComment) {
      this.isSubmittingComment = true;
      
      const commentData = {
        content: this.commentForm.get('content')?.value.trim(),
        entityType: 'ticket_transcript',
        entityId: this.filename
      };

      this.commentsService.createComment(commentData).subscribe({
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

  toggleMessages(): void {
    this.showMessages = !this.showMessages;
  }

  filterMessages(): void {
    if (!this.transcript) return;

    let filtered = this.transcript.messages;

    // Filter by content
    if (this.messageFilter.trim()) {
      const searchTerm = this.messageFilter.toLowerCase();
      filtered = filtered.filter(message => 
        message.content.toLowerCase().includes(searchTerm) ||
        message.author.username.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by participant
    if (this.selectedParticipant) {
      filtered = filtered.filter(message => 
        message.author.id === this.selectedParticipant
      );
    }

    this.filteredMessages = filtered;
  }

  clearFilters(): void {
    this.messageFilter = '';
    this.selectedParticipant = '';
    if (this.transcript) {
      this.filteredMessages = this.transcript.messages;
    }
  }

  formatDate(dateString: string): string {
    return this.ticketTranscriptsService.formatDate(dateString);
  }

  formatDateTime(dateString: string): string {
    return this.ticketTranscriptsService.formatDateTime(dateString);
  }

  formatFileSize(bytes: number): string {
    return this.ticketTranscriptsService.formatFileSize(bytes);
  }

  getDisplayName(user: { username: string; nickname?: string }): string {
    return this.ticketTranscriptsService.getDisplayName(user);
  }

  getAvatarUrl(user: { id: string; avatar?: string }, size: number = 32): string {
    return this.ticketTranscriptsService.getAvatarUrl(user, size);
  }

  getUserInitials(user: { username: string; nickname?: string }): string {
    const name = this.getDisplayName(user);
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  }

  hasAttachments(message: TranscriptMessage): boolean {
    return this.ticketTranscriptsService.hasAttachments(message);
  }

  hasEmbeds(message: TranscriptMessage): boolean {
    return this.ticketTranscriptsService.hasEmbeds(message);
  }

  hasReactions(message: TranscriptMessage): boolean {
    return this.ticketTranscriptsService.hasReactions(message);
  }

  getMessageTypeText(type: string): string {
    return this.ticketTranscriptsService.getMessageTypeText(type);
  }

  isSystemMessage(message: TranscriptMessage): boolean {
    return message.type === 'system';
  }

  getParticipantMessageCount(participant: TranscriptParticipant): number {
    return participant.messageCount;
  }

  getTopParticipants(): TranscriptParticipant[] {
    if (!this.transcript) return [];
    return this.transcript.participants
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 5);
  }

  getTranscriptDuration(): string {
    if (!this.transcript) return '';
    
    const start = new Date(this.transcript.createdAt);
    const end = new Date(this.transcript.closedAt);
    const diffInMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} Minute${diffInMinutes !== 1 ? 'n' : ''}`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      const remainingMinutes = diffInMinutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      const remainingHours = Math.floor((diffInMinutes % 1440) / 60);
      return `${days}d ${remainingHours}h`;
    }
  }

  goBack(): void {
    this.router.navigate(['/tools/ticket-transcripts']);
  }

  // Form validation helpers
  get commentErrors(): string[] {
    const control = this.commentForm.get('content');
    const errors: string[] = [];
    
    if (control?.touched && control?.errors) {
      if (control.errors['required']) {
        errors.push('Kommentar darf nicht leer sein');
      }
      if (control.errors['minlength']) {
        errors.push('Kommentar ist zu kurz');
      }
      if (control.errors['maxlength']) {
        errors.push('Kommentar ist zu lang (max. 1000 Zeichen)');
      }
    }
    
    return errors;
  }

  get commentLength(): number {
    return this.commentForm.get('content')?.value?.length || 0;
  }

  // TrackBy functions for performance
  trackByMessageId(index: number, message: TranscriptMessage): string {
    return message.id;
  }

  trackByParticipantId(index: number, participant: TranscriptParticipant): string {
    return participant.id;
  }

  trackByCommentId(index: number, comment: Comment): number {
    return comment.id;
  }
}
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentsService, Comment, CreateCommentRequest } from '../../../core/services/comments.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comments.component.html',
  styleUrl: './comments.component.css'
})
export class CommentsComponent implements OnInit {
  @Input() entityType!: string;
  @Input() entityId!: string;
  @Input() readonly = false;

  comments: Comment[] = [];
  newCommentContent = '';
  isLoading = true;
  isSubmitting = false;
  error: string | null = null;
  editingCommentId: number | null = null;
  editingContent = '';
  currentUser: any = null;

  constructor(
    private commentsService: CommentsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadComments();
  }

  private loadComments(): void {
    this.isLoading = true;
    this.error = null;

    this.commentsService.getCommentsForEntity(this.entityType, this.entityId).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading comments:', error);
        this.error = 'Fehler beim Laden der Kommentare';
        this.isLoading = false;
      }
    });
  }

  submitComment(): void {
    if (!this.newCommentContent.trim() || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    const comment: CreateCommentRequest = {
      content: this.newCommentContent.trim(),
      entityType: this.entityType,
      entityId: this.entityId
    };

    this.commentsService.createComment(comment).subscribe({
      next: (newComment) => {
        this.comments.unshift(newComment);
        this.newCommentContent = '';
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error creating comment:', error);
        this.error = 'Fehler beim Erstellen des Kommentars';
        this.isSubmitting = false;
      }
    });
  }

  startEditing(comment: Comment): void {
    this.editingCommentId = comment.id;
    this.editingContent = comment.content;
  }

  cancelEditing(): void {
    this.editingCommentId = null;
    this.editingContent = '';
  }

  saveEdit(): void {
    if (!this.editingContent.trim() || this.editingCommentId === null) {
      return;
    }

    this.commentsService.updateComment(this.editingCommentId, {
      content: this.editingContent.trim()
    }).subscribe({
      next: (updatedComment) => {
        const index = this.comments.findIndex(c => c.id === updatedComment.id);
        if (index !== -1) {
          this.comments[index] = updatedComment;
        }
        this.cancelEditing();
      },
      error: (error) => {
        console.error('Error updating comment:', error);
        this.error = 'Fehler beim Aktualisieren des Kommentars';
      }
    });
  }

  deleteComment(comment: Comment): void {
    if (!confirm('Sind Sie sicher, dass Sie diesen Kommentar löschen möchten?')) {
      return;
    }

    this.commentsService.deleteComment(comment.id).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== comment.id);
      },
      error: (error) => {
        console.error('Error deleting comment:', error);
        this.error = 'Fehler beim Löschen des Kommentars';
      }
    });
  }

  canEditComment(comment: Comment): boolean {
    if (!this.currentUser) return false;
    return this.commentsService.canEditComment(comment, this.currentUser.id);
  }

  canDeleteComment(comment: Comment): boolean {
    if (!this.currentUser) return false;
    const userRoles = this.currentUser.role ? [this.currentUser.role.name] : [];
    return this.commentsService.canDeleteComment(comment, this.currentUser.id, userRoles);
  }

  getAuthorDisplayName(comment: Comment): string {
    return comment.author.profile?.displayName || comment.author.username;
  }

  getAuthorInitials(comment: Comment): string {
    const name = this.getAuthorDisplayName(comment);
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Gerade eben';
    } else if (diffMinutes < 60) {
      return `vor ${diffMinutes} Minute${diffMinutes !== 1 ? 'n' : ''}`;
    } else if (diffHours < 24) {
      return `vor ${diffHours} Stunde${diffHours !== 1 ? 'n' : ''}`;
    } else if (diffDays < 7) {
      return `vor ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`;
    } else {
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitComment();
    }
  }

  onEditKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEdit();
    }
    if (event.key === 'Escape') {
      this.cancelEditing();
    }
  }

  getCommentCount(): number {
    return this.comments.length;
  }

  refresh(): void {
    this.loadComments();
  }
}
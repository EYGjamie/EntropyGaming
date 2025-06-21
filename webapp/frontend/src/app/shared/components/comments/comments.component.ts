import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CommentsService, Comment, CreateCommentRequest } from '../../services/comments.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './comments.component.html',
  styleUrl: './comments.component.css'
})
export class CommentsComponent implements OnInit, OnDestroy {
  @Input() entityType: string = '';
  @Input() entityId: string = '';
  @Input() allowComments: boolean = true;

  comments: Comment[] = [];
  commentForm: FormGroup;
  isLoading = true;
  isSubmitting = false;
  error: string | null = null;
  currentUser: any = null;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private commentsService: CommentsService,
    private authService: AuthService
  ) {
    this.commentForm = this.createForm();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadComments();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private createForm(): FormGroup {
    return this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(1000)]]
    });
  }

  private loadComments(): void {
    if (!this.entityType || !this.entityId) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.error = null;

    const subscription = this.commentsService.getCommentsForEntity(this.entityType, this.entityId).subscribe({
      next: (comments) => {
        this.comments = comments.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading comments:', error);
        this.error = 'Fehler beim Laden der Kommentare';
        this.isLoading = false;
      }
    });

    this.subscriptions.push(subscription);
  }

  onSubmit(): void {
    if (this.commentForm.valid && !this.isSubmitting && this.currentUser) {
      this.isSubmitting = true;
      this.error = null;

      const commentData: CreateCommentRequest = {
        content: this.commentForm.get('content')?.value.trim(),
        entityType: this.entityType,
        entityId: this.entityId
      };

      const subscription = this.commentsService.createComment(commentData).subscribe({
        next: (newComment) => {
          this.comments.unshift(newComment);
          this.commentForm.reset();
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error creating comment:', error);
          this.error = 'Fehler beim Erstellen des Kommentars';
          this.isSubmitting = false;
        }
      });

      this.subscriptions.push(subscription);
    }
  }

  editComment(comment: Comment): void {
    // Implement edit functionality
    const newContent = prompt('Kommentar bearbeiten:', comment.content);
    if (newContent && newContent.trim() !== comment.content) {
      const subscription = this.commentsService.updateComment(comment.id, { 
        content: newContent.trim() 
      }).subscribe({
        next: (updatedComment) => {
          const index = this.comments.findIndex(c => c.id === comment.id);
          if (index !== -1) {
            this.comments[index] = updatedComment;
          }
        },
        error: (error) => {
          console.error('Error updating comment:', error);
          this.error = 'Fehler beim Aktualisieren des Kommentars';
        }
      });

      this.subscriptions.push(subscription);
    }
  }

  deleteComment(comment: Comment): void {
    if (confirm('Sind Sie sicher, dass Sie diesen Kommentar löschen möchten?')) {
      const subscription = this.commentsService.deleteComment(comment.id).subscribe({
        next: () => {
          this.comments = this.comments.filter(c => c.id !== comment.id);
        },
        error: (error) => {
          console.error('Error deleting comment:', error);
          this.error = 'Fehler beim Löschen des Kommentars';
        }
      });

      this.subscriptions.push(subscription);
    }
  }

  canEditComment(comment: Comment): boolean {
    if (!this.currentUser) return false;
    return this.commentsService.canEditComment(comment, this.currentUser.id);
  }

  canDeleteComment(comment: Comment): boolean {
    if (!this.currentUser) return false;
    const userRoles = this.currentUser.roles || [];
    return this.commentsService.canDeleteComment(comment, this.currentUser.id, userRoles);
  }

  getAuthorDisplayName(comment: Comment): string {
    return this.commentsService.getAuthorDisplayName(comment);
  }

  getAuthorAvatar(comment: Comment): string | null {
    return this.commentsService.getAuthorAvatar(comment);
  }

  getAuthorInitials(comment: Comment): string {
    return this.commentsService.getAuthorInitials(comment);
  }

  formatCommentDate(dateString: string): string {
    return this.commentsService.formatCommentDate(dateString);
  }

  // TrackBy function for better performance
  trackByCommentId(index: number, comment: Comment): number {
    return comment.id;
  }

  // Form validation helpers
  get contentErrors(): string[] {
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

  get contentLength(): number {
    return this.commentForm.get('content')?.value?.length || 0;
  }

  get isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  get canCreateComment(): boolean {
    return this.isLoggedIn && this.allowComments;
  }
}
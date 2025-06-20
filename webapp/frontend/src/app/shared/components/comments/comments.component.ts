import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentsService, Comment, CreateCommentRequest } from '../../../core/services/comments.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4">
      <!-- Add Comment Form -->
      <div class="bg-gray-50 rounded-lg p-4" *ngIf="canCreateComments">
        <form (ngSubmit)="onSubmitComment()" class="space-y-3">
          <textarea
            [(ngModel)]="newCommentContent"
            name="content"
            rows="3"
            placeholder="Kommentar hinzufügen..."
            class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          ></textarea>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2" *ngIf="canCreatePrivateComments">
              <input
                type="checkbox"
                id="isPrivate"
                [(ngModel)]="newCommentIsPrivate"
                name="isPrivate"
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label for="isPrivate" class="text-sm text-gray-700">
                Privater Kommentar (nur für Moderatoren sichtbar)
              </label>
            </div>
            
            <button
              type="submit"
              [disabled]="!newCommentContent.trim() || isSubmitting"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Speichern...' : 'Kommentar hinzufügen' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Comments List -->
      <div class="space-y-3">
        <div *ngIf="isLoading" class="text-center py-4">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-2 text-sm text-gray-500">Lade Kommentare...</p>
        </div>

        <div *ngIf="!isLoading && comments.length === 0" class="text-center py-8 text-gray-500">
          <p>Noch keine Kommentare vorhanden.</p>
        </div>

        <div *ngFor="let comment of comments" class="bg-white border border-gray-200 rounded-lg p-4">
          <!-- Comment Header -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <div class="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                   [style.background-color]="comment.author.role.color">
                {{ comment.author.username.charAt(0).toUpperCase() }}
              </div>
              <span class="text-sm font-medium text-gray-900">{{ comment.author.username }}</span>
              <span class="text-xs text-gray-500">[{{ comment.author.role.name }}]</span>
              <span *ngIf="comment.isPrivate" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                🔒 Privat
              </span>
              <span *ngIf="comment.isEdited" class="text-xs text-gray-400">(bearbeitet)</span>
            </div>
            
            <!-- Comment Actions -->
            <div class="flex items-center space-x-2" *ngIf="canEditComment(comment) || canDeleteComment(comment)">
              <button
                *ngIf="canEditComment(comment) && !comment.isEditing"
                (click)="startEditComment(comment)"
                class="text-xs text-gray-400 hover:text-gray-600"
              >
                ✏️
              </button>
              <button
                *ngIf="canDeleteComment(comment)"
                (click)="deleteComment(comment)"
                class="text-xs text-red-400 hover:text-red-600"
              >
                🗑️
              </button>
            </div>
          </div>

          <!-- Comment Content -->
          <div *ngIf="!comment.isEditing" class="text-sm text-gray-700 whitespace-pre-wrap">
            {{ comment.content }}
          </div>

          <!-- Edit Form -->
          <div *ngIf="comment.isEditing" class="space-y-2">
            <textarea
              [(ngModel)]="comment.editContent"
              rows="3"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            ></textarea>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2" *ngIf="canCreatePrivateComments">
                <input
                  type="checkbox"
                  [(ngModel)]="comment.editIsPrivate"
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label class="text-xs text-gray-700">Privat</label>
              </div>
              
              <div class="flex space-x-2">
                <button
                  (click)="cancelEditComment(comment)"
                  class="text-xs px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  (click)="saveEditComment(comment)"
                  [disabled]="comment.isUpdating"
                  class="text-xs px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {{ comment.isUpdating ? 'Speichern...' : 'Speichern' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Comment Footer -->
          <div class="mt-2 text-xs text-gray-400">
            {{ formatDate(comment.createdAt) }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class CommentsComponent implements OnInit, OnChanges {
  @Input() entityType!: string;
  @Input() entityId!: string;

  comments: (Comment & { 
    isEditing?: boolean; 
    editContent?: string; 
    editIsPrivate?: boolean;
    isUpdating?: boolean;
  })[] = [];
  
  newCommentContent = '';
  newCommentIsPrivate = false;
  isLoading = true;
  isSubmitting = false;

  canCreateComments = false;
  canCreatePrivateComments = false;

  constructor(
    private commentsService: CommentsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkPermissions();
    this.loadComments();
  }

  ngOnChanges(): void {
    if (this.entityType && this.entityId) {
      this.loadComments();
    }
  }

  private checkPermissions(): void {
    this.canCreateComments = this.authService.hasPermission('comments.create');
    this.canCreatePrivateComments = this.authService.hasPermission('comments.moderate');
  }

  private loadComments(): void {
    this.isLoading = true;
    const includePrivate = this.authService.hasPermission('comments.moderate');
    
    this.commentsService.getCommentsForEntity(this.entityType, this.entityId, includePrivate)
      .subscribe({
        next: (comments) => {
          this.comments = comments;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading comments:', error);
          this.isLoading = false;
        }
      });
  }

  onSubmitComment(): void {
    if (!this.newCommentContent.trim()) return;

    this.isSubmitting = true;
    const comment: CreateCommentRequest = {
      content: this.newCommentContent.trim(),
      entityType: this.entityType,
      entityId: this.entityId,
      isPrivate: this.newCommentIsPrivate
    };

    this.commentsService.createComment(comment).subscribe({
      next: (newComment) => {
        this.comments.unshift(newComment);
        this.newCommentContent = '';
        this.newCommentIsPrivate = false;
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error creating comment:', error);
        this.isSubmitting = false;
      }
    });
  }

  canEditComment(comment: Comment): boolean {
    const currentUser = this.authService.getCurrentUser();
    return (comment.author.id === currentUser?.id && this.authService.hasPermission('comments.edit')) ||
           this.authService.hasPermission('comments.moderate');
  }

  canDeleteComment(comment: Comment): boolean {
    const currentUser = this.authService.getCurrentUser();
    return (comment.author.id === currentUser?.id && this.authService.hasPermission('comments.delete')) ||
           this.authService.hasPermission('comments.moderate');
  }

  startEditComment(comment: any): void {
    comment.isEditing = true;
    comment.editContent = comment.content;
    comment.editIsPrivate = comment.isPrivate;
  }

  cancelEditComment(comment: any): void {
    comment.isEditing = false;
    delete comment.editContent;
    delete comment.editIsPrivate;
  }

  saveEditComment(comment: any): void {
    if (!comment.editContent?.trim()) return;

    comment.isUpdating = true;
    this.commentsService.updateComment(comment.id, comment.editContent.trim())
      .subscribe({
        next: (updatedComment) => {
          Object.assign(comment, updatedComment);
          comment.isEditing = false;
          comment.isUpdating = false;
          delete comment.editContent;
          delete comment.editIsPrivate;
        },
        error: (error) => {
          console.error('Error updating comment:', error);
          comment.isUpdating = false;
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
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('de-DE');
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DiscordUsersService } from '../services/discord-users.service';
import { CommentsService } from '../../../shared/services/comments.service';

interface DiscordUser {
  userID: string;
  username: string;
  nickname?: string;
  joinedAt: string;
  lastActive: string;
  messageCount: number;
  voiceMinutes: number;
  isActive: boolean;
  avatar?: string;
  roles?: string[];
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-discord-user-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

      <!-- User Details -->
      <div class="bg-white shadow rounded-lg overflow-hidden" *ngIf="user">
        <div class="bg-gradient-to-r from-indigo-500 to-purple-600 h-24"></div>
        <div class="px-6 py-4">
          <div class="flex items-center -mt-12">
            <div class="relative">
              <div class="h-20 w-20 rounded-full bg-indigo-600 border-4 border-white shadow-lg flex items-center justify-center">
                <span class="text-white text-2xl font-bold">
                  {{ (user.nickname || user.username).charAt(0).toUpperCase() }}
                </span>
              </div>
              <div 
                [class.bg-green-400]="user.isActive"
                [class.bg-red-400]="!user.isActive"
                class="absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white"
              ></div>
            </div>
            <div class="ml-6 flex-1">
              <h1 class="text-3xl font-bold text-gray-900">
                {{ user.nickname || user.username }}
              </h1>
              <p class="text-lg text-gray-600" *ngIf="user.nickname">@{{ user.username }}</p>
              <p class="text-sm text-gray-500">Discord ID: {{ user.userID }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6" *ngIf="user">
        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex items-center">
            <div class="text-3xl mr-4">💬</div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ formatNumber(user.messageCount) }}</p>
              <p class="text-sm text-gray-600">Nachrichten</p>
            </div>
          </div>
        </div>

        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex items-center">
            <div class="text-3xl mr-4">🎤</div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ Math.round(user.voiceMinutes / 60) }}h</p>
              <p class="text-sm text-gray-600">Voice Zeit</p>
            </div>
          </div>
        </div>

        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex items-center">
            <div class="text-3xl mr-4">📅</div>
            <div>
              <p class="text-lg font-bold text-gray-900">{{ formatDate(user.joinedAt) }}</p>
              <p class="text-sm text-gray-600">Beigetreten</p>
            </div>
          </div>
        </div>

        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex items-center">
            <div class="text-3xl mr-4">⏰</div>
            <div>
              <p class="text-lg font-bold text-gray-900">{{ formatDate(user.lastActive) }}</p>
              <p class="text-sm text-gray-600">Letzte Aktivität</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Comments Section -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">Kommentare</h2>
        </div>
        
        <!-- Add Comment Form -->
        <div class="px-6 py-4 border-b border-gray-200">
          <form [formGroup]="commentForm" (ngSubmit)="addComment()">
            <div class="mb-3">
              <textarea
                formControlName="content"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Kommentar hinzufügen..."
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
            <p class="text-gray-500">Noch keine Kommentare vorhanden.</p>
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
                  <span *ngIf="comment.updatedAt" class="text-xs text-gray-400">(bearbeitet)</span>
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
        <p class="mt-2 text-gray-500">Lade Benutzerdetails...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 class="text-lg font-medium text-red-900 mb-2">Fehler beim Laden</h3>
        <p class="text-red-700">{{ error }}</p>
        <button
          (click)="loadUserDetails()"
          class="mt-4 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  `
})
export class DiscordUserDetailComponent implements OnInit {
  user: DiscordUser | null = null;
  comments: Comment[] = [];
  commentForm: FormGroup;
  isLoading = true;
  isSubmittingComment = false;
  error: string | null = null;
  userId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private discordUsersService: DiscordUsersService,
    private commentsService: CommentsService
  ) {
    this.commentForm = this.fb.group({
      content: ['']
    });
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId');
    if (this.userId) {
      this.loadUserDetails();
      this.loadComments();
    }
  }

  private loadUserDetails(): void {
    if (!this.userId) return;
    
    this.isLoading = true;
    this.error = null;
    
    this.discordUsersService.getUserById(this.userId).subscribe({
      next: (user) => {
        this.user = user;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user details:', error);
        this.error = 'Benutzer konnte nicht geladen werden.';
        this.isLoading = false;
      }
    });
  }

  private loadComments(): void {
    if (!this.userId) return;
    
    this.commentsService.getComments('discord_user', this.userId).subscribe({
      next: (comments) => {
        this.comments = comments;
      },
      error: (error) => {
        console.error('Error loading comments:', error);
      }
    });
  }

  addComment(): void {
    if (this.commentForm.valid && this.userId) {
      this.isSubmittingComment = true;
      
      const commentData = {
        content: this.commentForm.get('content')?.value,
        entityType: 'discord_user',
        entityId: this.userId
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

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE');
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('de-DE');
  }

  goBack(): void {
    this.router.navigate(['/tools/discord-users']);
  }

  // Make Math available in template
  Math = Math;
}
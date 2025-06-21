import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DiscordUsersService, DiscordUser } from '../services/discord-users.service';
import { CommentsService, Comment } from '../../../../shared/services/comments.service';

@Component({
  selector: 'app-discord-user-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './discord-user-detail.component.html',
  styleUrl: './discord-user-detail.component.css'
})
export class DiscordUserDetailComponent implements OnInit {
  user: DiscordUser | null = null;
  comments: Comment[] = [];
  notesForm: FormGroup;
  isLoading = true;
  isSavingNotes = false;
  error: string | null = null;
  success: string | null = null;
  userId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private discordUsersService: DiscordUsersService,
    private commentsService: CommentsService
  ) {
    this.notesForm = this.createNotesForm();
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId');
    if (this.userId) {
      this.loadUser();
      this.loadComments();
    } else {
      this.error = 'Benutzer-ID nicht gefunden';
      this.isLoading = false;
    }
  }

  private createNotesForm(): FormGroup {
    return this.fb.group({
      notes: ['', [Validators.maxLength(1000)]]
    });
  }

  private loadUser(): void {
    if (!this.userId) return;

    this.isLoading = true;
    this.error = null;

    this.discordUsersService.getUserById(this.userId).subscribe({
      next: (user) => {
        this.user = user;
        this.populateNotesForm(user);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading Discord user:', error);
        this.error = 'Fehler beim Laden des Discord-Benutzers';
        this.isLoading = false;
      }
    });
  }

  private loadComments(): void {
    if (!this.userId) return;

    this.commentsService.getCommentsForEntity('discord_user', this.userId).subscribe({
      next: (comments) => {
        this.comments = comments;
      },
      error: (error) => {
        console.error('Error loading comments:', error);
      }
    });
  }

  private populateNotesForm(user: DiscordUser): void {
    this.notesForm.patchValue({
      notes: user.notes || ''
    });
  }

  onSaveNotes(): void {
    if (this.notesForm.valid && this.userId && !this.isSavingNotes) {
      this.isSavingNotes = true;
      this.error = null;
      this.success = null;

      const notes = this.notesForm.get('notes')?.value || '';

      this.discordUsersService.updateUserNotes(this.userId, notes).subscribe({
        next: (updatedUser) => {
          this.user = updatedUser;
          this.success = 'Notizen erfolgreich gespeichert';
          this.isSavingNotes = false;
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.success = null;
          }, 3000);
        },
        error: (error) => {
          console.error('Error updating notes:', error);
          this.error = 'Fehler beim Speichern der Notizen';
          this.isSavingNotes = false;
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/tools/discord-users']);
  }

  getDisplayName(): string {
    if (!this.user) return '';
    return this.discordUsersService.getDisplayName(this.user);
  }

  getUserTag(): string {
    if (!this.user) return '';
    return this.discordUsersService.getUserTag(this.user);
  }

  getAvatarUrl(): string {
    if (!this.user) return '';
    return this.discordUsersService.getAvatarUrl(this.user, 80);
  }

  getStatusText(): string {
    if (!this.user) return '';
    return this.discordUsersService.getStatusText(this.user.status);
  }

  getStatusColorClass(): string {
    if (!this.user) return 'bg-gray-500';
    return this.discordUsersService.getStatusColorClass(this.user.status);
  }

  formatJoinDate(): string {
    if (!this.user) return '';
    return this.discordUsersService.formatJoinDate(this.user.joinedAt);
  }

  formatVoiceTime(): string {
    if (!this.user) return '';
    return this.discordUsersService.formatVoiceTime(this.user.voiceTime);
  }

  formatLastSeen(): string {
    if (!this.user?.lastSeen) return 'Nie';
    return new Date(this.user.lastSeen).toLocaleString('de-DE');
  }

  formatLastMessage(): string {
    if (!this.user?.lastMessage) return 'Keine Nachrichten';
    return new Date(this.user.lastMessage).toLocaleString('de-DE');
  }

  hasRoles(): boolean {
    return !!(this.user?.roles && this.user.roles.length > 0);
  }

  getRoleBadgeClass(role: any): string {
    if (role.color && role.color !== '#000000') {
      return 'text-white';
    }
    return 'bg-gray-100 text-gray-800';
  }

  getRoleStyle(role: any): any {
    if (role.color && role.color !== '#000000') {
      return {
        'background-color': role.color,
        'color': 'white'
      };
    }
    return {};
  }

  hasActivities(): boolean {
    return !!(this.user?.activities && this.user.activities.length > 0);
  }

  getActivityText(activity: any): string {
    switch (activity.type) {
      case 0: return `Spielt ${activity.name}`;
      case 1: return `Streamt ${activity.name}`;
      case 2: return `Hört ${activity.name}`;
      case 3: return `Schaut ${activity.name}`;
      case 5: return `Wetteifert in ${activity.name}`;
      default: return activity.name;
    }
  }

  // Form validation helpers
  get notesErrors(): string[] {
    const control = this.notesForm.get('notes');
    const errors: string[] = [];
    
    if (control?.touched && control?.errors) {
      if (control.errors['maxlength']) {
        errors.push('Notizen dürfen maximal 1000 Zeichen lang sein');
      }
    }
    
    return errors;
  }

  get notesLength(): number {
    return this.notesForm.get('notes')?.value?.length || 0;
  }
}
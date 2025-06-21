import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileService, UserProfile, UpdateProfileRequest } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './profile-edit.component.html',
  styleUrl: './profile-edit.component.css'
})
export class ProfileEditComponent implements OnInit {
  profileForm: FormGroup;
  userProfile: UserProfile | null = null;
  isLoading = true;
  isSaving = false;
  error: string | null = null;
  success: string | null = null;
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      displayName: ['', [Validators.maxLength(100)]],
      bio: ['', [Validators.maxLength(500)]],
      avatarUrl: ['']
    });
  }

  private loadProfile(): void {
    this.isLoading = true;
    this.error = null;

    // Get current user from auth service
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.error = 'Benutzer nicht gefunden';
      this.isLoading = false;
      return;
    }

    // Convert number to string for the API call
    this.profileService.getUserProfile(currentUser.id.toString()).subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.populateForm(profile);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.error = 'Fehler beim Laden des Profils';
        this.isLoading = false;
      }
    });
  }

  private populateForm(profile: UserProfile): void {
    this.profileForm.patchValue({
      displayName: profile.profile?.displayName || '',
      bio: profile.profile?.bio || '',
      avatarUrl: profile.profile?.avatarUrl || ''
    });

    if (profile.profile?.avatarUrl) {
      this.previewUrl = profile.profile.avatarUrl;
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.error = 'Bitte wählen Sie eine gültige Bilddatei aus.';
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.error = 'Die Datei ist zu groß. Maximale Größe: 5MB';
        return;
      }

      this.selectedFile = file;
      this.error = null;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeAvatar(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.profileForm.patchValue({ avatarUrl: '' });
  }

  onSubmit(): void {
    if (this.profileForm.valid && !this.isSaving) {
      this.isSaving = true;
      this.error = null;
      this.success = null;

      if (this.selectedFile) {
        // If there's a file, upload it first
        this.uploadAvatar();
      } else {
        // Otherwise, just update the profile
        this.updateProfile();
      }
    }
  }

  private uploadAvatar(): void {
    if (!this.selectedFile) {
      this.updateProfile();
      return;
    }

    this.profileService.uploadAvatar(this.selectedFile).subscribe({
      next: (response) => {
        // Update form with new avatar URL
        this.profileForm.patchValue({ avatarUrl: response.avatarUrl });
        this.updateProfile();
      },
      error: (error) => {
        console.error('Error uploading avatar:', error);
        this.error = 'Fehler beim Hochladen des Profilbilds';
        this.isSaving = false;
      }
    });
  }

  private updateProfile(): void {
    const formValue = this.profileForm.value;
    
    // Create UpdateProfileRequest object (not FormData)
    const profileData: UpdateProfileRequest = {
      displayName: formValue.displayName,
      bio: formValue.bio,
      avatarUrl: formValue.avatarUrl
    };

    this.profileService.updateProfile(profileData).subscribe({
      next: (updatedProfile) => {
        this.userProfile = updatedProfile;
        this.success = 'Profil erfolgreich aktualisiert';
        this.isSaving = false;
        this.selectedFile = null;
        
        // Redirect to profile view after a short delay
        setTimeout(() => {
          this.router.navigate(['/profile', updatedProfile.id]);
        }, 2000);
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.error = 'Fehler beim Aktualisieren des Profils';
        this.isSaving = false;
      }
    });
  }

  cancel(): void {
    if (this.userProfile) {
      this.router.navigate(['/profile', this.userProfile.id]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  getAvatarUrl(): string | null {
    return this.previewUrl || this.userProfile?.profile?.avatarUrl || null;
  }

  getUserInitials(): string {
    if (!this.userProfile) return '';
    const name = this.userProfile.profile?.displayName || this.userProfile.username;
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  }

  // Form validation helpers
  get displayNameErrors(): string[] {
    const control = this.profileForm.get('displayName');
    const errors: string[] = [];
    
    if (control?.touched && control?.errors) {
      if (control.errors['maxlength']) {
        errors.push('Name darf maximal 100 Zeichen lang sein');
      }
    }
    
    return errors;
  }

  get bioErrors(): string[] {
    const control = this.profileForm.get('bio');
    const errors: string[] = [];
    
    if (control?.touched && control?.errors) {
      if (control.errors['maxlength']) {
        errors.push('Beschreibung darf maximal 500 Zeichen lang sein');
      }
    }
    
    return errors;
  }

  get bioLength(): number {
    return this.profileForm.get('bio')?.value?.length || 0;
  }
}
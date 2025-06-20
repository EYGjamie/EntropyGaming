import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold text-gray-900">Profil bearbeiten</h1>
            <button
              type="button"
              (click)="cancel()"
              class="text-gray-600 hover:text-gray-800"
            >
              Zurück zum Profil
            </button>
          </div>
        </div>
      </div>

      <!-- Edit Form -->
      <div class="bg-white shadow rounded-lg">
        <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="space-y-6 p-6">
          <!-- Avatar Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Profilbild
            </label>
            <div class="flex items-center space-x-6">
              <div class="relative">
                <img 
                  *ngIf="currentAvatarUrl" 
                  [src]="currentAvatarUrl" 
                  alt="Current Avatar"
                  class="h-20 w-20 rounded-full object-cover border-2 border-gray-300"
                />
                <div 
                  *ngIf="!currentAvatarUrl"
                  class="h-20 w-20 rounded-full bg-indigo-600 border-2 border-gray-300 flex items-center justify-center"
                >
                  <span class="text-white text-xl font-bold">
                    {{ displayName?.charAt(0)?.toUpperCase() || '?' }}
                  </span>
                </div>
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  (change)="onFileSelected($event)"
                  class="hidden"
                  #fileInput
                />
                <button
                  type="button"
                  (click)="fileInput.click()"
                  class="bg-white border border-gray-300 rounded-md py-2 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Bild ändern
                </button>
                <p class="mt-1 text-sm text-gray-500">JPG, PNG bis zu 2MB</p>
              </div>
            </div>
          </div>

          <!-- Display Name -->
          <div>
            <label for="displayName" class="block text-sm font-medium text-gray-700 mb-2">
              Anzeigename
            </label>
            <input
              type="text"
              id="displayName"
              formControlName="displayName"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ihr Name"
            />
            <div *ngIf="profileForm.get('displayName')?.invalid && profileForm.get('displayName')?.touched" 
                 class="text-red-500 text-sm mt-1">
              Anzeigename ist erforderlich
            </div>
          </div>

          <!-- Bio -->
          <div>
            <label for="bio" class="block text-sm font-medium text-gray-700 mb-2">
              Über mich
            </label>
            <textarea
              id="bio"
              formControlName="bio"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Erzählen Sie etwas über sich..."
            ></textarea>
            <p class="mt-1 text-sm text-gray-500">
              {{ profileForm.get('bio')?.value?.length || 0 }}/500 Zeichen
            </p>
          </div>

          <!-- Form Actions -->
          <div class="flex justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              (click)="cancel()"
              class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              [disabled]="profileForm.invalid || isSubmitting"
              class="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
            >
              <span *ngIf="isSubmitting">Speichern...</span>
              <span *ngIf="!isSubmitting">Änderungen speichern</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class ProfileEditComponent implements OnInit {
  profileForm: FormGroup;
  isSubmitting = false;
  selectedFile: File | null = null;
  currentAvatarUrl: string | null = null;
  displayName: string | null = null;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      displayName: ['', Validators.required],
      bio: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    this.loadCurrentProfile();
  }

  private loadCurrentProfile(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.profileService.getUserProfile(currentUser.id).subscribe({
        next: (profile) => {
          this.profileForm.patchValue({
            displayName: profile.profile.displayName || profile.username,
            bio: profile.profile.bio || ''
          });
          this.currentAvatarUrl = profile.profile.avatarUrl;
          this.displayName = profile.profile.displayName || profile.username;
        },
        error: (error) => {
          console.error('Error loading profile:', error);
        }
      });
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        alert('Datei ist zu groß. Maximale Größe: 2MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Bitte wählen Sie eine Bilddatei aus');
        return;
      }

      this.selectedFile = file;

      // Preview the image
      const reader = new FileReader();
      reader.onload = (e) => {
        this.currentAvatarUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.isSubmitting = true;
      
      const formData = new FormData();
      formData.append('displayName', this.profileForm.get('displayName')?.value);
      formData.append('bio', this.profileForm.get('bio')?.value);
      
      if (this.selectedFile) {
        formData.append('avatar', this.selectedFile);
      }

      this.profileService.updateProfile(formData).subscribe({
        next: (response) => {
          console.log('Profile updated successfully');
          this.router.navigate(['/profile']);
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.isSubmitting = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/profile']);
  }
}
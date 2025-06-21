import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold text-gray-900">Account Einstellungen</h1>
            <button
              type="button"
              (click)="backToProfile()"
              class="text-gray-600 hover:text-gray-800"
            >
              Zurück zum Profil
            </button>
          </div>
        </div>
      </div>

      <!-- Email Settings -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">E-Mail Adresse</h2>
        </div>
        <form [formGroup]="emailForm" (ngSubmit)="updateEmail()" class="p-6 space-y-4">
          <div>
            <label for="currentEmail" class="block text-sm font-medium text-gray-700 mb-2">
              Aktuelle E-Mail
            </label>
            <input
              type="email"
              id="currentEmail"
              [value]="currentUser?.email || ''"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>
          
          <div>
            <label for="newEmail" class="block text-sm font-medium text-gray-700 mb-2">
              Neue E-Mail Adresse
            </label>
            <input
              type="email"
              id="newEmail"
              formControlName="newEmail"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="neue@email.com"
            />
            <div *ngIf="emailForm.get('newEmail')?.invalid && emailForm.get('newEmail')?.touched" 
                 class="text-red-500 text-sm mt-1">
              Bitte geben Sie eine gültige E-Mail Adresse ein
            </div>
          </div>

          <div>
            <label for="emailPassword" class="block text-sm font-medium text-gray-700 mb-2">
              Aktuelles Passwort bestätigen
            </label>
            <input
              type="password"
              id="emailPassword"
              formControlName="password"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Passwort eingeben"
            />
            <div *ngIf="emailForm.get('password')?.invalid && emailForm.get('password')?.touched" 
                 class="text-red-500 text-sm mt-1">
              Passwort ist erforderlich
            </div>
          </div>

          <button
            type="submit"
            [disabled]="emailForm.invalid || isUpdatingEmail"
            class="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
          >
            <span *ngIf="isUpdatingEmail">E-Mail aktualisieren...</span>
            <span *ngIf="!isUpdatingEmail">E-Mail aktualisieren</span>
          </button>
        </form>
      </div>

      <!-- Password Settings -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">Passwort ändern</h2>
        </div>
        <form [formGroup]="passwordForm" (ngSubmit)="updatePassword()" class="p-6 space-y-4">
          <div>
            <label for="currentPassword" class="block text-sm font-medium text-gray-700 mb-2">
              Aktuelles Passwort
            </label>
            <input
              type="password"
              id="currentPassword"
              formControlName="currentPassword"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Aktuelles Passwort"
            />
            <div *ngIf="passwordForm.get('currentPassword')?.invalid && passwordForm.get('currentPassword')?.touched" 
                 class="text-red-500 text-sm mt-1">
              Aktuelles Passwort ist erforderlich
            </div>
          </div>

          <div>
            <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">
              Neues Passwort
            </label>
            <input
              type="password"
              id="newPassword"
              formControlName="newPassword"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Neues Passwort (min. 8 Zeichen)"
            />
            <div *ngIf="passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched" 
                 class="text-red-500 text-sm mt-1">
              Passwort muss mindestens 8 Zeichen lang sein
            </div>
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
              Neues Passwort bestätigen
            </label>
            <input
              type="password"
              id="confirmPassword"
              formControlName="confirmPassword"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Passwort wiederholen"
            />
            <div *ngIf="passwordForm.hasError('passwordMismatch') && passwordForm.get('confirmPassword')?.touched" 
                 class="text-red-500 text-sm mt-1">
              Passwörter stimmen nicht überein
            </div>
          </div>

          <button
            type="submit"
            [disabled]="passwordForm.invalid || isUpdatingPassword"
            class="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
          >
            <span *ngIf="isUpdatingPassword">Passwort aktualisieren...</span>
            <span *ngIf="!isUpdatingPassword">Passwort aktualisieren</span>
          </button>
        </form>
      </div>

      <!-- Account Actions -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">Account Aktionen</h2>
        </div>
        <div class="p-6 space-y-4">
          <div class="flex justify-between items-center py-3 border-b border-gray-200">
            <div>
              <h3 class="text-sm font-medium text-gray-900">Account deaktivieren</h3>
              <p class="text-sm text-gray-500">Sie können Ihren Account jederzeit wieder aktivieren lassen.</p>
            </div>
            <button
              type="button"
              (click)="confirmDeactivation()"
              class="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors"
            >
              Deaktivieren
            </button>
          </div>

          <div class="flex justify-between items-center py-3">
            <div>
              <h3 class="text-sm font-medium text-gray-900">Account löschen</h3>
              <p class="text-sm text-gray-500">Warnung: Diese Aktion kann nicht rückgängig gemacht werden.</p>
            </div>
            <button
              type="button"
              (click)="confirmDeletion()"
              class="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProfileSettingsComponent implements OnInit {
  emailForm: FormGroup;
  passwordForm: FormGroup;
  currentUser: any = null;
  isUpdatingEmail = false;
  isUpdatingPassword = false;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router
  ) {
    this.emailForm = this.fb.group({
      newEmail: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  updateEmail(): void {
    if (this.emailForm.valid) {
      this.isUpdatingEmail = true;
      
      const emailData = {
        newEmail: this.emailForm.get('newEmail')?.value,
        password: this.emailForm.get('password')?.value
      };

      this.profileService.updateEmail(emailData).subscribe({
        next: (response) => {
          console.log('Email updated successfully');
          this.emailForm.reset();
          this.isUpdatingEmail = false;
          // Update current user info
          this.authService.refreshUser();
        },
        error: (error) => {
          console.error('Error updating email:', error);
          this.isUpdatingEmail = false;
        }
      });
    }
  }

  updatePassword(): void {
    if (this.passwordForm.valid) {
      this.isUpdatingPassword = true;
      
      const passwordData = {
        currentPassword: this.passwordForm.get('currentPassword')?.value,
        newPassword: this.passwordForm.get('newPassword')?.value
      };

      this.profileService.updatePassword(passwordData).subscribe({
        next: (response) => {
          console.log('Password updated successfully');
          this.passwordForm.reset();
          this.isUpdatingPassword = false;
        },
        error: (error) => {
          console.error('Error updating password:', error);
          this.isUpdatingPassword = false;
        }
      });
    }
  }

  confirmDeactivation(): void {
    if (confirm('Sind Sie sicher, dass Sie Ihren Account deaktivieren möchten?')) {
      this.profileService.deactivateAccount().subscribe({
        next: () => {
          console.log('Account deactivated');
          this.authService.logout();
        },
        error: (error) => {
          console.error('Error deactivating account:', error);
        }
      });
    }
  }

  confirmDeletion(): void {
    const confirmation = prompt('Geben Sie "LÖSCHEN" ein, um Ihren Account permanent zu löschen:');
    if (confirmation === 'LÖSCHEN') {
      const password = prompt('Bitte geben Sie Ihr aktuelles Passwort zur Bestätigung ein:');
      if (password && password.trim().length > 0) {
        this.profileService.deleteAccount(password, confirmation).subscribe({
          next: () => {
            console.log('Account deleted');
            this.authService.logout();
          },
          error: (error) => {
            console.error('Error deleting account:', error);
          }
        });
      } else {
        alert('Passwort ist erforderlich, um den Account zu löschen.');
      }
    }
  }

  backToProfile(): void {
    this.router.navigate(['/profile']);
  }
}
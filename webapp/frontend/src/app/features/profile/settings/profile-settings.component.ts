import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileService, UserProfile, ChangeEmailRequest, ChangePasswordRequest, ProfileSettings } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './profile-settings.component.html',
  styleUrl: './profile-settings.component.css'
})
export class ProfileSettingsComponent implements OnInit {
  userProfile: UserProfile | null = null;
  emailForm: FormGroup;
  passwordForm: FormGroup;
  settingsForm: FormGroup;
  
  isLoading = true;
  isUpdatingEmail = false;
  isUpdatingPassword = false;
  isUpdatingSettings = false;
  isDeactivating = false;
  
  error: string | null = null;
  emailSuccess: string | null = null;
  passwordSuccess: string | null = null;
  settingsSuccess: string | null = null;
  
  profileSettings: ProfileSettings | null = null;
  showEmailForm = false;
  showPasswordForm = false;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private authService: AuthService
  ) {
    this.emailForm = this.createEmailForm();
    this.passwordForm = this.createPasswordForm();
    this.settingsForm = this.createSettingsForm();
  }

  ngOnInit(): void {
    this.loadProfile();
    this.loadSettings();
  }

  private createEmailForm(): FormGroup {
    return this.fb.group({
      newEmail: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  private createPasswordForm(): FormGroup {
    return this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private createSettingsForm(): FormGroup {
    return this.fb.group({
      notifications: this.fb.group({
        email: [true],
        discord: [true],
        browser: [true]
      }),
      privacy: this.fb.group({
        showEmail: [false],
        showLastLogin: [true],
        allowDirectMessages: [true]
      }),
      preferences: this.fb.group({
        theme: ['auto'],
        language: ['de'],
        timezone: ['Europe/Berlin']
      })
    });
  }

  private passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    
    return null;
  }

  private loadProfile(): void {
    this.profileService.getCurrentProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.error = 'Fehler beim Laden des Profils';
        this.isLoading = false;
      }
    });
  }

  private loadSettings(): void {
    this.profileService.getProfileSettings().subscribe({
      next: (settings) => {
        this.profileSettings = settings;
        this.populateSettingsForm(settings);
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        // Use default settings if loading fails
        this.profileSettings = {
          notifications: { email: true, discord: true, browser: true },
          privacy: { showEmail: false, showLastLogin: true, allowDirectMessages: true },
          preferences: { theme: 'auto', language: 'de', timezone: 'Europe/Berlin' }
        };
      }
    });
  }

  private populateSettingsForm(settings: ProfileSettings): void {
    this.settingsForm.patchValue(settings);
  }

  toggleEmailForm(): void {
    this.showEmailForm = !this.showEmailForm;
    if (!this.showEmailForm) {
      this.emailForm.reset();
      this.emailSuccess = null;
    }
  }

  togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;
    if (!this.showPasswordForm) {
      this.passwordForm.reset();
      this.passwordSuccess = null;
    }
  }

  onEmailSubmit(): void {
    if (this.emailForm.valid && !this.isUpdatingEmail) {
      this.isUpdatingEmail = true;
      this.error = null;
      this.emailSuccess = null;

      const emailData: ChangeEmailRequest = this.emailForm.value;

      this.profileService.updateEmail(emailData).subscribe({
        next: (response) => {
          this.emailSuccess = response.message || 'E-Mail erfolgreich aktualisiert';
          this.isUpdatingEmail = false;
          this.emailForm.reset();
          this.showEmailForm = false;
          
          // Reload profile to get updated email
          this.loadProfile();
        },
        error: (error) => {
          console.error('Error updating email:', error);
          this.error = error.error?.message || 'Fehler beim Aktualisieren der E-Mail';
          this.isUpdatingEmail = false;
        }
      });
    }
  }

  onPasswordSubmit(): void {
    if (this.passwordForm.valid && !this.isUpdatingPassword) {
      this.isUpdatingPassword = true;
      this.error = null;
      this.passwordSuccess = null;

      const passwordData: ChangePasswordRequest = this.passwordForm.value;

      this.profileService.updatePassword(passwordData).subscribe({
        next: (response) => {
          this.passwordSuccess = response.message || 'Passwort erfolgreich aktualisiert';
          this.isUpdatingPassword = false;
          this.passwordForm.reset();
          this.showPasswordForm = false;
        },
        error: (error) => {
          console.error('Error updating password:', error);
          this.error = error.error?.message || 'Fehler beim Aktualisieren des Passworts';
          this.isUpdatingPassword = false;
        }
      });
    }
  }

  onSettingsSubmit(): void {
    if (this.settingsForm.valid && !this.isUpdatingSettings) {
      this.isUpdatingSettings = true;
      this.settingsSuccess = null;

      const settingsData = this.settingsForm.value;

      this.profileService.updateProfileSettings(settingsData).subscribe({
        next: (updatedSettings) => {
          this.profileSettings = updatedSettings;
          this.settingsSuccess = 'Einstellungen erfolgreich gespeichert';
          this.isUpdatingSettings = false;
        },
        error: (error) => {
          console.error('Error updating settings:', error);
          this.error = 'Fehler beim Speichern der Einstellungen';
          this.isUpdatingSettings = false;
        }
      });
    }
  }

  onDeactivateAccount(): void {
    if (confirm('Sind Sie sicher, dass Sie Ihr Konto deaktivieren möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      this.isDeactivating = true;
      this.error = null;

      this.profileService.deactivateAccount().subscribe({
        next: (response) => {
          alert(response.message || 'Konto wurde erfolgreich deaktiviert');
          this.authService.logout();
        },
        error: (error) => {
          console.error('Error deactivating account:', error);
          this.error = error.error?.message || 'Fehler beim Deaktivieren des Kontos';
          this.isDeactivating = false;
        }
      });
    }
  }

  // Form validation helpers
  get emailErrors(): string[] {
    const errors: string[] = [];
    const newEmailControl = this.emailForm.get('newEmail');
    const passwordControl = this.emailForm.get('password');
    
    if (newEmailControl?.touched && newEmailControl?.errors) {
      if (newEmailControl.errors['required']) {
        errors.push('E-Mail ist erforderlich');
      }
      if (newEmailControl.errors['email']) {
        errors.push('Ungültige E-Mail-Adresse');
      }
    }
    
    if (passwordControl?.touched && passwordControl?.errors) {
      if (passwordControl.errors['required']) {
        errors.push('Passwort ist erforderlich');
      }
    }
    
    return errors;
  }

  get passwordErrors(): string[] {
    const errors: string[] = [];
    const currentPasswordControl = this.passwordForm.get('currentPassword');
    const newPasswordControl = this.passwordForm.get('newPassword');
    const confirmPasswordControl = this.passwordForm.get('confirmPassword');
    
    if (currentPasswordControl?.touched && currentPasswordControl?.errors) {
      if (currentPasswordControl.errors['required']) {
        errors.push('Aktuelles Passwort ist erforderlich');
      }
    }
    
    if (newPasswordControl?.touched && newPasswordControl?.errors) {
      if (newPasswordControl.errors['required']) {
        errors.push('Neues Passwort ist erforderlich');
      }
      if (newPasswordControl.errors['minlength']) {
        errors.push('Passwort muss mindestens 8 Zeichen lang sein');
      }
    }
    
    if (confirmPasswordControl?.touched && confirmPasswordControl?.errors) {
      if (confirmPasswordControl.errors['required']) {
        errors.push('Passwort bestätigen ist erforderlich');
      }
    }
    
    if (this.passwordForm.errors && this.passwordForm.errors['passwordMismatch']) {
      errors.push('Passwörter stimmen nicht überein');
    }
    
    return errors;
  }

  getCurrentEmail(): string {
    return this.userProfile?.email || '';
  }

  getDisplayName(): string {
    return this.userProfile?.profile?.displayName || this.userProfile?.username || '';
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService, User } from '../../../core/services/user.service';

interface Role {
  id: number;
  name: string;
  displayName: string;
  description?: string;
}

interface Permission {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  category?: string;
}

@Component({
  selector: 'app-admin-user-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './admin-user-detail.component.html',
  styleUrl: './admin-user-detail.component.css'
})
export class AdminUserDetailComponent implements OnInit {
  userForm: FormGroup;
  user: User | null = null;
  availableRoles: Role[] = [];
  availablePermissions: Permission[] = [];
  isLoading = true;
  isSaving = false;
  error: string | null = null;
  success: string | null = null;
  isNewUser = false;
  userId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private userService: UserService
  ) {
    this.userForm = this.createForm();
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId');
    this.isNewUser = this.userId === 'new';

    this.loadRoles();
    this.loadPermissions();

    if (!this.isNewUser && this.userId) {
      this.loadUser(this.userId);
    } else {
      this.isLoading = false;
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      confirmPassword: [''],
      roleId: ['', Validators.required],
      isActive: [true],
      profile: this.fb.group({
        displayName: [''],
        bio: [''],
        avatarUrl: ['']
      }),
      permissions: this.fb.array([])
    });
  }

  private loadUser(userId: string): void {
    this.userService.getUser(userId).subscribe({
      next: (user) => {
        this.user = user;
        this.populateForm(user);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.error = 'Fehler beim Laden des Benutzers';
        this.isLoading = false;
      }
    });
  }

  private loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (roles) => {
        this.availableRoles = roles;
      },
      error: (error) => {
        console.error('Error loading roles:', error);
      }
    });
  }

  private loadPermissions(): void {
    this.userService.getPermissions().subscribe({
      next: (permissions) => {
        this.availablePermissions = permissions;
        this.initializePermissionsArray();
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
      }
    });
  }

  private initializePermissionsArray(): void {
    const permissionsArray = this.userForm.get('permissions') as FormArray;
    permissionsArray.clear();

    this.availablePermissions.forEach(permission => {
      const hasPermission = this.user?.permissions?.some(p => p.id === permission.id) || false;
      permissionsArray.push(this.fb.control(hasPermission));
    });
  }

  private populateForm(user: User): void {
    this.userForm.patchValue({
      username: user.username,
      email: user.email,
      roleId: user.role?.id || '',
      isActive: user.isActive,
      profile: {
        displayName: user.profile?.displayName || '',
        bio: user.profile?.bio || '',
        avatarUrl: user.profile?.avatarUrl || ''
      }
    });

    // Set password fields as not required for existing users
    if (!this.isNewUser) {
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('confirmPassword')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
      this.userForm.get('confirmPassword')?.updateValueAndValidity();
    }

    this.initializePermissionsArray();
  }

  get permissionsArray(): FormArray {
    return this.userForm.get('permissions') as FormArray;
  }

  getPermissionsByCategory(): { [category: string]: { permission: Permission; index: number }[] } {
    const categorized: { [category: string]: { permission: Permission; index: number }[] } = {};
    
    this.availablePermissions.forEach((permission, index) => {
      const category = permission.category || 'Allgemein';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push({ permission, index });
    });

    return categorized;
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    // Validate password confirmation for new users
    if (this.isNewUser) {
      const password = this.userForm.get('password')?.value;
      const confirmPassword = this.userForm.get('confirmPassword')?.value;
      
      if (!password) {
        this.error = 'Passwort ist erforderlich';
        return;
      }
      
      if (password !== confirmPassword) {
        this.error = 'Passwörter stimmen nicht überein';
        return;
      }
    }

    this.isSaving = true;
    this.error = null;
    this.success = null;

    const formData = this.prepareFormData();

    const request = this.isNewUser 
      ? this.userService.createUser(formData)
      : this.userService.updateUser(this.userId!, formData);

    request.subscribe({
      next: (savedUser) => {
        this.user = savedUser;
        this.success = this.isNewUser ? 'Benutzer erfolgreich erstellt' : 'Benutzer erfolgreich aktualisiert';
        this.isSaving = false;
        
        if (this.isNewUser) {
          this.router.navigate(['/admin/users', savedUser.id]);
        }
      },
      error: (error) => {
        console.error('Error saving user:', error);
        this.error = error.error?.message || 'Fehler beim Speichern des Benutzers';
        this.isSaving = false;
      }
    });
  }

  private prepareFormData(): any {
    const formValue = this.userForm.value;
    const selectedPermissions = this.availablePermissions
      .filter((_, index) => formValue.permissions[index])
      .map(permission => permission.id);

    const data = {
      username: formValue.username,
      email: formValue.email,
      roleId: formValue.roleId,
      isActive: formValue.isActive,
      profile: formValue.profile,
      permissionIds: selectedPermissions
    };

    // Include password only if provided
    if (formValue.password) {
      (data as any).password = formValue.password;
    }

    return data;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched();
      }
    });
  }

  deleteUser(): void {
    if (!this.user || this.isNewUser) return;

    const confirmMessage = `Sind Sie sicher, dass Sie den Benutzer "${this.user.username}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`;
    
    if (confirm(confirmMessage)) {
      this.userService.deleteUser(this.user.id.toString()).subscribe({
        next: () => {
          this.router.navigate(['/admin/users']);
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          this.error = 'Fehler beim Löschen des Benutzers';
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/users']);
  }

  getFieldError(fieldName: string): string | null {
    const field = this.userForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} ist erforderlich`;
      if (field.errors['email']) return 'Ungültige E-Mail-Adresse';
      if (field.errors['minlength']) return `${fieldName} muss mindestens ${field.errors['minlength'].requiredLength} Zeichen lang sein`;
    }
    return null;
  }

  clearMessages(): void {
    this.error = null;
    this.success = null;
  }
}
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { PatientService } from '../../../services/patient.service';

const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const n = group.get('newPassword')?.value;
  const c = group.get('confirmPassword')?.value;
  return n && c && n !== c ? { mismatch: true } : null;
};

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {

  profileForm:  FormGroup;
  passwordForm: FormGroup;

  activeTab        = 'profile';
  isEditing        = false;
  profileSaved     = false;
  profileError     = '';
  passwordSaved    = false;
  passwordError    = '';
  isSavingProfile  = false;
  isSavingPassword = false;

  showCurrent = false;
  showNew     = false;
  showConfirm = false;

  displayName   = '';
  displayEmail  = '';
  displayUserId = '';
  avatarLetter  = '?';

  constructor(
    private auth: AuthService,
    private fb: FormBuilder,
    private patientService: PatientService
  ) {
    this.profileForm = this.fb.group({
      fullName:    [{ value: '', disabled: true }, [Validators.required, Validators.minLength(3)]],
      email:       [{ value: '', disabled: true }],
      phone:       [{ value: '', disabled: true }, [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      dateOfBirth: [{ value: '', disabled: true }],
      gender:      [{ value: '', disabled: true }],
      address:     [{ value: '', disabled: true }],
      bloodGroup:  [{ value: '', disabled: true }]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  ngOnInit(): void {
    const user   = this.auth.getUser();
    const userId = this.auth.getUserId();

    this.displayName   = user?.fullName || user?.email || 'Patient';
    this.displayEmail  = user?.email    || '';
    this.displayUserId = userId ? `#${userId}` : '—';
    this.avatarLetter  = (user?.fullName || user?.email || 'P').charAt(0).toUpperCase();

    this.profileForm.patchValue({ email: this.displayEmail });

    if (!userId) return;

    this.patientService.getProfile(userId).subscribe({
      next: (profile) => {
        this.profileForm.patchValue({
          fullName:    profile.fullName    || '',
          phone:       profile.phone       || '',
          dateOfBirth: profile.dateOfBirth || '',
          address:     profile.address     || '',
          bloodGroup:  profile.bloodGroup  || '',
          gender:      profile.gender      || ''
        });
        if (profile.fullName) {
          this.displayName  = profile.fullName;
          this.avatarLetter = profile.fullName.charAt(0).toUpperCase();
        }
      },
      error: () => {}
    });
  }

  get pf()  { return this.profileForm.controls; }
  get pwf() { return this.passwordForm.controls; }

  private readonly editableFields = ['fullName', 'phone', 'dateOfBirth', 'gender', 'address', 'bloodGroup'];

  startEditing(): void {
    this.isEditing = true;
    this.profileError = '';
    this.editableFields.forEach(f => this.profileForm.get(f)?.enable());
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.profileError = '';
    this.editableFields.forEach(f => this.profileForm.get(f)?.disable());
    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    const userId = this.auth.getUserId();
    if (!userId) return;

    const v = this.profileForm.getRawValue();
    this.isSavingProfile = true;
    this.profileError    = '';

    this.patientService.updateProfile(userId, {
      fullName:    v.fullName,
      phone:       v.phone,
      dateOfBirth: v.dateOfBirth || null,
      address:     v.address     || null,
      bloodGroup:  v.bloodGroup  || null
    }).subscribe({
      next: () => {
        this.isSavingProfile = false;
        this.profileSaved    = true;
        this.isEditing       = false;
        this.displayName     = v.fullName;
        this.avatarLetter    = v.fullName.charAt(0).toUpperCase();
        this.editableFields.forEach(f => this.profileForm.get(f)?.disable());
        setTimeout(() => this.profileSaved = false, 3000);
      },
      error: (err: Error) => {
        this.isSavingProfile = false;
        this.profileError    = err.message;
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    const userId = this.auth.getUserId();
    if (!userId) return;

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.isSavingPassword = true;
    this.passwordError    = '';

    this.auth.changePassword(userId, currentPassword, newPassword).subscribe({
      next: () => {
        this.isSavingPassword = false;
        this.passwordSaved    = true;
        this.passwordForm.reset();
        setTimeout(() => this.passwordSaved = false, 3000);
      },
      error: (err: Error) => {
        this.isSavingPassword = false;
        this.passwordError    = err.message;
      }
    });
  }

  logout(): void { this.auth.logout(); }
}

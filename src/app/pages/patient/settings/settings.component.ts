import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

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
export class SettingsComponent {

  profileForm: FormGroup;
  passwordForm: FormGroup;
  profileSaved  = false;
  passwordSaved = false;
  showCurrent = false;
  showNew     = false;
  showConfirm = false;

  constructor(private fb: FormBuilder) {
    this.profileForm = this.fb.group({
      fullName:    ['Prakhar Verma',          [Validators.required, Validators.minLength(3)]],
      email:       ['prakhar@example.com',    [Validators.required, Validators.email]],
      phone:       ['9876543210',             [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      dateOfBirth: ['1998-05-15',             Validators.required],
      gender:      ['Male',                   Validators.required],
      address:     ['123 Main Street, Delhi', [Validators.required, Validators.minLength(10)]],
      bloodGroup:  ['O+']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  get pf() { return this.profileForm.controls; }
  get pwf() { return this.passwordForm.controls; }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.profileSaved = true;
    setTimeout(() => this.profileSaved = false, 3000);
  }

  changePassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    this.passwordSaved = true;
    this.passwordForm.reset();
    setTimeout(() => this.passwordSaved = false, 3000);
  }
}

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  loginForm!: FormGroup;
  selectedRole: string = 'patient';

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.buildForm();
  }

  buildForm(): void {
    const identifierValidators = this.selectedRole === 'organization'
      ? [Validators.required, Validators.minLength(5)]
      : [Validators.required, Validators.email];

    this.loginForm = this.fb.group({
      identifier: ['', identifierValidators],
      password:   ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get identifier() { return this.loginForm.get('identifier')!; }
  get password()   { return this.loginForm.get('password')!; }

  get identifierLabel(): string {
    return this.selectedRole === 'organization'
      ? 'Registration / License Number'
      : 'Email Address';
  }

  get identifierPlaceholder(): string {
    return this.selectedRole === 'organization'
      ? 'Enter your registration number'
      : 'Enter your email address';
  }

  get identifierType(): string {
    return this.selectedRole === 'organization' ? 'text' : 'email';
  }

  selectRole(role: string): void {
    this.selectedRole = role;
    this.buildForm();
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    if (this.selectedRole === 'patient')      this.router.navigate(['/patient']);
    else if (this.selectedRole === 'nurse')   this.router.navigate(['/nurse']);
    else if (this.selectedRole === 'organization') this.router.navigate(['/admin']);
  }
}

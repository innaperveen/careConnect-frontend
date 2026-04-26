import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';

export const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pass && confirm && pass !== confirm ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  role: string = 'patient';
  patientForm!: FormGroup;
  nurseForm!: FormGroup;
  orgForm!: FormGroup;

  specializations = [
    'General Nursing', 'ICU / Critical Care', 'Cardiology', 'Pediatric Nursing',
    'Geriatric Care', 'Orthopedic Nursing', 'Oncology', 'Emergency / Trauma',
    'Psychiatric Nursing', 'Home Healthcare'
  ];

  orgTypes = ['Hospital', 'Nursing Home', 'Clinic', 'Care Center', 'Rehabilitation Center', 'Other'];

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.patientForm = this.fb.group({
      fullName:        ['', [Validators.required, Validators.minLength(3)]],
      age:             ['', [Validators.required, Validators.pattern('^[0-9]+$'), Validators.min(1)]],
      gender:          ['', Validators.required],
      email:           ['', [Validators.required, Validators.email]],
      phone:           ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      address:         ['', [Validators.required, Validators.minLength(10)]],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });

    this.nurseForm = this.fb.group({
      fullName:        ['', [Validators.required, Validators.minLength(3)]],
      email:           ['', [Validators.required, Validators.email]],
      phone:           ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      licenseNumber:   ['', [Validators.required, Validators.minLength(5)]],
      specialization:  ['', Validators.required],
      experience:      ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      availability:    ['', Validators.required],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });

    this.orgForm = this.fb.group({
      orgName:          ['', [Validators.required, Validators.minLength(3)]],
      orgType:          ['', Validators.required],
      regNumber:        ['', [Validators.required, Validators.minLength(5)]],
      contactPerson:    ['', [Validators.required, Validators.minLength(3)]],
      email:            ['', [Validators.required, Validators.email]],
      phone:            ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      address:          ['', [Validators.required, Validators.minLength(10)]],
      city:             ['', Validators.required],
      state:            ['', Validators.required],
      website:          [''],
      password:         ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword:  ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  selectRole(selected: string): void { this.role = selected; }

  // Patient getters
  get pName()    { return this.patientForm.get('fullName')!; }
  get pAge()     { return this.patientForm.get('age')!; }
  get pGender()  { return this.patientForm.get('gender')!; }
  get pEmail()   { return this.patientForm.get('email')!; }
  get pPhone()   { return this.patientForm.get('phone')!; }
  get pAddress() { return this.patientForm.get('address')!; }
  get pPass()    { return this.patientForm.get('password')!; }
  get pConfirm() { return this.patientForm.get('confirmPassword')!; }

  // Nurse getters
  get nName()    { return this.nurseForm.get('fullName')!; }
  get nEmail()   { return this.nurseForm.get('email')!; }
  get nPhone()   { return this.nurseForm.get('phone')!; }
  get nLicense() { return this.nurseForm.get('licenseNumber')!; }
  get nSpec()    { return this.nurseForm.get('specialization')!; }
  get nExp()     { return this.nurseForm.get('experience')!; }
  get nAvail()   { return this.nurseForm.get('availability')!; }
  get nPass()    { return this.nurseForm.get('password')!; }
  get nConfirm() { return this.nurseForm.get('confirmPassword')!; }

  // Organization getters
  get oName()    { return this.orgForm.get('orgName')!; }
  get oType()    { return this.orgForm.get('orgType')!; }
  get oReg()     { return this.orgForm.get('regNumber')!; }
  get oContact() { return this.orgForm.get('contactPerson')!; }
  get oEmail()   { return this.orgForm.get('email')!; }
  get oPhone()   { return this.orgForm.get('phone')!; }
  get oAddress() { return this.orgForm.get('address')!; }
  get oCity()    { return this.orgForm.get('city')!; }
  get oState()   { return this.orgForm.get('state')!; }
  get oPass()    { return this.orgForm.get('password')!; }
  get oConfirm() { return this.orgForm.get('confirmPassword')!; }

  register(): void {
    if (this.role === 'patient') {
      if (this.patientForm.invalid) { this.patientForm.markAllAsTouched(); return; }
      this.router.navigate(['/patient']);

    } else if (this.role === 'nurse') {
      if (this.nurseForm.invalid) { this.nurseForm.markAllAsTouched(); return; }
      this.router.navigate(['/nurse']);

    } else if (this.role === 'organization') {
      if (this.orgForm.invalid) { this.orgForm.markAllAsTouched(); return; }
      this.router.navigate(['/admin']);
    }
  }
}

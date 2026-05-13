import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GeoService } from '../../services/geo.service';

// ── Shared validators ────────────────────────────────────────────────────────

export const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const pass    = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pass && confirm && pass !== confirm ? { passwordMismatch: true } : null;
};

function dobRangeValidator(minAge: number, maxAge: number): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    if (!ctrl.value) return null;
    const dob   = new Date(ctrl.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    if (age < minAge) return { tooYoung: { min: minAge } };
    if (age > maxAge) return { tooOld:   { max: maxAge } };
    return null;
  };
}

const PASS_VALIDATORS  = [Validators.required, Validators.minLength(12), Validators.maxLength(18)];
const EMAIL_VALIDATORS = [
  Validators.required,
  Validators.email,
  Validators.pattern('^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.com$'),
];

// First name: letters only, no dot, min 3 max 30
const FIRST_NAME_VALIDATORS = [
  Validators.required,
  Validators.minLength(3),
  Validators.maxLength(30),
  Validators.pattern('^[A-Za-z]+$')
];

// Last name: either 3–30 letters OR exactly a single dot
function lastNameValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = (ctrl.value || '') as string;
    if (!v) return null;
    if (v === '.') return null;
    if (/^[A-Za-z]{3,30}$/.test(v)) return null;
    return { invalidLastName: true };
  };
}

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  role = 'patient';
  patientForm!: FormGroup;
  nurseForm!:   FormGroup;
  orgForm!:     FormGroup;
  isLoading = false;

  // Geo data
  states: string[] = [];
  cities: string[] = [];
  nurseStates: string[] = [];
  nurseCities: string[] = [];
  orgStates: string[] = [];
  orgCities: string[] = [];

  // Auto-calculated age from DOB
  calculatedAge: number | null = null;

  // Password visibility toggles
  showPPass    = false;  showPConfirm = false;
  showNPass    = false;  showNConfirm = false;
  showOPass    = false;  showOConfirm = false;

  // DOB limits
  readonly maxDob: string; // today minus 1 year (min age = 1)
  readonly minDob: string; // today minus 120 years

  // Country codes for phone
  countryCodes = [
    { label: '🇮🇳 +91 India',         code: '+91' },
    { label: '🇺🇸 +1  USA/Canada',     code: '+1'  },
    { label: '🇬🇧 +44 UK',             code: '+44' },
    { label: '🇦🇺 +61 Australia',      code: '+61' },
    { label: '🇦🇪 +971 UAE',           code: '+971'},
    { label: '🇸🇬 +65 Singapore',      code: '+65' },
    { label: '🇩🇪 +49 Germany',        code: '+49' },
    { label: '🇫🇷 +33 France',         code: '+33' },
  ];

  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  specializations = [
    'General Nursing', 'ICU / Critical Care', 'Cardiology', 'Pediatric Nursing',
    'Geriatric Care', 'Orthopedic Nursing', 'Oncology', 'Emergency / Trauma',
    'Psychiatric Nursing', 'Home Healthcare'
  ];

  experienceOptions = [
    { label: '0–2 Years',  value: '0-2 years'  },
    { label: '2–4 Years',  value: '2-4 years'  },
    { label: '4–6 Years',  value: '4-6 years'  },
    { label: '6–8 Years',  value: '6-8 years'  },
    { label: '8+ Years',   value: '8+ years'   },
  ];
  orgTypes = ['Hospital', 'Nursing Home', 'Clinic', 'Care Center', 'Rehabilitation Center', 'Other'];
  designations = [
    'Hospital Administrator', 'Medical Director', 'Chief Executive Officer (CEO)',
    'Chief Operating Officer (COO)', 'Head of Nursing', 'Facility Manager',
    'HR Manager', 'Operations Manager', 'Other'
  ];

  showModal    = false;
  modalType: 'success' | 'error' = 'success';
  modalTitle   = '';
  modalMessage = '';

  constructor(
    private fb:    FormBuilder,
    private router: Router,
    private auth:  AuthService,
    private geoSvc: GeoService
  ) {
    const today = new Date();
    const minAge1  = new Date(today.getFullYear() - 1,   today.getMonth(), today.getDate());
    const maxAge120 = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    this.maxDob = minAge1.toISOString().split('T')[0];
    this.minDob = maxAge120.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.buildPatientForm();
    this.buildNurseForm();
    this.buildOrgForm();

    // Load states for patient + nurse + org address dropdowns
    this.geoSvc.getStates().subscribe(s => { this.states = s; this.nurseStates = s; this.orgStates = s; });
  }

  // ── Form builders ──────────────────────────────────────────────────────────

  onDobChange(value: string): void {
    if (!value) { this.calculatedAge = null; return; }
    const dob   = new Date(value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    this.calculatedAge = (age >= 0 && age <= 120) ? age : null;
  }

  private buildPatientForm(): void {
    this.patientForm = this.fb.group({
      // Name
      firstName:  ['', FIRST_NAME_VALIDATORS],
      middleName: ['', [Validators.maxLength(30), Validators.pattern('^[A-Za-z]*$')]],
      lastName:   ['', [Validators.required, Validators.maxLength(30), lastNameValidator()]],

      // Personal
      dob:        ['', [Validators.required, dobRangeValidator(1, 120)]],
      gender:     ['', Validators.required],
      bloodGroup: ['', Validators.required],

      // Contact
      email:           ['', EMAIL_VALIDATORS],
      phoneCountryCode:[ '+91' ],
      phone:           ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],

      // Address
      addressLine1: ['', [Validators.required, Validators.maxLength(100)]],
      addressLine2: ['', Validators.maxLength(100)],
      landmark:     ['', Validators.maxLength(60)],
      country:      [{ value: 'India', disabled: true }],
      state:        ['', Validators.required],
      city:         ['', Validators.required],
      pincode:      ['', [Validators.required, Validators.pattern('^[1-9][0-9]{5}$')]],

      // Security
      password:        ['', PASS_VALIDATORS],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordMatchValidator });
  }

  private buildNurseForm(): void {
    this.nurseForm = this.fb.group({
      // Name
      firstName:  ['', FIRST_NAME_VALIDATORS],
      middleName: ['', [Validators.maxLength(30), Validators.pattern('^[A-Za-z]*$')]],
      lastName:   ['', [Validators.required, Validators.maxLength(30), lastNameValidator()]],

      // Professional
      licenseNumber:  ['', [Validators.required, Validators.pattern('^[A-Z]{2}[0-9]{10}$')]],
      specialization: ['', Validators.required],
      experience:     ['', Validators.required],
      availability:   ['', Validators.required],

      // Contact
      email:            ['', EMAIL_VALIDATORS],
      phoneCountryCode: ['+91'],
      phone:            ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],

      // Address
      addressLine1: ['', [Validators.required, Validators.maxLength(100)]],
      addressLine2: ['', Validators.maxLength(100)],
      landmark:     ['', Validators.maxLength(60)],
      country:      [{ value: 'India', disabled: true }],
      state:        ['', Validators.required],
      city:         ['', Validators.required],
      pincode:      ['', [Validators.required, Validators.pattern('^[1-9][0-9]{5}$')]],

      // Security
      password:        ['', PASS_VALIDATORS],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordMatchValidator });
  }

  private buildOrgForm(): void {
    const ORG_EMAIL_V = [
      Validators.required,
      Validators.email,
      Validators.pattern('^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.(com|org|in)$'),
    ];
    this.orgForm = this.fb.group({
      // Organization identity
      orgType:           ['', Validators.required],
      orgName:           [{ value: '', disabled: true }, [
        Validators.required, Validators.minLength(3), Validators.maxLength(30),
        Validators.pattern("^[A-Za-z][A-Za-z .,\\-&()'\\/]*$")
      ]],
      regNumber:         ['', [Validators.required, Validators.pattern('^[A-Za-z]{6}$')]],
      licenseNumber:     ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      // Contact person
      contactFirstName:  ['', FIRST_NAME_VALIDATORS],
      contactMiddleName: ['', [Validators.maxLength(30), Validators.pattern('^[A-Za-z]*$')]],
      contactLastName:   ['', [Validators.required, Validators.maxLength(30), lastNameValidator()]],
      designation:       ['', Validators.required],
      // Contact details
      email:             ['', ORG_EMAIL_V],
      phoneCountryCode:  ['+91'],
      phone:             ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      // Address
      addressLine1:      ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      addressLine2:      ['', Validators.maxLength(100)],
      landmark:          ['', Validators.maxLength(60)],
      country:           [{ value: 'India', disabled: true }],
      state:             ['', Validators.required],
      city:              ['', Validators.required],
      pincode:           ['', [Validators.required, Validators.pattern('^[1-9][0-9]{5}$')]],
      website:           [''],
      // Security
      password:          ['', PASS_VALIDATORS],
      confirmPassword:   ['', Validators.required],
    }, { validators: passwordMatchValidator });
  }

  // ── State/city cascade ─────────────────────────────────────────────────────

  onStateChange(stateName: string): void {
    this.cities = [];
    this.patientForm.get('city')?.setValue('');
    if (stateName) {
      this.geoSvc.getCities(stateName).subscribe(c => this.cities = c);
    }
  }

  onNurseStateChange(stateName: string): void {
    this.nurseCities = [];
    this.nurseForm.get('city')?.setValue('');
    if (stateName) {
      this.geoSvc.getCities(stateName).subscribe(c => this.nurseCities = c);
    }
  }

  onOrgTypeChange(val: string): void {
    const ctrl = this.orgForm.get('orgName');
    if (val) { ctrl?.enable(); } else { ctrl?.disable(); ctrl?.setValue(''); }
  }

  onOrgStateChange(stateName: string): void {
    this.orgCities = [];
    this.orgForm.get('city')?.setValue('');
    if (stateName) {
      this.geoSvc.getCities(stateName).subscribe(c => this.orgCities = c);
    }
  }

  // ── Form getters (patient) ─────────────────────────────────────────────────

  get pFirst()   { return this.patientForm.get('firstName')!; }
  get pMiddle()  { return this.patientForm.get('middleName')!; }
  get pLast()    { return this.patientForm.get('lastName')!; }
  get pDob()     { return this.patientForm.get('dob')!; }
  get pGender()  { return this.patientForm.get('gender')!; }
  get pBlood()   { return this.patientForm.get('bloodGroup')!; }
  get pEmail()   { return this.patientForm.get('email')!; }
  get pPhone()   { return this.patientForm.get('phone')!; }
  get pAddr1()   { return this.patientForm.get('addressLine1')!; }
  get pAddr2()   { return this.patientForm.get('addressLine2')!; }
  get pLandmark(){ return this.patientForm.get('landmark')!; }
  get pState()   { return this.patientForm.get('state')!; }
  get pCity()    { return this.patientForm.get('city')!; }
  get pPincode() { return this.patientForm.get('pincode')!; }
  get pPass()    { return this.patientForm.get('password')!; }
  get pConfirm() { return this.patientForm.get('confirmPassword')!; }

  // ── Form getters (nurse) ───────────────────────────────────────────────────

  get nFirst()    { return this.nurseForm.get('firstName')!; }
  get nMiddle()   { return this.nurseForm.get('middleName')!; }
  get nLast()     { return this.nurseForm.get('lastName')!; }
  get nLicense()  { return this.nurseForm.get('licenseNumber')!; }
  get nSpec()     { return this.nurseForm.get('specialization')!; }
  get nExp()      { return this.nurseForm.get('experience')!; }
  get nAvail()    { return this.nurseForm.get('availability')!; }
  get nEmail()    { return this.nurseForm.get('email')!; }
  get nPhone()    { return this.nurseForm.get('phone')!; }
  get nAddr1()    { return this.nurseForm.get('addressLine1')!; }
  get nAddr2()    { return this.nurseForm.get('addressLine2')!; }
  get nLandmark() { return this.nurseForm.get('landmark')!; }
  get nState()    { return this.nurseForm.get('state')!; }
  get nCity()     { return this.nurseForm.get('city')!; }
  get nPincode()  { return this.nurseForm.get('pincode')!; }
  get nPass()     { return this.nurseForm.get('password')!; }
  get nConfirm()  { return this.nurseForm.get('confirmPassword')!; }

  // ── Form getters (org) ─────────────────────────────────────────────────────

  get oType()    { return this.orgForm.get('orgType')!; }
  get oName()    { return this.orgForm.get('orgName')!; }
  get oReg()     { return this.orgForm.get('regNumber')!; }
  get oLicense() { return this.orgForm.get('licenseNumber')!; }
  get oCFirst()  { return this.orgForm.get('contactFirstName')!; }
  get oCMiddle() { return this.orgForm.get('contactMiddleName')!; }
  get oCLast()   { return this.orgForm.get('contactLastName')!; }
  get oDesig()   { return this.orgForm.get('designation')!; }
  get oEmail()   { return this.orgForm.get('email')!; }
  get oPhone()   { return this.orgForm.get('phone')!; }
  get oAddr1()   { return this.orgForm.get('addressLine1')!; }
  get oAddr2()   { return this.orgForm.get('addressLine2')!; }
  get oLandmark(){ return this.orgForm.get('landmark')!; }
  get oCity()    { return this.orgForm.get('city')!; }
  get oState()   { return this.orgForm.get('state')!; }
  get oPincode() { return this.orgForm.get('pincode')!; }
  get oPass()    { return this.orgForm.get('password')!; }
  get oConfirm() { return this.orgForm.get('confirmPassword')!; }

  // ── Role switching ─────────────────────────────────────────────────────────

  selectRole(r: string): void { this.role = r; }

  get activeForm(): FormGroup {
    return this.role === 'patient' ? this.patientForm
         : this.role === 'nurse'   ? this.nurseForm
         : this.orgForm;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  register(): void {
    const form = this.activeForm;
    if (form.invalid) { form.markAllAsTouched(); return; }

    this.isLoading = true;
    this.auth.register(this.buildPayload()).subscribe({
      next: () => {
        this.isLoading = false;
        this.openModal('success', 'Registration Successful!',
          'Your account has been created. Click OK to go to the login page.');
      },
      error: (err: Error) => {
        this.isLoading = false;
        this.openModal('error', 'Registration Failed', err.message);
      }
    });
  }

  private buildPayload(): any {
    if (this.role === 'patient') {
      const v = this.patientForm.getRawValue(); // getRawValue includes disabled 'country'
      return {
        role:            'PATIENT',
        firstName:       v.firstName.trim(),
        middleName:      v.middleName?.trim() || '',
        lastName:        v.lastName.trim(),
        email:           v.email.trim().toLowerCase(),
        password:        v.password,
        phoneCountryCode:v.phoneCountryCode,
        phone:           v.phone,
        dob:             v.dob,      // "yyyy-MM-dd"
        dateOfBirth:     v.dob,
        gender:          v.gender,
        bloodGroup:      v.bloodGroup,
        addressLine1:    v.addressLine1.trim(),
        addressLine2:    v.addressLine2?.trim() || '',
        landmark:        v.landmark?.trim()     || '',
        country:         v.country,
        state:           v.state,
        city:            v.city,
        pincode:         v.pincode,
      };
    }

    if (this.role === 'nurse') {
      const v         = this.nurseForm.getRawValue();
      const firstName  = (v.firstName  || '').trim();
      const middleName = (v.middleName || '').trim();
      const lastName   = (v.lastName   || '').trim();
      const fullName   = [firstName, middleName, lastName].filter(Boolean).join(' ');
      const expMap: Record<string, number> = {
        '0-2 years': 0, '2-4 years': 2, '4-6 years': 4, '6-8 years': 6, '8+ years': 8
      };
      return {
        role:             'NURSE',
        firstName,
        middleName,
        lastName,
        fullName,
        email:            v.email.trim().toLowerCase(),
        password:         v.password,
        phoneCountryCode: v.phoneCountryCode,
        phone:            v.phone,
        licenseNumber:    v.licenseNumber.trim(),
        specialization:   v.specialization,
        experienceYears:  expMap[v.experience] ?? 0,
        availability:     v.availability,
        addressLine1:     v.addressLine1.trim(),
        addressLine2:     v.addressLine2?.trim() || '',
        landmark:         v.landmark?.trim()     || '',
        country:          v.country || 'India',
        state:            v.state,
        city:             v.city,
        pincode:          v.pincode,
      };
    }

    const v        = this.orgForm.getRawValue();
    const cFirst   = (v.contactFirstName  || '').trim();
    const cMiddle  = (v.contactMiddleName || '').trim();
    const cLast    = (v.contactLastName   || '').trim();
    const contactPerson = [cFirst, cMiddle, cLast].filter(Boolean).join(' ');
    return {
      role:              'ORGANIZATION',
      fullName:          contactPerson,
      email:             v.email.trim().toLowerCase(),
      password:          v.password,
      orgName:           (v.orgName || '').trim(),
      orgType:           v.orgType,
      regNumber:         v.regNumber.trim(),
      orgLicenseNumber:  v.licenseNumber.trim(),
      contactFirstName:  cFirst,
      contactMiddleName: cMiddle,
      contactLastName:   cLast,
      contactPerson,
      designation:       v.designation,
      phoneCountryCode:  v.phoneCountryCode,
      phone:             v.phone,
      addressLine1:      v.addressLine1.trim(),
      addressLine2:      v.addressLine2?.trim() || '',
      landmark:          v.landmark?.trim()     || '',
      country:           v.country || 'India',
      city:              v.city,
      state:             v.state,
      pincode:           v.pincode,
      website:           v.website?.trim() || '',
    };
  }

  openModal(type: 'success' | 'error', title: string, message: string): void {
    this.modalType = type; this.modalTitle = title; this.modalMessage = message;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    if (this.modalType === 'success') this.router.navigate(['/login']);
  }
}

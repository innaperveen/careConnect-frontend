import { AuthService } from '../../../services/auth.service';
import { NurseService } from '../../../services/nurse.service';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  profileForm!: FormGroup;
  editMode    = false;
  saveSuccess = false;
  saveError   = '';
  isLoading   = true;
  isSaving    = false;

  specializations = [
    'General Nursing', 'ICU / Critical Care', 'Cardiology',
    'Pediatric Nursing', 'Geriatric Care', 'Orthopedic Nursing',
    'Oncology', 'Emergency / Trauma', 'Psychiatric Nursing', 'Home Healthcare'
  ];

  expertiseAreas = [
    'ICU', 'Pediatric', 'Elderly Care', 'Post-Surgery',
    'Wound Dressing', 'Physiotherapy', 'Ventilator Management',
    'Cardiac Monitoring', 'Medication Administration', 'Palliative Care'
  ];

  shiftTypes = ['Morning', 'Evening', 'Night', 'Rotating', 'Flexible'];

  selectedExpertise: string[] = [];
  selectedShifts:    string[] = [];

  constructor(
    private auth:       AuthService,
    private nurseSvc:   NurseService,
    private fb:         FormBuilder
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      fullName:        ['', [Validators.required, Validators.minLength(3)]],
      licenseNumber:   ['', [Validators.required]],
      email:           ['', [Validators.required, Validators.email]],
      phone:           ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      specialization:  ['', Validators.required],
      experience:      ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      availability:    ['', Validators.required],
      address:         ['', [Validators.required, Validators.minLength(10)]],
      education:       ['', Validators.required],
      certifications:  [''],
      reference1Name:  [''],
      reference1Phone: ['', [Validators.pattern('^[0-9]{10}$')]],
      reference2Name:  [''],
      reference2Phone: ['', [Validators.pattern('^[0-9]{10}$')]],
      bio:             ['']
    });
    this.profileForm.disable();
    this.loadProfile();
  }

  get f() { return this.profileForm.controls; }

  private loadProfile(): void {
    const userId = this.auth.getUserId();
    if (!userId) { this.isLoading = false; return; }

    this.nurseSvc.getProfile(userId).subscribe({
      next: (data) => {
        this.isLoading = false;
        this.profileForm.patchValue({
          fullName:       data.fullName       || '',
          licenseNumber:  data.licenseNumber  || '',
          email:          data.email          || '',
          phone:          data.phone          || '',
          specialization: data.specialization || '',
          experience:     data.experienceYears != null ? String(data.experienceYears) : '',
          availability:   data.availability   || '',
          address:        data.address        || '',
          education:      data.education      || '',
          bio:            ''
        });

        // expertise comma-string → array
        if (data.expertise) {
          this.selectedExpertise = data.expertise.split(',')
            .map((s: string) => s.trim()).filter((s: string) => s);
        }

        // references field — stored as simple text; parse ref1 / ref2 if available
        if (data.references) {
          this.profileForm.patchValue({ reference1Name: data.references });
        }
      },
      error: () => { this.isLoading = false; }
    });
  }

  toggleExpertise(area: string) {
    if (!this.editMode) return;
    const idx = this.selectedExpertise.indexOf(area);
    if (idx > -1) this.selectedExpertise.splice(idx, 1);
    else          this.selectedExpertise.push(area);
  }

  toggleShift(shift: string) {
    if (!this.editMode) return;
    const idx = this.selectedShifts.indexOf(shift);
    if (idx > -1) this.selectedShifts.splice(idx, 1);
    else          this.selectedShifts.push(shift);
  }

  enableEdit() {
    this.editMode    = true;
    this.saveSuccess = false;
    this.saveError   = '';
    this.profileForm.enable();
    // licenseNumber and email are not editable
    this.profileForm.get('licenseNumber')?.disable();
    this.profileForm.get('email')?.disable();
  }

  cancelEdit() {
    this.editMode = false;
    this.profileForm.disable();
    this.saveError = '';
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const userId = this.auth.getUserId();
    if (!userId) return;

    this.isSaving  = true;
    this.saveError = '';

    const v = this.profileForm.getRawValue();
    const payload: any = {
      fullName:        v.fullName?.trim(),
      phone:           v.phone,
      specialization:  v.specialization,
      experienceYears: v.experience ? parseInt(v.experience, 10) : null,
      availability:    v.availability,
      address:         v.address?.trim(),
      education:       v.education?.trim(),
      expertise:       this.selectedExpertise.join(','),
      references:      v.reference1Name?.trim() || ''
    };

    this.nurseSvc.updateProfile(userId, payload).subscribe({
      next: () => {
        this.isSaving    = false;
        this.editMode    = false;
        this.saveSuccess = true;
        this.profileForm.disable();
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: (err: Error) => {
        this.isSaving  = false;
        this.saveError = err.message;
      }
    });
  }

  logout(): void { this.auth.logout(); }
}

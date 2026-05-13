import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

function salaryRangeValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const min = parseFloat(group.get('salaryMin')?.value || '0');
    const max = parseFloat(group.get('salaryMax')?.value || '0');
    if (min && max && max < min) return { salaryRange: true };
    return null;
  };
}

@Component({
  selector: 'app-post-job',
  templateUrl: './post-job.component.html',
  styleUrls: ['./post-job.component.css']
})
export class PostJobComponent implements OnInit {

  activeTab: 'post' | 'jobs' = 'post';

  jobForm: FormGroup;
  isPosting   = false;
  successMsg  = '';
  errorMsg    = '';

  myJobs:       any[] = [];
  isLoadingJobs = false;

  orgLocation   = '';
  jobTitles:    string[] = [];
  showOtherTitle = false;

  private userId!: number;

  readonly today       = new Date().toISOString().split('T')[0];
  readonly minDeadline = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  readonly DEPARTMENTS = [
    'Critical Care / ICU', 'Emergency', 'Surgery / OT', 'Medical Ward',
    'Pediatrics', 'Geriatrics', 'Maternity / Gynecology', 'Oncology',
    'Cardiology', 'Neurology', 'Orthopedics', 'Psychiatry',
    'Rehabilitation', 'Home Care', 'General Ward', 'Other'
  ];

  readonly DEPT_JOBS: Record<string, string[]> = {
    'Critical Care / ICU': ['ICU Nurse', 'Critical Care Specialist', 'Ventilator Nurse', 'ICU In-Charge', 'Other'],
    'Emergency':           ['Emergency Nurse', 'Trauma Nurse', 'Triage Nurse', 'ER In-Charge', 'Other'],
    'Surgery / OT':        ['OT Nurse', 'Scrub Nurse', 'Recovery Nurse', 'Anaesthesia Nurse', 'Other'],
    'Medical Ward':        ['Staff Nurse', 'Senior Nurse', 'Ward In-Charge', 'General Duty Nurse', 'Other'],
    'Pediatrics':          ['Pediatric Nurse', 'NICU Nurse', 'Child Care Nurse', 'Pediatric In-Charge', 'Other'],
    'Geriatrics':          ['Geriatric Care Nurse', 'Elder Care Specialist', 'Palliative Care Nurse', 'Other'],
    'Maternity / Gynecology': ['Midwife', 'Labour Room Nurse', 'Post-natal Nurse', 'Gynecology Nurse', 'Other'],
    'Oncology':            ['Oncology Nurse', 'Chemotherapy Nurse', 'Palliative Care Nurse', 'Other'],
    'Cardiology':          ['Cardiac Nurse', 'Cath Lab Nurse', 'CCU Nurse', 'Cardiac In-Charge', 'Other'],
    'Neurology':           ['Neurology Nurse', 'Neuro ICU Nurse', 'Stroke Care Nurse', 'Other'],
    'Orthopedics':         ['Ortho Nurse', 'Physiotherapy Assistant', 'Plaster Room Nurse', 'Other'],
    'Psychiatry':          ['Psychiatric Nurse', 'Mental Health Nurse', 'De-addiction Nurse', 'Other'],
    'Rehabilitation':      ['Rehab Nurse', 'Physiotherapy Nurse', 'OT Technician', 'Other'],
    'Home Care':           ['Home Care Nurse', 'Visiting Nurse', 'Palliative Home Care Nurse', 'Other'],
    'General Ward':        ['General Duty Nurse', 'Staff Nurse', 'Ward In-Charge', 'Other'],
    'Other':               ['Other'],
  };

  readonly SPECIALIZATIONS = [
    'ICU / Critical Care', 'Emergency / Trauma', 'General Nursing', 'Home Care',
    'Pediatrics', 'Geriatrics', 'Maternity & Gynecology', 'Oncology',
    'Cardiology', 'Neurology', 'Orthopedics', 'Psychiatry',
    'Wound Care', 'Palliative Care', 'Physiotherapy', 'Other'
  ];

  readonly SHIFT_OPTIONS = [
    'Morning (6 AM – 2 PM)', 'Afternoon (2 PM – 10 PM)', 'Night (10 PM – 6 AM)',
    'Rotational', '12-Hour Day Shift', '12-Hour Night Shift', 'Flexible'
  ];

  readonly OPENINGS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20];

  constructor(
    private fb:           FormBuilder,
    private adminService: AdminService,
    private auth:         AuthService
  ) {
    this.jobForm = this.fb.group({
      department:    ['', Validators.required],
      jobTitle:      ['', Validators.required],
      jobTitleOther: ['', [Validators.minLength(3), Validators.maxLength(20),
                           Validators.pattern('^[A-Za-z /\\-]+$')]],
      openings:      ['', Validators.required],
      location:      [{ value: '', disabled: true }, Validators.required],
      jobType:       ['', Validators.required],
      specialization:['', Validators.required],
      description:   [{ value: '', disabled: true },
                      [Validators.required, Validators.minLength(10), Validators.maxLength(100)]],
      shiftDetails:  ['', Validators.required],
      salaryMin:     ['', [Validators.min(5000), Validators.max(500000)]],
      salaryMax:     ['', [Validators.min(5000), Validators.max(500000)]],
      priority:      ['Normal', Validators.required],
      deadline:      ['', Validators.required],
    }, { validators: salaryRangeValidator() });
  }

  ngOnInit(): void {
    this.userId = this.auth.getUserId()!;
    this.loadOrgLocation();
    this.loadJobs();
  }

  private loadOrgLocation(): void {
    this.adminService.getOrgProfile(this.userId).subscribe({
      next: (org) => {
        const parts = [org?.addressLine1 || org?.address, org?.city, org?.state].filter(Boolean);
        this.orgLocation = parts.join(', ') || '';
        this.jobForm.get('location')?.setValue(this.orgLocation);
      },
      error: () => {}
    });
  }

  loadJobs(): void {
    this.isLoadingJobs = true;
    this.adminService.getMyJobs(this.userId).subscribe({
      next: (data) => { this.myJobs = data || []; this.isLoadingJobs = false; },
      error: ()     => { this.isLoadingJobs = false; }
    });
  }

  get f() { return this.jobForm.controls; }

  get descLen(): number { return (this.jobForm.get('description')?.value || '').length; }

  onDepartmentChange(dept: string): void {
    this.jobTitles      = this.DEPT_JOBS[dept] || ['Other'];
    this.showOtherTitle = false;
    this.jobForm.get('jobTitle')?.setValue('');
    this.jobForm.get('jobTitleOther')?.setValue('');
  }

  onTitleChange(title: string): void {
    this.showOtherTitle = title === 'Other';
    if (!this.showOtherTitle) this.jobForm.get('jobTitleOther')?.setValue('');
  }

  onSpecChange(spec: string): void {
    const ctrl = this.jobForm.get('description');
    if (spec) { ctrl?.enable(); } else { ctrl?.disable(); ctrl?.setValue(''); }
  }

  onSubmit(): void {
    if (this.jobForm.invalid) { this.jobForm.markAllAsTouched(); return; }

    const selectedTitle = this.jobForm.value.jobTitle;
    const otherTitle    = (this.jobForm.value.jobTitleOther || '').trim();
    if (selectedTitle === 'Other' && !otherTitle) {
      this.jobForm.get('jobTitleOther')?.setErrors({ required: true });
      this.jobForm.get('jobTitleOther')?.markAsTouched();
      return;
    }

    this.isPosting  = true;
    this.successMsg = '';
    this.errorMsg   = '';

    const v = this.jobForm.getRawValue();
    const payload = {
      jobTitle:       selectedTitle === 'Other' ? otherTitle : selectedTitle,
      department:     v.department,
      openings:       Number(v.openings),
      location:       v.location,
      jobType:        v.jobType,
      specialization: v.specialization,
      description:    (v.description || '').trim(),
      shiftDetails:   v.shiftDetails,
      salaryMin:      v.salaryMin ? parseFloat(v.salaryMin) : null,
      salaryMax:      v.salaryMax ? parseFloat(v.salaryMax) : null,
      priority:       v.priority,
      deadline:       v.deadline ? v.deadline + ':00' : null,
    };

    this.adminService.createJob(this.userId, payload).subscribe({
      next: (created) => {
        this.isPosting      = false;
        this.successMsg     = 'Job posted successfully!';
        this.jobTitles      = [];
        this.showOtherTitle = false;
        this.jobForm.reset({ priority: 'Normal' });
        this.jobForm.get('location')?.setValue(this.orgLocation);
        this.jobForm.get('description')?.disable();
        this.myJobs.unshift(created);
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: (err: Error) => {
        this.isPosting = false;
        this.errorMsg  = err.message;
        setTimeout(() => this.errorMsg = '', 5000);
      }
    });
  }

  updateStatus(job: any, status: string): void {
    this.adminService.updateJobStatus(job.id, status).subscribe({
      next: () => { job.status = status; }
    });
  }

  deleteJob(id: number): void {
    this.adminService.deleteJob(id).subscribe({
      next: () => { this.myJobs = this.myJobs.filter(j => j.id !== id); }
    });
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'ACTIVE' ? 'badge-active' : s === 'CLOSED' ? 'badge-closed' : 'badge-draft';
  }

  logout(): void { this.auth.logout(); }
}

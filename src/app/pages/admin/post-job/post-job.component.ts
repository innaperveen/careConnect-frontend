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

  jobForm:    FormGroup;
  isPosting   = false;
  successMsg  = '';
  errorMsg    = '';

  myJobs:       any[] = [];
  isLoadingJobs = false;

  orgCity = '';

  specializations = ['ICU / Critical Care', 'Home Care', 'Pediatrics', 'Geriatrics',
                     'Wound Care', 'Palliative Care', 'General Nursing', 'Physiotherapy'];

  private userId!: number;

  today = new Date().toISOString().split('T')[0];

  constructor(
    private fb:           FormBuilder,
    private adminService: AdminService,
    private auth:         AuthService
  ) {
    this.jobForm = this.fb.group({
      jobTitle:       ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      department:     ['', Validators.required],
      location:       [{ value: '', disabled: true }, Validators.required],
      jobType:        ['', Validators.required],
      specialization: ['', Validators.required],
      salaryMin:      ['', [Validators.min(5000), Validators.max(500000)]],
      salaryMax:      ['', [Validators.min(5000), Validators.max(500000)]],
      description:    ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
      priority:       ['Normal', Validators.required],
      deadline:       ['', Validators.required],
    }, { validators: salaryRangeValidator() });
  }

  ngOnInit(): void {
    this.userId = this.auth.getUserId()!;
    this.loadOrgCity();
    this.loadJobs();
  }

  private loadOrgCity(): void {
    this.adminService.getOrgProfile(this.userId).subscribe({
      next: (org) => {
        this.orgCity = org?.city || org?.address || '';
        this.jobForm.get('location')?.setValue(this.orgCity);
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

  onSubmit(): void {
    if (this.jobForm.invalid) { this.jobForm.markAllAsTouched(); return; }

    const salaryMin = parseFloat(this.jobForm.value.salaryMin || '0');
    const salaryMax = parseFloat(this.jobForm.value.salaryMax || '0');
    if (salaryMin && salaryMax && salaryMax < salaryMin) {
      this.errorMsg = 'Maximum salary must be greater than or equal to minimum salary.';
      return;
    }

    this.isPosting  = true;
    this.successMsg = '';
    this.errorMsg   = '';

    const v = this.jobForm.getRawValue();
    const payload = {
      jobTitle:       v.jobTitle.trim(),
      department:     v.department.trim(),
      location:       v.location,
      jobType:        v.jobType,
      specialization: v.specialization,
      salaryMin:      v.salaryMin ? parseFloat(v.salaryMin) : null,
      salaryMax:      v.salaryMax ? parseFloat(v.salaryMax) : null,
      description:    v.description.trim(),
      priority:       v.priority,
      deadline:       v.deadline,
    };

    this.adminService.createJob(this.userId, payload).subscribe({
      next: (created) => {
        this.isPosting  = false;
        this.successMsg = 'Job posted successfully!';
        this.jobForm.reset({ priority: 'Normal' });
        this.jobForm.get('location')?.setValue(this.orgCity);
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

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-post-job',
  templateUrl: './post-job.component.html',
  styleUrls: ['./post-job.component.css']
})
export class PostJobComponent implements OnInit {

  activeTab: 'post' | 'jobs' = 'post';

  // Post form
  jobForm: FormGroup;
  isPosting  = false;
  successMsg = '';
  errorMsg   = '';

  // My Jobs
  myJobs:       any[] = [];
  isLoadingJobs = false;

  specializations = ['ICU / Critical Care', 'Home Care', 'Pediatrics', 'Geriatrics',
                     'Wound Care', 'Palliative Care', 'General Nursing', 'Physiotherapy'];

  private userId!: number;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private auth: AuthService
  ) {
    this.jobForm = this.fb.group({
      jobTitle:       ['', [Validators.required, Validators.minLength(3)]],
      department:     ['', Validators.required],
      location:       ['', Validators.required],
      jobType:        ['', Validators.required],
      specialization: ['', Validators.required],
      salaryMin:      [''],
      salaryMax:      [''],
      description:    ['', [Validators.required, Validators.minLength(20)]],
      priority:       ['Normal', Validators.required],
      deadline:       ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.userId = this.auth.getUserId()!;
    this.loadJobs();
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

    this.isPosting = true;
    this.successMsg = '';
    this.errorMsg   = '';

    const v = this.jobForm.value;
    const payload = {
      jobTitle:       v.jobTitle.trim(),
      department:     v.department.trim(),
      location:       v.location.trim(),
      jobType:        v.jobType,
      specialization: v.specialization,
      salaryMin:      v.salaryMin ? parseFloat(v.salaryMin) : null,
      salaryMax:      v.salaryMax ? parseFloat(v.salaryMax) : null,
      description:    v.description.trim(),
      priority:       v.priority,
      deadline:       v.deadline
    };

    this.adminService.createJob(this.userId, payload).subscribe({
      next: (created) => {
        this.isPosting = false;
        this.successMsg = 'Job posted successfully!';
        this.jobForm.reset({ priority: 'Normal' });
        this.myJobs.unshift(created);          // add to top of list immediately
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: (err: Error) => {
        this.isPosting = false;
        this.errorMsg = err.message;
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
    return s === 'ACTIVE' ? 'badge-active'
         : s === 'CLOSED' ? 'badge-closed'
         : 'badge-draft';
  }
  logout(): void { this.auth.logout(); }
}

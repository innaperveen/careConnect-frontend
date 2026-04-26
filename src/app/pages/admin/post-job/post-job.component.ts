import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-post-job',
  templateUrl: './post-job.component.html',
  styleUrls: ['./post-job.component.css']
})
export class PostJobComponent {

  jobForm: FormGroup;
  submitted = false;

  specializations = ['ICU / Critical Care', 'Home Care', 'Pediatrics', 'Geriatrics',
                     'Wound Care', 'Palliative Care', 'General Nursing', 'Physiotherapy'];

  constructor(private fb: FormBuilder) {
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

  get f() { return this.jobForm.controls; }

  onSubmit(): void {
    if (this.jobForm.invalid) { this.jobForm.markAllAsTouched(); return; }
    this.submitted = true;
    setTimeout(() => { this.submitted = false; this.jobForm.reset({ priority: 'Normal' }); }, 3000);
  }
}

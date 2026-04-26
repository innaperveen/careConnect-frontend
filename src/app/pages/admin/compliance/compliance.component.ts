import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface ComplianceRecord {
  id: number;
  nurseName: string;
  requirement: string;
  dueDate: string;
  status: 'Compliant' | 'Pending' | 'Non-Compliant';
  notes: string;
}

@Component({
  selector: 'app-compliance',
  templateUrl: './compliance.component.html',
  styleUrls: ['./compliance.component.css']
})
export class ComplianceComponent {

  activeTab: string = 'All';
  tabs = ['All', 'Compliant', 'Pending', 'Non-Compliant'];
  formOpen = false;
  formSaved = false;

  records: ComplianceRecord[] = [
    { id: 1, nurseName: 'Priya Sharma',  requirement: 'Annual Health Check',     dueDate: 'May 15, 2026', status: 'Compliant',     notes: 'Completed on time' },
    { id: 2, nurseName: 'Rahul Mehta',   requirement: 'BLS Certification',       dueDate: 'Apr 30, 2026', status: 'Pending',       notes: 'Awaiting certificate' },
    { id: 3, nurseName: 'Anika Joshi',   requirement: 'Hepatitis B Vaccination', dueDate: 'Mar 01, 2026', status: 'Compliant',     notes: '' },
    { id: 4, nurseName: 'Karan Singh',   requirement: 'Background Check',        dueDate: 'Apr 10, 2026', status: 'Non-Compliant', notes: 'Failed background check' },
    { id: 5, nurseName: 'Deepa Nair',    requirement: 'HIPAA Training',          dueDate: 'May 31, 2026', status: 'Pending',       notes: 'Training scheduled' },
    { id: 6, nurseName: 'Sunita Patel',  requirement: 'CPR Certification',       dueDate: 'Jun 20, 2026', status: 'Compliant',     notes: '' }
  ];

  complianceForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.complianceForm = this.fb.group({
      nurseName:   ['', Validators.required],
      requirement: ['', Validators.required],
      dueDate:     ['', Validators.required],
      status:      ['Pending', Validators.required],
      notes:       ['']
    });
  }

  get filteredRecords(): ComplianceRecord[] {
    return this.activeTab === 'All'
      ? this.records
      : this.records.filter(r => r.status === this.activeTab);
  }

  countByStatus(status: string): number {
    return this.records.filter(r => r.status === status).length;
  }

  onSave(): void {
    if (this.complianceForm.invalid) { this.complianceForm.markAllAsTouched(); return; }
    const v = this.complianceForm.value;
    this.records.push({ id: Date.now(), ...v });
    this.formSaved = true;
    this.formOpen = false;
    this.complianceForm.reset({ status: 'Pending' });
    setTimeout(() => this.formSaved = false, 3000);
  }

  getStatusClass(status: string): string {
    return status === 'Compliant' ? 'badge-compliant'
         : status === 'Non-Compliant' ? 'badge-noncompliant'
         : 'badge-pending';
  }
}

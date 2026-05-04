import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-compliance',
  templateUrl: './compliance.component.html',
  styleUrls: ['./compliance.component.css']
})
export class ComplianceComponent implements OnInit {

  activeTab = 'All';
  tabs       = ['All', 'COMPLIANT', 'PENDING', 'NON_COMPLIANT'];
  tabLabels: Record<string, string> = { All: 'All', COMPLIANT: 'Compliant', PENDING: 'Pending', NON_COMPLIANT: 'Non-Compliant' };

  formOpen  = false;
  isSaving  = false;
  formSaved = false;
  errorMsg  = '';

  records: any[] = [];
  isLoading = true;

  complianceForm: FormGroup;

  private orgUserId!: number;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private auth: AuthService
  ) {
    this.complianceForm = this.fb.group({
      nurseName:   ['', Validators.required],
      requirement: ['', Validators.required],
      dueDate:     ['', Validators.required],
      status:      ['PENDING', Validators.required],
      notes:       ['']
    });
  }

  ngOnInit(): void {
    this.orgUserId = this.auth.getUserId()!;
    this.loadRecords();
  }

  loadRecords(): void {
    this.isLoading = true;
    this.adminService.getCompliance(this.orgUserId).subscribe({
      next: (data) => { this.records = data || []; this.isLoading = false; },
      error: ()     => { this.isLoading = false; }
    });
  }

  get filteredRecords(): any[] {
    return this.activeTab === 'All'
      ? this.records
      : this.records.filter(r => r.status === this.activeTab);
  }

  countByStatus(status: string): number {
    return this.records.filter(r => r.status === status).length;
  }

  onSave(): void {
    if (this.complianceForm.invalid) { this.complianceForm.markAllAsTouched(); return; }

    this.isSaving = true;
    this.errorMsg = '';
    const v = this.complianceForm.value;

    this.adminService.createCompliance(this.orgUserId, v).subscribe({
      next: (created) => {
        this.records.push(created);
        this.formSaved = true;
        this.formOpen  = false;
        this.isSaving  = false;
        this.complianceForm.reset({ status: 'PENDING' });
        setTimeout(() => this.formSaved = false, 3000);
      },
      error: (err: Error) => {
        this.isSaving = false;
        this.errorMsg = err.message;
      }
    });
  }

  updateStatus(id: number, status: string): void {
    this.adminService.updateComplianceStatus(id, status).subscribe({
      next: (updated) => {
        const rec = this.records.find(r => r.id === id);
        if (rec) rec.status = updated?.status ?? status;
      }
    });
  }

  deleteRecord(id: number): void {
    this.adminService.deleteCompliance(id).subscribe({
      next: () => { this.records = this.records.filter(r => r.id !== id); }
    });
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'COMPLIANT'     ? 'badge-compliant'
         : s === 'NON_COMPLIANT' ? 'badge-noncompliant'
         : 'badge-pending';
  }
  logout(): void { this.auth.logout(); }
}

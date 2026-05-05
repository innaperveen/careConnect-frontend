import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { MedicalRecordService } from '../../../services/medical-record.service';

interface MedicalRecord {
  id: number;
  fileName: string;
  type: string;
  date: string;
  notes: string;
}

@Component({
  selector: 'app-medical-records',
  templateUrl: './medical-records.component.html',
  styleUrls: ['./medical-records.component.css']
})
export class MedicalRecordsComponent implements OnInit {

  activeFilter  = 'All';
  filters       = ['All', 'Lab Report', 'Prescription', 'Imaging', 'Discharge Summary'];
  uploadOpen    = false;
  uploadSuccess = false;
  isLoading     = true;
  errorMsg      = '';

  records: MedicalRecord[] = [];
  uploadForm: FormGroup;

  constructor(
    private auth: AuthService,
    private fb: FormBuilder,
    private recordService: MedicalRecordService
  ) {
    this.uploadForm = this.fb.group({
      fileName: ['', [Validators.required, Validators.minLength(3)]],
      type:     ['', Validators.required],
      notes:    ['']
    });
  }

  ngOnInit(): void { this.loadRecords(); }

  private loadRecords(): void {
    const userId = this.auth.getUserId();
    if (!userId) { this.isLoading = false; return; }

    this.recordService.getByPatient(userId).subscribe({
      next: (data) => {
        this.records   = (data || []).map((r: any) => this.mapRecord(r));
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private mapRecord(r: any): MedicalRecord {
    return {
      id:       r.id,
      fileName: r.title || r.fileName || 'Record',
      type:     r.recordType || '—',
      date:     r.createdAt
        ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—',
      notes: r.description || ''
    };
  }

  get filteredRecords(): MedicalRecord[] {
    if (this.activeFilter === 'All') return this.records;
    return this.records.filter(r => r.type === this.activeFilter);
  }

  countByType(type: string): number {
    return this.records.filter(r => r.type === type).length;
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'Lab Report':        return 'bi-flask';
      case 'Prescription':      return 'bi-capsule';
      case 'Imaging':           return 'bi-image';
      case 'Discharge Summary': return 'bi-file-earmark-medical';
      default:                  return 'bi-file-earmark';
    }
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'Lab Report':        return 'type-lab';
      case 'Prescription':      return 'type-rx';
      case 'Imaging':           return 'type-img';
      case 'Discharge Summary': return 'type-dis';
      default:                  return 'type-other';
    }
  }

  onUpload(): void {
    if (this.uploadForm.invalid) { this.uploadForm.markAllAsTouched(); return; }
    const userId = this.auth.getUserId();
    if (!userId) return;

    const v = this.uploadForm.value;
    this.errorMsg = '';

    this.recordService.upload(userId, userId, v.type, v.fileName, v.notes || undefined).subscribe({
      next: (record) => {
        this.records.unshift(this.mapRecord(record));
        this.uploadForm.reset();
        this.uploadOpen    = false;
        this.uploadSuccess = true;
        setTimeout(() => this.uploadSuccess = false, 3000);
      },
      error: (err: Error) => { this.errorMsg = err.message; }
    });
  }

  deleteRecord(id: number): void {
    this.recordService.delete(id).subscribe({
      next: () => { this.records = this.records.filter(r => r.id !== id); },
      error: () => {}
    });
  }

  logout(): void { this.auth.logout(); }
}

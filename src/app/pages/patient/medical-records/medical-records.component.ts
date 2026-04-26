import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface MedicalRecord {
  id: number;
  fileName: string;
  type: string;
  date: string;
  size: string;
  doctor: string;
  notes: string;
}

@Component({
  selector: 'app-medical-records',
  templateUrl: './medical-records.component.html',
  styleUrls: ['./medical-records.component.css']
})
export class MedicalRecordsComponent {

  activeFilter = 'All';
  filters = ['All', 'Lab Report', 'Prescription', 'Imaging', 'Discharge Summary'];
  uploadOpen = false;
  uploadSuccess = false;

  records: MedicalRecord[] = [
    { id: 1, fileName: 'Blood_Test_Oct2025.pdf',    type: 'Lab Report',        date: 'Oct 15, 2025', size: '1.2 MB', doctor: 'Dr. Anil Sharma', notes: 'CBC and Lipid Panel' },
    { id: 2, fileName: 'Chest_Xray_Oct2025.jpg',    type: 'Imaging',           date: 'Oct 10, 2025', size: '3.4 MB', doctor: 'Dr. Priya Mehta',  notes: 'Annual chest screening' },
    { id: 3, fileName: 'Prescription_Oct2025.pdf',  type: 'Prescription',      date: 'Oct 8, 2025',  size: '0.3 MB', doctor: 'Dr. Rakesh Gupta', notes: 'Blood pressure medication' },
    { id: 4, fileName: 'Discharge_Summary_Sep.pdf', type: 'Discharge Summary', date: 'Sep 28, 2025', size: '0.8 MB', doctor: 'Dr. Neha Singh',   notes: 'Post-surgery discharge notes' },
  ];

  uploadForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.uploadForm = this.fb.group({
      fileName: ['', [Validators.required, Validators.minLength(3)]],
      type:     ['', Validators.required],
      date:     ['', Validators.required],
      doctor:   [''],
      notes:    ['']
    });
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
    const v = this.uploadForm.value;
    const dateStr = v.date ? new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    this.records.unshift({ id: Date.now(), fileName: v.fileName, type: v.type, date: dateStr, size: 'N/A', doctor: v.doctor || 'Self', notes: v.notes || '' });
    this.uploadForm.reset();
    this.uploadOpen = false;
    this.uploadSuccess = true;
    setTimeout(() => this.uploadSuccess = false, 3000);
  }
}

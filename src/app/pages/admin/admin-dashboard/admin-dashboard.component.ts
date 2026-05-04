import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {

  org: any = null;
  isLoadingOrg = true;

  // Edit form
  editOpen  = false;
  isSaving  = false;
  saveError = '';
  editForm!: FormGroup;

  readonly SPECIALIZATION_OPTIONS = [
    'Cardiology', 'Neurology', 'Oncology', 'Orthopaedics', 'Paediatrics',
    'Gynaecology', 'Dermatology', 'Psychiatry', 'Ophthalmology', 'ENT',
    'Nephrology', 'Gastroenterology', 'Urology', 'Pulmonology', 'Endocrinology',
    'General Medicine', 'General Surgery', 'Emergency Medicine', 'Radiology', 'Pathology'
  ];
  selectedSpecs: Set<string> = new Set();

  stats = [
    { icon: 'bi-people-fill',      color: 'si-blue',   value: '—', label: 'Total Nurses'         },
    { icon: 'bi-briefcase-fill',   color: 'si-green',  value: '—', label: 'Active Job Posts'     },
    { icon: 'bi-file-person-fill', color: 'si-amber',  value: '—', label: 'Pending Applications' },
    { icon: 'bi-person-check-fill',color: 'si-purple', value: '—', label: 'Hires This Month'     }
  ];

  recentApplications: any[] = [];
  recentActivity:     any[] = [];
  isLoadingApps = true;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) return;

    this.adminService.getOrgProfile(userId).subscribe({
      next: (data) => {
        // Map backend field names (orgName, orgType) to what the template expects
        this.org = {
          name:          data.orgName        || '—',
          type:          data.orgType        || '—',
          regNumber:     data.regNumber      || '—',
          licenseNumber: data.regNumber      || '—',
          contactPerson: data.contactPerson  || '—',
          designation:   data.designation   || '—',
          email:         this.auth.getUser()?.email || '—',
          phone:         data.phone         || '—',
          altPhone:      '—',
          address:       data.address       || '—',
          city:          data.city          || '—',
          state:         data.state         || '—',
          pincode:       data.pincode       || '—',
          website:       data.website       || '—',
          status:          'Active',
          accreditation:   data.accreditation || '—',
          established:     data.createdAt ? new Date(data.createdAt).getFullYear().toString() : '—',
          bedCapacity:     data.bedCapacity  || '—',
          specializations: data.specializations
                             ? data.specializations.split(',').map((s: string) => s.trim()).filter((s: string) => s)
                             : []
        };
        this.isLoadingOrg = false;
      },
      error: () => { this.isLoadingOrg = false; }
    });

    this.adminService.getDashboardStats(userId).subscribe({
      next: (data) => {
        if (data) {
          this.stats[0].value = String(data.hiredNurses          ?? '0');
          this.stats[1].value = String(data.activeJobs           ?? '0');
          this.stats[2].value = String(data.pendingApplications  ?? '0');
          this.stats[3].value = String(data.approvedApplications ?? '0');
        }
      },
      error: () => {}
    });

    this.adminService.getOrgApplications(userId).subscribe({
      next: (apps) => {
        const list = apps || [];

        this.recentApplications = list.slice(0, 5).map(a => ({
          name:       a.nurseName,
          role:       a.jobTitle,
          experience: a.nurseExperience != null ? a.nurseExperience + ' yrs' : '—',
          date:       a.appliedAt,
          status:     a.status
        }));

        // Build activity feed from applications sorted newest-first
        this.recentActivity = [...list]
          .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
          .slice(0, 6)
          .map(a => {
            const s = (a.status ?? '').toUpperCase();
            return {
              icon:  s === 'APPROVED' ? 'bi-person-check-fill'
                   : s === 'REJECTED' ? 'bi-x-circle-fill'
                   : 'bi-file-person-fill',
              color: s === 'APPROVED' ? 'act-green'
                   : s === 'REJECTED' ? 'act-red'
                   : 'act-blue',
              text:  s === 'APPROVED'
                   ? `${a.nurseName} approved for ${a.jobTitle}`
                   : s === 'REJECTED'
                   ? `${a.nurseName} application rejected`
                   : `New application from ${a.nurseName} for ${a.jobTitle}`,
              time: this.timeAgo(a.appliedAt)
            };
          });

        this.isLoadingApps = false;
      },
      error: () => { this.isLoadingApps = false; }
    });
  }

  // ── Edit profile ────────────────────────────────────────────────

  openEditForm(): void {
    this.editForm = this.fb.group({
      orgName:       [this.org.name,          [Validators.required, Validators.minLength(3)]],
      orgType:       [this.org.type,          Validators.required],
      contactPerson: [this.org.contactPerson, [Validators.required, Validators.minLength(3)]],
      designation:   [this.org.designation,  [Validators.required, Validators.minLength(3)]],
      phone:         [this.org.phone,         [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      address:       [this.org.address,       [Validators.required, Validators.minLength(5)]],
      city:          [this.org.city,          Validators.required],
      state:         [this.org.state,         Validators.required],
      pincode:       [this.org.pincode,       [Validators.required, Validators.pattern('^[0-9]{6}$')]],
      website:       [this.org.website === '—' ? '' : this.org.website],
      bedCapacity:   [this.org.bedCapacity === '—' ? '' : this.org.bedCapacity,
                      [Validators.min(1), Validators.max(10000)]],
      accreditation: [this.org.accreditation === '—' ? '' : this.org.accreditation]
    });

    // Pre-select existing specializations
    this.selectedSpecs = new Set(
      (this.org.specializations as string[]).filter((s: string) => s.trim())
    );

    this.saveError = '';
    this.editOpen  = true;
  }

  toggleSpec(spec: string): void {
    this.selectedSpecs.has(spec) ? this.selectedSpecs.delete(spec) : this.selectedSpecs.add(spec);
  }

  onSave(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }

    const userId = this.auth.getUserId();
    if (!userId) return;

    this.isSaving  = true;
    this.saveError = '';

    const v = this.editForm.value;
    const payload = {
      ...v,
      bedCapacity:     v.bedCapacity ? Number(v.bedCapacity) : null,
      specializations: Array.from(this.selectedSpecs).join(',')
    };

    this.adminService.updateOrgProfile(userId, payload).subscribe({
      next: () => {
        // Refresh org object with updated values
        this.org = {
          ...this.org,
          name:            v.orgName,
          type:            v.orgType,
          contactPerson:   v.contactPerson,
          designation:     v.designation,
          phone:           v.phone,
          address:         v.address,
          city:            v.city,
          state:           v.state,
          pincode:         v.pincode,
          website:         v.website || '—',
          bedCapacity:     v.bedCapacity || '—',
          accreditation:   v.accreditation || '—',
          specializations: Array.from(this.selectedSpecs)
        };
        this.isSaving = false;
        this.editOpen = false;
      },
      error: (err: Error) => {
        this.isSaving  = false;
        this.saveError = err.message;
      }
    });
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'APPROVED' ? 'badge-approved'
         : s === 'REJECTED' ? 'badge-rejected'
         : 'badge-pending';
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
  logout(): void { this.auth.logout(); }
}

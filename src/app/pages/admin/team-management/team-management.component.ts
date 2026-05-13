import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-team-management',
  templateUrl: './team-management.component.html',
  styleUrls: ['./team-management.component.css']
})
export class TeamManagementComponent implements OnInit {

  isLoading     = true;
  addOpen       = false;
  isSaving      = false;
  successMsg    = '';
  errorMsg      = '';

  approvedNurses: any[] = [];
  teamMembers:    any[] = [];

  memberForm: FormGroup;
  private orgUserId!: number;

  readonly COUNTRY_CODES = [
    { label: '🇮🇳 +91 India',     code: '+91'  },
    { label: '🇺🇸 +1  USA/Canada', code: '+1'   },
    { label: '🇬🇧 +44 UK',         code: '+44'  },
    { label: '🇦🇺 +61 Australia',  code: '+61'  },
    { label: '🇦🇪 +971 UAE',       code: '+971' },
    { label: '🇸🇬 +65 Singapore',  code: '+65'  },
    { label: '🇩🇪 +49 Germany',    code: '+49'  },
    { label: '🇫🇷 +33 France',     code: '+33'  },
  ];

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private auth: AuthService
  ) {
    this.memberForm = this.fb.group({
      firstName:       ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30),
                             Validators.pattern('^[A-Za-z]+$')]],
      middleName:      ['', [Validators.maxLength(30), Validators.pattern('^[A-Za-z]*$')]],
      lastName:        ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30),
                             Validators.pattern('^[A-Za-z.]+$')]],
      role:            ['', Validators.required],
      email:           ['', [Validators.required, Validators.email,
                             Validators.pattern('^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.com$')]],
      phoneCountryCode:['+91'],
      phone:           ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      joinDate:        ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.orgUserId = this.auth.getUserId()!;
    this.loadAll();
  }

  loadAll(): void {
    this.isLoading = true;
    forkJoin({
      nurses: this.adminService.getApprovedNurses(this.orgUserId),
      team:   this.adminService.getTeamMembers(this.orgUserId)
    }).subscribe({
      next: ({ nurses, team }) => {
        this.approvedNurses = nurses || [];
        this.teamMembers    = team   || [];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  get f() { return this.memberForm.controls; }

  onAdd(): void {
    if (this.memberForm.invalid) { this.memberForm.markAllAsTouched(); return; }

    this.isSaving = true;
    this.errorMsg = '';

    const v = this.memberForm.value;
    const fullName = [v.firstName.trim(), v.middleName?.trim() || '', v.lastName.trim()]
                     .filter(Boolean).join(' ');
    const payload = {
      name:     fullName,
      role:     v.role,
      email:    v.email.trim().toLowerCase(),
      phone:    (v.phoneCountryCode || '+91') + v.phone,
      joinDate: v.joinDate,
    };

    this.adminService.addTeamMember(this.orgUserId, payload).subscribe({
      next: (member) => {
        this.teamMembers.push(member);
        this.isSaving  = false;
        this.addOpen   = false;
        this.successMsg = 'Team member added successfully!';
        this.memberForm.reset({ phoneCountryCode: '+91' });
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err: Error) => {
        this.isSaving = false;
        this.errorMsg = err.message;
      }
    });
  }

  toggleStatus(member: any): void {
    this.adminService.toggleTeamMemberStatus(member.id).subscribe({
      next: (updated) => { member.status = updated.status; }
    });
  }

  deleteMember(id: number): void {
    this.adminService.deleteTeamMember(id).subscribe({
      next: () => { this.teamMembers = this.teamMembers.filter(m => m.id !== id); }
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  logout(): void { this.auth.logout(); }
}

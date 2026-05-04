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

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private auth: AuthService
  ) {
    this.memberForm = this.fb.group({
      name:     ['', [Validators.required, Validators.minLength(3)]],
      role:     ['', Validators.required],
      email:    ['', [Validators.required, Validators.email]],
      phone:    ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      joinDate: ['', Validators.required]
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

    this.adminService.addTeamMember(this.orgUserId, this.memberForm.value).subscribe({
      next: (member) => {
        this.teamMembers.push(member);
        this.isSaving  = false;
        this.addOpen   = false;
        this.successMsg = 'Team member added successfully!';
        this.memberForm.reset();
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

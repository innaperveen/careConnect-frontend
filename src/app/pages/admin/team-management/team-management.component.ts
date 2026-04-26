import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  joinDate: string;
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-team-management',
  templateUrl: './team-management.component.html',
  styleUrls: ['./team-management.component.css']
})
export class TeamManagementComponent {

  addOpen = false;
  memberSaved = false;

  members: TeamMember[] = [
    { id: 1, name: 'Admin Rajesh Kumar', role: 'Super Admin',       email: 'rajesh@care.com',  phone: '9876543210', joinDate: 'Jan 2024', status: 'Active' },
    { id: 2, name: 'Neha Gupta',         role: 'HR Manager',        email: 'neha@care.com',    phone: '9876543211', joinDate: 'Feb 2024', status: 'Active' },
    { id: 3, name: 'Vikram Rao',         role: 'Operations Manager', email: 'vikram@care.com',  phone: '9876543212', joinDate: 'Mar 2024', status: 'Active' },
    { id: 4, name: 'Sonal Tiwari',       role: 'Compliance Officer', email: 'sonal@care.com',   phone: '9876543213', joinDate: 'Apr 2024', status: 'Inactive' }
  ];

  memberForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.memberForm = this.fb.group({
      name:     ['', [Validators.required, Validators.minLength(3)]],
      role:     ['', Validators.required],
      email:    ['', [Validators.required, Validators.email]],
      phone:    ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      joinDate: ['', Validators.required]
    });
  }

  get f() { return this.memberForm.controls; }

  onAdd(): void {
    if (this.memberForm.invalid) { this.memberForm.markAllAsTouched(); return; }
    const v = this.memberForm.value;
    this.members.push({ id: Date.now(), ...v, status: 'Active' });
    this.memberSaved = true;
    this.addOpen = false;
    this.memberForm.reset();
    setTimeout(() => this.memberSaved = false, 3000);
  }

  toggleStatus(member: TeamMember): void {
    member.status = member.status === 'Active' ? 'Inactive' : 'Active';
  }
}

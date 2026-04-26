import { Component } from '@angular/core';

interface NurseApplication {
  id: number;
  name: string;
  role: string;
  experience: string;
  specialization: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  education: string;
}

@Component({
  selector: 'app-nurse-applications',
  templateUrl: './nurse-applications.component.html',
  styleUrls: ['./nurse-applications.component.css']
})
export class NurseApplicationsComponent {

  activeTab: 'All' | 'Pending' | 'Approved' | 'Rejected' = 'All';
  tabs: Array<'All' | 'Pending' | 'Approved' | 'Rejected'> = ['All', 'Pending', 'Approved', 'Rejected'];

  applications: NurseApplication[] = [
    { id: 1, name: 'Priya Sharma',    role: 'ICU Nurse',         experience: '5 yrs', specialization: 'Critical Care',  date: 'Apr 24, 2026', status: 'Pending',  education: 'B.Sc Nursing, AIIMS' },
    { id: 2, name: 'Rahul Mehta',     role: 'Home Care Nurse',   experience: '3 yrs', specialization: 'Home Care',      date: 'Apr 23, 2026', status: 'Pending',  education: 'GNM, Delhi University' },
    { id: 3, name: 'Anika Joshi',     role: 'Pediatric Nurse',   experience: '7 yrs', specialization: 'Pediatrics',     date: 'Apr 22, 2026', status: 'Approved', education: 'M.Sc Nursing, PGIMER' },
    { id: 4, name: 'Karan Singh',     role: 'General Nurse',     experience: '2 yrs', specialization: 'General Nursing',date: 'Apr 21, 2026', status: 'Rejected', education: 'GNM, Chandigarh' },
    { id: 5, name: 'Deepa Nair',      role: 'Wound Care Nurse',  experience: '4 yrs', specialization: 'Wound Care',     date: 'Apr 20, 2026', status: 'Approved', education: 'B.Sc Nursing, Manipal' },
    { id: 6, name: 'Sunita Patel',    role: 'Geriatric Nurse',   experience: '6 yrs', specialization: 'Geriatrics',     date: 'Apr 18, 2026', status: 'Pending',  education: 'M.Sc Nursing, BHU' },
    { id: 7, name: 'Amit Verma',      role: 'Critical Care',     experience: '8 yrs', specialization: 'Critical Care',  date: 'Apr 16, 2026', status: 'Approved', education: 'B.Sc Nursing, JIPMER' }
  ];

  get filteredApplications(): NurseApplication[] {
    return this.activeTab === 'All'
      ? this.applications
      : this.applications.filter(a => a.status === this.activeTab);
  }

  countByStatus(status: string): number {
    return this.applications.filter(a => a.status === status).length;
  }

  approve(id: number): void {
    const app = this.applications.find(a => a.id === id);
    if (app) app.status = 'Approved';
  }

  reject(id: number): void {
    const app = this.applications.find(a => a.id === id);
    if (app) app.status = 'Rejected';
  }

  getStatusClass(status: string): string {
    return status === 'Approved' ? 'badge-approved'
         : status === 'Rejected' ? 'badge-rejected'
         : 'badge-pending';
  }
}

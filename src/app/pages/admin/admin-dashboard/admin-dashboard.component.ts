import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent {

  recentApplications = [
    { name: 'Priya Sharma',   role: 'ICU Nurse',         date: 'Apr 24, 2026', experience: '5 yrs', status: 'Pending'  },
    { name: 'Rahul Mehta',    role: 'Home Care Nurse',   date: 'Apr 23, 2026', experience: '3 yrs', status: 'Pending'  },
    { name: 'Anika Joshi',    role: 'Pediatric Nurse',   date: 'Apr 22, 2026', experience: '7 yrs', status: 'Approved' },
    { name: 'Karan Singh',    role: 'General Nurse',     date: 'Apr 21, 2026', experience: '2 yrs', status: 'Rejected' },
    { name: 'Deepa Nair',     role: 'Wound Care Nurse',  date: 'Apr 20, 2026', experience: '4 yrs', status: 'Approved' }
  ];

  recentActivity = [
    { icon: 'bi-person-check-fill', color: 'act-green', text: 'Anika Joshi approved as Pediatric Nurse',  time: '2h ago' },
    { icon: 'bi-briefcase-fill',    color: 'act-blue',  text: 'New job posted: ICU Specialist (Delhi)',   time: '5h ago' },
    { icon: 'bi-x-circle-fill',     color: 'act-red',   text: 'Karan Singh application rejected',         time: '8h ago' },
    { icon: 'bi-award-fill',        color: 'act-amber', text: 'Credential expiry alert: 3 nurses',        time: '1d ago' }
  ];

  getStatusClass(status: string): string {
    return status === 'Approved' ? 'badge-approved'
         : status === 'Rejected' ? 'badge-rejected'
         : 'badge-pending';
  }
}

import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent {

  org = {
    name:          'Apollo Multi-Specialty Hospital',
    type:          'Multi-Specialty Hospital',
    regNumber:     'MH-HOSP-2018-00412',
    licenseNumber: 'LIC-NMC-2018-7821',
    contactPerson: 'Dr. Rajesh Sharma',
    designation:   'Hospital Administrator',
    email:         'admin@apollomumbai.com',
    phone:         '+91 98765 43210',
    altPhone:      '+91 22 6600 5500',
    address:       '54, Juhu Scheme, Vile Parle West',
    city:          'Mumbai',
    state:         'Maharashtra',
    pincode:       '400056',
    website:       'www.apollomumbai.com',
    established:   '2018',
    bedCapacity:   350,
    status:        'Verified',
    accreditation: 'NABH Accredited',
    specializations: ['Cardiology', 'Neurology', 'Oncology', 'Orthopaedics', 'Paediatrics']
  };

  stats = [
    { icon: 'bi-people-fill',      color: 'si-blue',   value: '48',  label: 'Total Nurses'         },
    { icon: 'bi-briefcase-fill',   color: 'si-green',  value: '12',  label: 'Active Job Posts'     },
    { icon: 'bi-file-person-fill', color: 'si-amber',  value: '7',   label: 'Pending Applications' },
    { icon: 'bi-person-check-fill',color: 'si-purple', value: '5',   label: 'Hires This Month'     }
  ];

  recentApplications = [
    { name: 'Priya Sharma',  role: 'ICU Nurse',        date: 'Apr 24, 2026', experience: '5 yrs', status: 'Pending'  },
    { name: 'Rahul Mehta',   role: 'Home Care Nurse',  date: 'Apr 23, 2026', experience: '3 yrs', status: 'Pending'  },
    { name: 'Anika Joshi',   role: 'Pediatric Nurse',  date: 'Apr 22, 2026', experience: '7 yrs', status: 'Approved' },
    { name: 'Karan Singh',   role: 'General Nurse',    date: 'Apr 21, 2026', experience: '2 yrs', status: 'Rejected' },
    { name: 'Deepa Nair',    role: 'Wound Care Nurse', date: 'Apr 20, 2026', experience: '4 yrs', status: 'Approved' }
  ];

  recentActivity = [
    { icon: 'bi-person-check-fill', color: 'act-green', text: 'Anika Joshi approved as Pediatric Nurse',  time: '2h ago' },
    { icon: 'bi-briefcase-fill',    color: 'act-blue',  text: 'New job posted: ICU Specialist (Mumbai)',  time: '5h ago' },
    { icon: 'bi-x-circle-fill',     color: 'act-red',   text: 'Karan Singh application rejected',         time: '8h ago' },
    { icon: 'bi-award-fill',        color: 'act-amber', text: 'Credential expiry alert: 3 nurses',        time: '1d ago' }
  ];

  getStatusClass(status: string): string {
    return status === 'Approved' ? 'badge-approved'
         : status === 'Rejected' ? 'badge-rejected'
         : 'badge-pending';
  }
}

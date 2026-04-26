import { Component } from '@angular/core';

interface Credential {
  id: number;
  nurseName: string;
  credentialType: string;
  issuedBy: string;
  issuedDate: string;
  expiryDate: string;
  status: 'Verified' | 'Pending' | 'Expired';
}

@Component({
  selector: 'app-credentialing',
  templateUrl: './credentialing.component.html',
  styleUrls: ['./credentialing.component.css']
})
export class CredentialingComponent {

  activeTab: string = 'All';
  tabs = ['All', 'Verified', 'Pending', 'Expired'];

  credentials: Credential[] = [
    { id: 1, nurseName: 'Priya Sharma',  credentialType: 'Registered Nurse License',    issuedBy: 'INC',      issuedDate: 'Jan 2022', expiryDate: 'Jan 2027', status: 'Verified' },
    { id: 2, nurseName: 'Rahul Mehta',   credentialType: 'BLS Certification',           issuedBy: 'AHA',      issuedDate: 'Mar 2024', expiryDate: 'Mar 2026', status: 'Pending'  },
    { id: 3, nurseName: 'Anika Joshi',   credentialType: 'Pediatric Nursing Certificate',issuedBy: 'AIIMS',    issuedDate: 'Jun 2020', expiryDate: 'Jun 2025', status: 'Expired'  },
    { id: 4, nurseName: 'Karan Singh',   credentialType: 'General Nursing Diploma',     issuedBy: 'DU',       issuedDate: 'Aug 2023', expiryDate: 'Aug 2028', status: 'Verified' },
    { id: 5, nurseName: 'Deepa Nair',    credentialType: 'Wound Care Specialist',       issuedBy: 'WOCN',     issuedDate: 'Nov 2021', expiryDate: 'Nov 2026', status: 'Verified' },
    { id: 6, nurseName: 'Sunita Patel',  credentialType: 'Geriatric Care Certificate',  issuedBy: 'NCI',      issuedDate: 'Feb 2023', expiryDate: 'Feb 2026', status: 'Pending'  },
    { id: 7, nurseName: 'Amit Verma',    credentialType: 'Critical Care Nursing',       issuedBy: 'AACN',     issuedDate: 'Oct 2019', expiryDate: 'Oct 2024', status: 'Expired'  }
  ];

  get filteredCredentials(): Credential[] {
    return this.activeTab === 'All'
      ? this.credentials
      : this.credentials.filter(c => c.status === this.activeTab);
  }

  countByStatus(status: string): number {
    return this.credentials.filter(c => c.status === status).length;
  }

  verify(id: number): void {
    const c = this.credentials.find(c => c.id === id);
    if (c) c.status = 'Verified';
  }

  getStatusClass(status: string): string {
    return status === 'Verified' ? 'badge-verified'
         : status === 'Expired'  ? 'badge-expired'
         : 'badge-pending';
  }
}

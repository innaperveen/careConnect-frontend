import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { PaymentService } from '../../../services/payment.service';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.css']
})
export class PaymentsComponent implements OnInit {

  activeTab: 'bank' | 'shifts' | 'salary' | 'earnings' = 'shifts';
  isLoading = true;
  userId!: number;

  // ── Bank details ───────────────────────────────────────────────────────────
  bankForm!: FormGroup;
  isSavingBank = false;
  bankSuccess  = '';
  bankError    = '';
  preferredMode: 'UPI' | 'BANK_TRANSFER' = 'UPI';

  // ── Shift payments (from patients) ────────────────────────────────────────
  shiftPayments: any[] = [];

  // ── Salary payments (from orgs) ───────────────────────────────────────────
  salaryPayments: any[] = [];

  // ── Earnings summary ──────────────────────────────────────────────────────
  totalEarned    = 0;
  pendingAmount  = 0;

  constructor(private auth: AuthService, private fb: FormBuilder, private paymentSvc: PaymentService) {}

  ngOnInit(): void {
    this.userId = this.auth.getUserId()!;
    this.buildBankForm();
    this.loadAll();
  }

  private buildBankForm(): void {
    this.bankForm = this.fb.group({
      preferredPaymentMode: ['UPI', Validators.required],
      upiId:                [''],
      bankAccountNumber:    [''],
      bankIfscCode:         [''],
      bankName:             ['']
    });
    this.bankForm.get('preferredPaymentMode')!.valueChanges.subscribe(v => {
      this.preferredMode = v;
      this.updateBankValidators();
    });
  }

  private updateBankValidators(): void {
    const upi  = this.bankForm.get('upiId')!;
    const acc  = this.bankForm.get('bankAccountNumber')!;
    const ifsc = this.bankForm.get('bankIfscCode')!;
    const name = this.bankForm.get('bankName')!;
    if (this.preferredMode === 'UPI') {
      upi.setValidators([Validators.required]);
      acc.clearValidators(); ifsc.clearValidators(); name.clearValidators();
    } else {
      upi.clearValidators();
      acc.setValidators([Validators.required]);
      ifsc.setValidators([Validators.required, Validators.pattern('^[A-Z]{4}0[A-Z0-9]{6}$')]);
      name.setValidators([Validators.required]);
    }
    [upi, acc, ifsc, name].forEach(c => c.updateValueAndValidity({ emitEvent: false }));
  }

  private loadAll(): void {
    this.isLoading = true;
    this.paymentSvc.getByNurse(this.userId).subscribe({
      next: (payments: any[]) => {
        this.shiftPayments  = (payments || []).filter((p: any) => p.paymentStructure === 'SHIFT');
        this.salaryPayments = (payments || []).filter((p: any) => p.paymentStructure === 'MONTHLY_SALARY');
        this.calcSummary(payments || []);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private calcSummary(payments: any[]): void {
    this.totalEarned = payments
      .filter((p: any) => p.status === 'PROCESSED')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    this.pendingAmount = payments
      .filter((p: any) => p.status === 'PENDING')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  }

  get f() { return this.bankForm.controls; }

  saveBankDetails(): void {
    this.updateBankValidators();
    if (this.bankForm.invalid) { this.bankForm.markAllAsTouched(); return; }
    this.isSavingBank = true;
    this.bankSuccess  = '';
    this.bankError    = '';
    this.paymentSvc.saveBankDetails(this.userId, this.bankForm.value).subscribe({
      next: () => {
        this.isSavingBank = false;
        this.bankSuccess  = 'Bank details saved successfully!';
        setTimeout(() => this.bankSuccess = '', 3000);
      },
      error: (err: Error) => { this.isSavingBank = false; this.bankError = err.message; }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  statusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'PROCESSED': return 'badge-paid';
      case 'PENDING':   return 'badge-pending';
      case 'FAILED':    return 'badge-failed';
      default:          return 'badge-pending';
    }
  }

  statusLabel(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'PROCESSED': return 'Paid';
      case 'PENDING':   return 'Pending';
      case 'FAILED':    return 'Failed';
      default:          return status;
    }
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatAmount(n: number | null): string {
    if (n == null) return '—';
    return '₹' + Number(n).toLocaleString('en-IN');
  }

  parseSalaryField(description: string, key: string): string {
    if (!description) return '0';
    const part = description.split('|').find((p: string) => p.startsWith(key + '='));
    return part ? part.split('=')[1] : '0';
  }

  get netThisMonth(): string {
    const now   = new Date();
    const month = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const total = [...this.shiftPayments, ...this.salaryPayments]
      .filter((p: any) => p.status === 'PROCESSED' && this.formatDate(p.paymentDate).includes(now.getFullYear().toString()))
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    return this.formatAmount(total);
  }

  logout(): void { this.auth.logout(); }
}

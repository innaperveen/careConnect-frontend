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
  isSavingBank   = false;
  bankSuccess    = '';
  bankError      = '';
  preferredMode: 'UPI' | 'BANK_TRANSFER' = 'UPI';
  bankFieldsEnabled = false;   // enabled only after bank name selected

  // ── Shift payments (from patients) ────────────────────────────────────────
  shiftPayments: any[] = [];

  // ── Salary payments (from orgs) ───────────────────────────────────────────
  salaryPayments: any[] = [];

  // ── Earnings summary ──────────────────────────────────────────────────────
  totalEarned   = 0;
  pendingAmount = 0;

  // ── All Indian Banks ──────────────────────────────────────────────────────
  readonly BANK_LIST = [
    // Public Sector
    'State Bank of India (SBI)',
    'Punjab National Bank (PNB)',
    'Bank of Baroda',
    'Canara Bank',
    'Union Bank of India',
    'Bank of India',
    'Central Bank of India',
    'Indian Bank',
    'Indian Overseas Bank',
    'UCO Bank',
    'Bank of Maharashtra',
    'Punjab & Sind Bank',
    'IDBI Bank',
    // Private Sector
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'IndusInd Bank',
    'Yes Bank',
    'IDFC First Bank',
    'Federal Bank',
    'RBL Bank',
    'Bandhan Bank',
    'South Indian Bank',
    'Karnataka Bank',
    'DCB Bank',
    'City Union Bank',
    'Karur Vysya Bank',
    'Tamilnad Mercantile Bank',
    'CSB Bank',
    'Dhanlaxmi Bank',
    'Jammu & Kashmir Bank',
    'Nainital Bank',
    'DBS Bank India',
    // Small Finance Banks
    'AU Small Finance Bank',
    'Equitas Small Finance Bank',
    'Ujjivan Small Finance Bank',
    'Jana Small Finance Bank',
    'Utkarsh Small Finance Bank',
    'ESAF Small Finance Bank',
    'Suryoday Small Finance Bank',
    'Capital Small Finance Bank',
    'Fincare Small Finance Bank',
    // Payments Banks
    'Airtel Payments Bank',
    'India Post Payments Bank (IPPB)',
    'Fino Payments Bank',
    // Foreign Banks
    'Standard Chartered Bank',
    'HSBC India',
    'Deutsche Bank India',
  ].sort();

  constructor(
    private auth:       AuthService,
    private fb:         FormBuilder,
    private paymentSvc: PaymentService
  ) {}

  ngOnInit(): void {
    this.userId = this.auth.getUserId()!;
    this.buildBankForm();
    this.loadAll();
  }

  // ── Form setup ────────────────────────────────────────────────────────────

  private buildBankForm(): void {
    this.bankForm = this.fb.group({
      preferredPaymentMode: ['UPI', Validators.required],
      upiId:                [''],
      bankName:             [''],
      bankAccountNumber:    [{ value: '', disabled: true }],
      bankIfscCode:         [{ value: '', disabled: true }]
    });

    // Mode switch
    this.bankForm.get('preferredPaymentMode')!.valueChanges.subscribe(v => {
      this.preferredMode    = v;
      this.bankFieldsEnabled = false;
      this.bankForm.get('bankName')?.setValue('');
      this.bankForm.get('bankAccountNumber')?.setValue('');
      this.bankForm.get('bankIfscCode')?.setValue('');
      this.disableBankFields();
      this.applyValidators();
    });

    // Bank name → enable fields
    this.bankForm.get('bankName')!.valueChanges.subscribe(val => {
      if (this.preferredMode === 'BANK_TRANSFER') {
        if (val && val.trim()) {
          this.bankFieldsEnabled = true;
          this.enableBankFields();
        } else {
          this.bankFieldsEnabled = false;
          this.disableBankFields();
        }
      }
    });
  }

  private enableBankFields(): void {
    this.bankForm.get('bankAccountNumber')?.enable({ emitEvent: false });
    this.bankForm.get('bankIfscCode')?.enable({ emitEvent: false });
  }

  private disableBankFields(): void {
    this.bankForm.get('bankAccountNumber')?.disable({ emitEvent: false });
    this.bankForm.get('bankIfscCode')?.disable({ emitEvent: false });
  }

  private applyValidators(): void {
    const upi  = this.bankForm.get('upiId')!;
    const name = this.bankForm.get('bankName')!;
    const acc  = this.bankForm.get('bankAccountNumber')!;
    const ifsc = this.bankForm.get('bankIfscCode')!;

    if (this.preferredMode === 'UPI') {
      upi.setValidators([Validators.required]);
      name.clearValidators();
      acc.clearValidators();
      ifsc.clearValidators();
    } else {
      upi.clearValidators();
      name.setValidators([Validators.required]);
      acc.setValidators([
        Validators.required,
        Validators.pattern('^[0-9]{9,18}$')
      ]);
      ifsc.setValidators([
        Validators.required,
        Validators.pattern('^[A-Z]{4}0[A-Z0-9]{6}$')
      ]);
    }
    [upi, name, acc, ifsc].forEach(c => c.updateValueAndValidity({ emitEvent: false }));
  }

  get f() { return this.bankForm.controls; }

  // Block non-digits AND enforce max 18 / min validation on account number
  blockNonDigit(event: KeyboardEvent): boolean {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    const isDigit     = /^[0-9]$/.test(event.key);

    if (!isDigit && !allowedKeys.includes(event.key)) {
      event.preventDefault();
      return false;
    }

    // Hard block at 18 digits — prevent adding more
    if (isDigit) {
      const input = event.target as HTMLInputElement;
      const currentLen = input.value.length;
      const hasSelection = input.selectionStart !== input.selectionEnd;
      if (currentLen >= 18 && !hasSelection) {
        event.preventDefault();
        return false;
      }
    }

    return true;
  }

  // Auto-uppercase IFSC
  uppercaseIfsc(): void {
    const ctrl = this.bankForm.get('bankIfscCode')!;
    const val  = (ctrl.value || '').toUpperCase();
    ctrl.setValue(val, { emitEvent: false });
  }

  get accLen(): number { return (this.bankForm.get('bankAccountNumber')?.value || '').length; }
  get ifscLen(): number { return (this.bankForm.get('bankIfscCode')?.value || '').length; }

  // ── Save ──────────────────────────────────────────────────────────────────

  saveBankDetails(): void {
    this.applyValidators();
    if (this.preferredMode === 'BANK_TRANSFER' && !this.bankFieldsEnabled) {
      this.bankError = 'Please select a bank first.';
      return;
    }
    if (this.bankForm.invalid) { this.bankForm.markAllAsTouched(); return; }

    this.isSavingBank = true;
    this.bankSuccess  = '';
    this.bankError    = '';

    const raw = this.bankForm.getRawValue();
    this.paymentSvc.saveBankDetails(this.userId, raw).subscribe({
      next: () => {
        this.isSavingBank = false;
        this.bankSuccess  = 'Payment details saved successfully!';
        setTimeout(() => this.bankSuccess = '', 3000);
      },
      error: (err: Error) => { this.isSavingBank = false; this.bankError = err.message; }
    });
  }

  // ── Data loading ──────────────────────────────────────────────────────────

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
    this.totalEarned   = payments
      .filter((p: any) => p.status === 'PROCESSED')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    this.pendingAmount = payments
      .filter((p: any) => p.status === 'PENDING')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
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

  logout(): void { this.auth.logout(); }
}

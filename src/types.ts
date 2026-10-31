export interface User {
  id: number
  username: string
  fullName: string
  email?: string
  role: 'administrator' | 'librarian' | 'assistant_librarian'
  permissions: string[]
}

export interface Book {
  id: number
  title: string
  isbn?: string
  author: string
  publisher?: string
  edition?: string
  publication_year?: number
  category_id?: number
  category_name?: string
  language?: string
  shelf_number?: string
  total_copies: number
  available_copies: number
  description?: string
  created_at: string
  updated_at: string
}

export interface BookCopy {
  id: number
  book_id: number
  accession_number: string
  condition: string
  is_available: number
  notes?: string
  borrowed_by?: string
  due_date?: string
  member_code?: string
}

export interface Category {
  id: number
  name: string
  description?: string
}

export interface Member {
  id: number
  member_id: string
  full_name: string
  registration_number?: string
  department?: string
  course?: string
  email?: string
  phone?: string
  membership_type_id?: number
  membership_type_name?: string
  membership_start?: string
  membership_expiry?: string
  status: 'active' | 'suspended' | 'expired' | 'deactivated'
  notes?: string
  active_loans?: number
  pending_fines?: number
  max_books?: number
  loan_days?: number
  created_at: string
}

export interface MembershipType {
  id: number
  name: string
  max_books: number
  loan_days: number
  description?: string
}

export interface IssueTransaction {
  id: number
  member_id: number
  book_copy_id: number
  book_id: number
  issued_by: number
  issue_date: string
  due_date: string
  status: 'active' | 'returned' | 'overdue'
  renewal_count: number
  notes?: string
  // Joined fields
  member_name?: string
  member_code?: string
  department?: string
  title?: string
  author?: string
  accession_number?: string
  overdue_days?: number
}

export interface FineRecord {
  id: number
  issue_id: number
  member_id: number
  amount: number
  overdue_days: number
  status: 'pending' | 'paid' | 'waived'
  waived_reason?: string
  waived_by?: number
  waived_by_name?: string
  created_at: string
  // Joined fields
  member_name?: string
  member_code?: string
  book_title?: string
  accession_number?: string
  issue_date?: string
  due_date?: string
}

export interface DashboardStats {
  totalBooks: number
  totalCopies: number
  availableCopies: number
  issuedCopies: number
  overdueCount: number
  totalMembers: number
  issuedToday: number
  pendingFines: number
  totalFineAmount: number
}

export interface LibrarySetting {
  id: number
  key: string
  value: string
  description?: string
}

export type NavigationPage =
  | 'dashboard'
  | 'books'
  | 'members'
  | 'circulation-issue'
  | 'circulation-return'
  | 'circulation-active'
  | 'fines'
  | 'reports'
  | 'settings'
  | 'settings-users'
  | 'settings-audit'

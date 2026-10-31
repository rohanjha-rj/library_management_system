import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    ipcRenderer.invoke('auth:login', credentials),
  logout: () => ipcRenderer.invoke('auth:logout'),
  changePassword: (data: { userId: number; oldPassword: string; newPassword: string }) =>
    ipcRenderer.invoke('auth:changePassword', data),
  getUsers: () => ipcRenderer.invoke('auth:getUsers'),
  createUser: (data: any) => ipcRenderer.invoke('auth:createUser', data),
  updateUser: (data: any) => ipcRenderer.invoke('auth:updateUser', data),
  deleteUser: (id: number) => ipcRenderer.invoke('auth:deleteUser', id),

  // Books
  getBooks: (params?: any) => ipcRenderer.invoke('books:getAll', params),
  getBook: (id: number) => ipcRenderer.invoke('books:getOne', id),
  createBook: (data: any) => ipcRenderer.invoke('books:create', data),
  updateBook: (data: any) => ipcRenderer.invoke('books:update', data),
  deleteBook: (id: number) => ipcRenderer.invoke('books:delete', id),
  getCategories: () => ipcRenderer.invoke('books:getCategories'),
  createCategory: (name: string) => ipcRenderer.invoke('books:createCategory', name),
  getBookCopies: (bookId: number) => ipcRenderer.invoke('books:getCopies', bookId),
  getBookHistory: (bookId: number) => ipcRenderer.invoke('books:getHistory', bookId),

  // Members
  getMembers: (params?: any) => ipcRenderer.invoke('members:getAll', params),
  getMember: (id: number) => ipcRenderer.invoke('members:getOne', id),
  createMember: (data: any) => ipcRenderer.invoke('members:create', data),
  updateMember: (data: any) => ipcRenderer.invoke('members:update', data),
  deleteMember: (id: number) => ipcRenderer.invoke('members:delete', id),
  getMembershipTypes: () => ipcRenderer.invoke('members:getMembershipTypes'),
  getMemberHistory: (memberId: number) => ipcRenderer.invoke('members:getHistory', memberId),
  getMemberActiveLoans: (memberId: number) => ipcRenderer.invoke('members:getActiveLoans', memberId),

  // Circulation
  issueBook: (data: any) => ipcRenderer.invoke('circulation:issue', data),
  returnBook: (data: any) => ipcRenderer.invoke('circulation:return', data),
  getActiveLoans: (params?: any) => ipcRenderer.invoke('circulation:getActiveLoans', params),
  getLoanById: (id: number) => ipcRenderer.invoke('circulation:getLoanById', id),
  searchLoans: (query: string) => ipcRenderer.invoke('circulation:searchLoans', query),
  renewLoan: (id: number) => ipcRenderer.invoke('circulation:renew', id),

  // Fines
  getFines: (params?: any) => ipcRenderer.invoke('fines:getAll', params),
  payFine: (data: any) => ipcRenderer.invoke('fines:pay', data),
  waiveFine: (data: any) => ipcRenderer.invoke('fines:waive', data),
  getFinePolicy: () => ipcRenderer.invoke('fines:getPolicy'),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('reports:dashboardStats'),
  getRecentTransactions: () => ipcRenderer.invoke('reports:recentTransactions'),
  getOverdueBooks: () => ipcRenderer.invoke('reports:overdueBooks'),
  getUpcomingDues: () => ipcRenderer.invoke('reports:upcomingDues'),
  getMostBorrowed: () => ipcRenderer.invoke('reports:mostBorrowed'),
  getMonthlyStats: () => ipcRenderer.invoke('reports:monthlyStats'),

  // Reports
  getInventoryReport: (params?: any) => ipcRenderer.invoke('reports:inventory', params),
  getIssuedReport: (params?: any) => ipcRenderer.invoke('reports:issued', params),
  getReturnReport: (params?: any) => ipcRenderer.invoke('reports:returns', params),
  getFineReport: (params?: any) => ipcRenderer.invoke('reports:fines', params),
  getMemberReport: (params?: any) => ipcRenderer.invoke('reports:members', params),
  exportReport: (data: any) => ipcRenderer.invoke('reports:export', data),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  updateSettings: (data: any) => ipcRenderer.invoke('settings:update', data),
  backupDatabase: () => ipcRenderer.invoke('settings:backup'),
  resetSampleData: () => ipcRenderer.invoke('settings:resetSampleData'),
  getAuditLogs: (params?: any) => ipcRenderer.invoke('settings:auditLogs', params),
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api

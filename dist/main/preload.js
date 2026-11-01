"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/preload.ts
var preload_exports = {};
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
var api = {
  // Auth
  login: (credentials) => import_electron.ipcRenderer.invoke("auth:login", credentials),
  logout: () => import_electron.ipcRenderer.invoke("auth:logout"),
  changePassword: (data) => import_electron.ipcRenderer.invoke("auth:changePassword", data),
  getUsers: () => import_electron.ipcRenderer.invoke("auth:getUsers"),
  createUser: (data) => import_electron.ipcRenderer.invoke("auth:createUser", data),
  updateUser: (data) => import_electron.ipcRenderer.invoke("auth:updateUser", data),
  deleteUser: (id) => import_electron.ipcRenderer.invoke("auth:deleteUser", id),
  // Books
  getBooks: (params) => import_electron.ipcRenderer.invoke("books:getAll", params),
  getBook: (id) => import_electron.ipcRenderer.invoke("books:getOne", id),
  createBook: (data) => import_electron.ipcRenderer.invoke("books:create", data),
  updateBook: (data) => import_electron.ipcRenderer.invoke("books:update", data),
  deleteBook: (id) => import_electron.ipcRenderer.invoke("books:delete", id),
  getCategories: () => import_electron.ipcRenderer.invoke("books:getCategories"),
  createCategory: (name) => import_electron.ipcRenderer.invoke("books:createCategory", name),
  getBookCopies: (bookId) => import_electron.ipcRenderer.invoke("books:getCopies", bookId),
  getBookHistory: (bookId) => import_electron.ipcRenderer.invoke("books:getHistory", bookId),
  // Members
  getMembers: (params) => import_electron.ipcRenderer.invoke("members:getAll", params),
  getMember: (id) => import_electron.ipcRenderer.invoke("members:getOne", id),
  createMember: (data) => import_electron.ipcRenderer.invoke("members:create", data),
  updateMember: (data) => import_electron.ipcRenderer.invoke("members:update", data),
  deleteMember: (id) => import_electron.ipcRenderer.invoke("members:delete", id),
  getMembershipTypes: () => import_electron.ipcRenderer.invoke("members:getMembershipTypes"),
  getMemberHistory: (memberId) => import_electron.ipcRenderer.invoke("members:getHistory", memberId),
  getMemberActiveLoans: (memberId) => import_electron.ipcRenderer.invoke("members:getActiveLoans", memberId),
  // Circulation
  issueBook: (data) => import_electron.ipcRenderer.invoke("circulation:issue", data),
  returnBook: (data) => import_electron.ipcRenderer.invoke("circulation:return", data),
  getActiveLoans: (params) => import_electron.ipcRenderer.invoke("circulation:getActiveLoans", params),
  getLoanById: (id) => import_electron.ipcRenderer.invoke("circulation:getLoanById", id),
  searchLoans: (query) => import_electron.ipcRenderer.invoke("circulation:searchLoans", query),
  renewLoan: (id) => import_electron.ipcRenderer.invoke("circulation:renew", id),
  // Fines
  getFines: (params) => import_electron.ipcRenderer.invoke("fines:getAll", params),
  payFine: (data) => import_electron.ipcRenderer.invoke("fines:pay", data),
  waiveFine: (data) => import_electron.ipcRenderer.invoke("fines:waive", data),
  getFinePolicy: () => import_electron.ipcRenderer.invoke("fines:getPolicy"),
  // Dashboard
  getDashboardStats: () => import_electron.ipcRenderer.invoke("reports:dashboardStats"),
  getRecentTransactions: () => import_electron.ipcRenderer.invoke("reports:recentTransactions"),
  getOverdueBooks: () => import_electron.ipcRenderer.invoke("reports:overdueBooks"),
  getUpcomingDues: () => import_electron.ipcRenderer.invoke("reports:upcomingDues"),
  getMostBorrowed: () => import_electron.ipcRenderer.invoke("reports:mostBorrowed"),
  getMonthlyStats: () => import_electron.ipcRenderer.invoke("reports:monthlyStats"),
  // Reports
  getInventoryReport: (params) => import_electron.ipcRenderer.invoke("reports:inventory", params),
  getIssuedReport: (params) => import_electron.ipcRenderer.invoke("reports:issued", params),
  getReturnReport: (params) => import_electron.ipcRenderer.invoke("reports:returns", params),
  getFineReport: (params) => import_electron.ipcRenderer.invoke("reports:fines", params),
  getMemberReport: (params) => import_electron.ipcRenderer.invoke("reports:members", params),
  exportReport: (data) => import_electron.ipcRenderer.invoke("reports:export", data),
  // Settings
  getSettings: () => import_electron.ipcRenderer.invoke("settings:getAll"),
  updateSettings: (data) => import_electron.ipcRenderer.invoke("settings:update", data),
  backupDatabase: () => import_electron.ipcRenderer.invoke("settings:backup"),
  resetSampleData: () => import_electron.ipcRenderer.invoke("settings:resetSampleData"),
  getAuditLogs: (params) => import_electron.ipcRenderer.invoke("settings:auditLogs", params),
  // Database Engine Management
  getDbInfo: () => import_electron.ipcRenderer.invoke("db:getInfo"),
  saveDbConfig: (config) => import_electron.ipcRenderer.invoke("db:saveConfig", config),
  testOracleConnection: (config) => import_electron.ipcRenderer.invoke("db:testOracle", config)
};
import_electron.contextBridge.exposeInMainWorld("api", api);

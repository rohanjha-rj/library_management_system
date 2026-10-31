"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCirculationHandlers = registerCirculationHandlers;
function registerCirculationHandlers(ipcMain, db) {
    ipcMain.handle('circulation:issue', async (_event, data) => {
        const issue = db.transaction(() => {
            // Validate member
            const member = db.prepare(`
        SELECT m.*, mt.max_books, mt.loan_days
        FROM members m LEFT JOIN membership_types mt ON m.membership_type_id = mt.id
        WHERE m.id = ?
      `).get(data.member_id);
            if (!member)
                return { success: false, error: 'Member not found' };
            if (member.status !== 'active')
                return { success: false, error: `Member account is ${member.status}` };
            const today = new Date().toISOString().split('T')[0];
            if (member.membership_expiry && member.membership_expiry < today) {
                return { success: false, error: 'Member\'s membership has expired' };
            }
            // Check active loans count
            const activeCount = db.prepare(`
        SELECT COUNT(*) as cnt FROM issue_transactions WHERE member_id = ? AND status IN ('active','overdue')
      `).get(data.member_id).cnt;
            const maxBooks = member.max_books || 3;
            if (activeCount >= maxBooks) {
                return { success: false, error: `Member has reached the maximum borrowing limit of ${maxBooks} books` };
            }
            // Validate book copy
            const copy = db.prepare(`
        SELECT bc.*, b.title, b.author
        FROM book_copies bc JOIN books b ON bc.book_id = b.id
        WHERE bc.id = ?
      `).get(data.book_copy_id);
            if (!copy)
                return { success: false, error: 'Book copy not found' };
            if (!copy.is_available)
                return { success: false, error: 'This book copy is not available' };
            // Check for pending fines
            const pendingFines = db.prepare(`
        SELECT SUM(amount) as total FROM fine_records WHERE member_id = ? AND status = 'pending'
      `).get(data.member_id).total || 0;
            const loanDays = member.loan_days || 14;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + loanDays);
            const dueDateStr = dueDate.toISOString().split('T')[0];
            const r = db.prepare(`
        INSERT INTO issue_transactions (member_id, book_copy_id, book_id, issued_by, issue_date, due_date, status)
        VALUES (?, ?, ?, ?, date('now'), ?, 'active')
      `).run(data.member_id, data.book_copy_id, copy.book_id, data.issued_by, dueDateStr);
            db.prepare('UPDATE book_copies SET is_available = 0 WHERE id = ?').run(data.book_copy_id);
            db.prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?').run(copy.book_id);
            db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'ISSUE_BOOK', 'issue_transaction', ?, ?)`)
                .run(data.issued_by, r.lastInsertRowid, JSON.stringify({ member_id: data.member_id, book_copy_id: data.book_copy_id }));
            return {
                success: true,
                id: r.lastInsertRowid,
                dueDate: dueDateStr,
                bookTitle: copy.title,
                pendingFines
            };
        });
        return issue();
    });
    ipcMain.handle('circulation:return', async (_event, data) => {
        const ret = db.transaction(() => {
            const issue = db.prepare(`
        SELECT it.*, bc.book_id, bc.accession_number, b.title
        FROM issue_transactions it
        JOIN book_copies bc ON it.book_copy_id = bc.id
        JOIN books b ON it.book_id = b.id
        WHERE it.id = ? AND it.status IN ('active','overdue')
      `).get(data.issue_id);
            if (!issue)
                return { success: false, error: 'Loan record not found or already returned' };
            const today = new Date().toISOString().split('T')[0];
            const dueDate = new Date(issue.due_date);
            const returnDate = new Date(today);
            const overdueDays = Math.max(0, Math.floor((returnDate.getTime() - dueDate.getTime()) / 86400000));
            const settings = db.prepare("SELECT value FROM library_settings WHERE key = 'fine_per_day'").get();
            const finePerDay = parseFloat(settings?.value || '2.00');
            const fineAmount = overdueDays * finePerDay;
            db.prepare(`UPDATE issue_transactions SET status = 'returned' WHERE id = ?`).run(issue.id);
            db.prepare('UPDATE book_copies SET is_available = 1 WHERE id = ?').run(issue.book_copy_id);
            db.prepare('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?').run(issue.book_id);
            const ret = db.prepare(`
        INSERT INTO return_transactions (issue_id, member_id, book_copy_id, book_id, returned_by, return_date, overdue_days, condition, notes)
        VALUES (?, ?, ?, ?, ?, date('now'), ?, ?, ?)
      `).run(issue.id, issue.member_id, issue.book_copy_id, issue.book_id, data.returned_by, overdueDays, data.condition || 'Good', data.notes || null);
            let fineId = null;
            if (fineAmount > 0) {
                const existing = db.prepare('SELECT id FROM fine_records WHERE issue_id = ?').get(issue.id);
                if (!existing) {
                    const fr = db.prepare(`
            INSERT INTO fine_records (issue_id, member_id, amount, overdue_days) VALUES (?, ?, ?, ?)
          `).run(issue.id, issue.member_id, fineAmount, overdueDays);
                    fineId = fr.lastInsertRowid;
                }
                else {
                    db.prepare(`UPDATE fine_records SET amount = ?, overdue_days = ?, updated_at = datetime('now') WHERE id = ?`)
                        .run(fineAmount, overdueDays, existing.id);
                    fineId = existing.id;
                }
            }
            return { success: true, overdueDays, fineAmount, fineId, bookTitle: issue.title };
        });
        return ret();
    });
    ipcMain.handle('circulation:getActiveLoans', async (_event, params = {}) => {
        let query = `
      SELECT it.*, m.full_name as member_name, m.member_id as member_code, m.department,
             b.title, b.author, bc.accession_number,
             CASE WHEN date('now') > it.due_date THEN CAST(julianday('now') - julianday(it.due_date) AS INTEGER) ELSE 0 END as overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.status IN ('active','overdue')
    `;
        const args = [];
        if (params.search) {
            query += ` AND (m.full_name LIKE ? OR m.member_id LIKE ? OR b.title LIKE ? OR bc.accession_number LIKE ?)`;
            const s = `%${params.search}%`;
            args.push(s, s, s, s);
        }
        if (params.overdue_only)
            query += ` AND date('now') > it.due_date`;
        const total = db.prepare(`SELECT COUNT(*) as cnt FROM (${query})`).get(...args).cnt;
        const page = params.page || 1;
        const limit = params.limit || 20;
        query += ` ORDER BY it.due_date ASC LIMIT ? OFFSET ?`;
        args.push(limit, (page - 1) * limit);
        return { loans: db.prepare(query).all(...args), total, page, limit };
    });
    ipcMain.handle('circulation:getLoanById', async (_event, id) => {
        return db.prepare(`
      SELECT it.*, m.full_name as member_name, m.member_id as member_code, m.department,
             b.title, b.author, bc.accession_number,
             CASE WHEN date('now') > it.due_date THEN CAST(julianday('now') - julianday(it.due_date) AS INTEGER) ELSE 0 END as overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.id = ?
    `).get(id);
    });
    ipcMain.handle('circulation:searchLoans', async (_event, query) => {
        const s = `%${query}%`;
        return db.prepare(`
      SELECT it.*, m.full_name as member_name, m.member_id as member_code,
             b.title, b.author, bc.accession_number,
             CASE WHEN date('now') > it.due_date THEN CAST(julianday('now') - julianday(it.due_date) AS INTEGER) ELSE 0 END as overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.status IN ('active','overdue')
        AND (m.full_name LIKE ? OR m.member_id LIKE ? OR b.title LIKE ? OR bc.accession_number LIKE ?)
      ORDER BY it.due_date ASC
      LIMIT 20
    `).all(s, s, s, s);
    });
    ipcMain.handle('circulation:renew', async (_event, id) => {
        const loan = db.prepare(`SELECT * FROM issue_transactions WHERE id = ? AND status = 'active'`).get(id);
        if (!loan)
            return { success: false, error: 'Active loan not found' };
        const renewalLimit = parseInt(db.prepare("SELECT value FROM library_settings WHERE key = 'renewal_limit'").get()?.value || '2');
        const renewalDays = parseInt(db.prepare("SELECT value FROM library_settings WHERE key = 'renewal_days'").get()?.value || '7');
        if (loan.renewal_count >= renewalLimit) {
            return { success: false, error: `Renewal limit of ${renewalLimit} reached` };
        }
        const newDueDate = new Date(loan.due_date);
        newDueDate.setDate(newDueDate.getDate() + renewalDays);
        const newDueDateStr = newDueDate.toISOString().split('T')[0];
        db.prepare(`UPDATE issue_transactions SET due_date = ?, renewal_count = renewal_count + 1 WHERE id = ?`)
            .run(newDueDateStr, id);
        return { success: true, newDueDate: newDueDateStr };
    });
}

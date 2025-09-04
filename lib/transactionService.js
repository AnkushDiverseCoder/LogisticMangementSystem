// services/transactionService.js

import { ID, Query } from 'appwrite';
import databaseService from './databaseService';

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DB_ID;
const TRANSACTION_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COL_TRANSACTION;

const TIMEOUT_MS = 10000; // 10 seconds

// Utility: Timeout wrapper
const withTimeout = (promise, timeout = TIMEOUT_MS) => {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), timeout)
        ),
    ]);
};

// Utility: Validate & parse JSON string
const parseTransactionJSON = (jsonString) => {
    try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== 'object') throw new Error();
        return parsed;
    } catch {
        throw new Error('Invalid transaction JSON');
    }
};

// Input validation
const validateTransactionInput = (transaction) => {
    const requiredFields = ['userEmail', 'transaction'];
    const errors = [];

    for (const field of requiredFields) {
        if (!transaction[field] || transaction[field].trim() === '') {
            errors.push(`${field} is required`);
        }
    }

    try {
        const parsed = parseTransactionJSON(transaction.transaction);
        const { type, heading, date, amount, remarks } = parsed;

        if (!['credit', 'debit'].includes(type)) errors.push('Invalid transaction type');
        if (!heading || typeof heading !== 'string') errors.push('Heading is required');
        if (!date || isNaN(Date.parse(date))) errors.push('Invalid date');
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) errors.push('Invalid amount');
        if (!remarks || typeof remarks !== 'string') errors.push('Remarks required');
    } catch (e) {
        errors.push('Transaction must be a valid JSON string',e.message);
    }

    return errors.length ? errors : null;
};

const transactionService = {
    async createTransaction(transactionData) {
        const errors = validateTransactionInput(transactionData);
        if (errors) return { success: false, error: errors.join(', ') };

        try {
            const result = await withTimeout(
                databaseService.createDocument(
                    DATABASE_ID,
                    TRANSACTION_COLLECTION_ID,
                    ID.unique(),
                    transactionData
                )
            );
            return { success: true, data: result };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Transaction creation failed'
            };
        }
    },

    async updateTransaction(documentId, updatedData) {
        const errors = validateTransactionInput(updatedData);
        if (errors) return { success: false, error: errors.join(', ') };

        try {
            const result = await withTimeout(
                databaseService.updateDocument(
                    DATABASE_ID,
                    TRANSACTION_COLLECTION_ID,
                    documentId,
                    updatedData
                )
            );
            return { success: true, data: result };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to update transaction'
            };
        }
    },

    async deleteTransaction(documentId) {
        try {
            await withTimeout(
                databaseService.deleteDocument(
                    DATABASE_ID,
                    TRANSACTION_COLLECTION_ID,
                    documentId
                )
            );
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to delete transaction'
            };
        }
    },

    async getTransactionById(documentId) {
        try {
            const result = await withTimeout(
                databaseService.getDocument(
                    DATABASE_ID,
                    TRANSACTION_COLLECTION_ID,
                    documentId
                )
            );
            return { success: true, data: result };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to fetch transaction'
            };
        }
    },

    async listAllTransactions(userEmail) {
        if (!userEmail || typeof userEmail !== 'string') {
            return { success: false, error: 'Invalid or missing user email' };
        }

        try {
            const result = await withTimeout(
                databaseService.listAllDocuments(
                    DATABASE_ID,
                    TRANSACTION_COLLECTION_ID,
                    [Query.equal('userEmail', userEmail)]
                )
            );
            return { success: true, data: result.data };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to list transactions'
            };
        }
    },

    async calculateBalance(userEmail) {
        if (!userEmail || typeof userEmail !== 'string') {
            return { success: false, error: 'Invalid or missing user email' };
        }

        try {
            const result = await withTimeout(
                databaseService.listAllDocuments(
                    DATABASE_ID,
                    TRANSACTION_COLLECTION_ID,
                    [Query.equal('userEmail', userEmail)]
                )
            );

            if (result.error) {
                return { success: false, error: result.error };
            }

            let balance = 0;
            const transactions = result.data;

            for (const t of transactions) {
                try {
                    const parsed = parseTransactionJSON(t.transaction);
                    const amount = Number(parsed.amount);
                    if (parsed.type === 'credit') balance += amount;
                    if (parsed.type === 'debit') balance -= amount;
                } catch {
                    // Skip malformed entry
                    continue;
                }
            }

            return { success: true, balance, transactions };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Balance calculation failed'
            };
        }
    },
    
        async fetchPaginatedTransactions(userEmail, limit = 10, offset = 0) {
        if (!userEmail || typeof userEmail !== 'string') {
            return { success: false, error: 'Invalid or missing user email' };
        }

        try {
            const result = await withTimeout(
                databaseService.listDocuments(
                    DATABASE_ID,
                    TRANSACTION_COLLECTION_ID,
                    [
                        Query.equal('userEmail', userEmail),
                        Query.limit(limit),
                        Query.offset(offset),
                        Query.orderDesc('$createdAt')
                    ]
                )
            );
            return { success: true, data: result.documents };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to fetch paginated transactions'
            };
        }
    },
    
        async fetchTransactionsByDateRange(userEmail, startDate, endDate) {
        if (!userEmail || !startDate || !endDate) {
            return { success: false, error: 'Missing required parameters' };
        }

        try {
            const result = await withTimeout(
                databaseService.listDocuments(
                    DATABASE_ID,
                    TRANSACTION_COLLECTION_ID,
                    [
                        Query.equal('userEmail', userEmail),
                        Query.greaterThanEqual('$createdAt', new Date(startDate).toISOString()),
                        Query.lessThanEqual('$createdAt', new Date(endDate).toISOString()),
                        Query.orderDesc('$createdAt')
                    ]
                )
            );

            return { success: true, data: result.documents };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to filter transactions by date'
            };
        }
    },
    
        async getGroupedTransactionSummary(userEmail, groupBy = 'month') {
        if (!userEmail || typeof userEmail !== 'string') {
            return { success: false, error: 'Invalid or missing user email' };
        }

        if (!['month', 'year'].includes(groupBy)) {
            return { success: false, error: 'groupBy must be either "month" or "year"' };
        }

        try {
            const result = await withTimeout(
                databaseService.listAllDocuments(
                    DATABASE_ID,
                    TRANSACTION_COLLECTION_ID,
                    [Query.equal('userEmail', userEmail)]
                )
            );

            const grouped = {};

            for (const doc of result.data) {
                try {
                    const parsed = parseTransactionJSON(doc.transaction);
                    const date = new Date(parsed.date);
                    const key = groupBy === 'month'
                        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                        : `${date.getFullYear()}`;

                    if (!grouped[key]) {
                        grouped[key] = { credit: 0, debit: 0, transactions: [] };
                    }

                    if (parsed.type === 'credit') grouped[key].credit += Number(parsed.amount);
                    if (parsed.type === 'debit') grouped[key].debit += Number(parsed.amount);

                    grouped[key].transactions.push({ ...doc, parsed });
                } catch {
                    continue;
                }
            }

            return { success: true, data: grouped };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to group transaction summary'
            };
        }
    },

};

export default transactionService;

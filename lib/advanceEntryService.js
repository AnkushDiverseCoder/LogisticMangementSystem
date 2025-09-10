import { ID, Query } from 'appwrite';
import databaseService from './databaseService';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID;
const ADVANCE_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COL_ADVANCE_ENTRY;

const advanceEntryService = {
    async listEntries(page = 1, limit = 10, search = '') {
        const offset = (page - 1) * limit;
        const queries = [
            Query.offset(offset),
            Query.limit(limit),
            Query.orderDesc('$createdAt'),
        ];

        if (search) {
            queries.push(Query.search('userName', search)); // Optional search by name
        }

        return await databaseService.listDocuments(DATABASE_ID, ADVANCE_COLLECTION_ID, queries);
    },

    async createEntry({ userName, userEmail, oldAdvance, newAdvance, deductions }) {
        const newAdvanceAmount = parseFloat(newAdvance.amount || 0);
        const deductionsAmount = parseFloat(deductions.amount || 0);
        const totalAdvance = parseFloat(oldAdvance) + newAdvanceAmount;
        const balanceDue = totalAdvance - deductionsAmount;

        const data = {
            userName,
            userEmail,
            oldAdvance,
            newAdvance,
            deductions,
            totalAdvance,
            balanceDue
        };

        return await databaseService.createDocument(
            DATABASE_ID,
            ADVANCE_COLLECTION_ID,
            ID.unique(),
            data
        );
    },


    async updateEntry(documentId, { userName, userEmail, oldAdvance, newAdvance, deductions }) {
        const newAdvanceAmount = parseFloat(newAdvance.amount || 0);
        const deductionsAmount = parseFloat(deductions.amount || 0);
        const totalAdvance = parseFloat(oldAdvance) + newAdvanceAmount;
        const balanceDue = totalAdvance - deductionsAmount;

        const data = {
            userName,
            userEmail,
            oldAdvance,
            newAdvance,
            deductions,
            totalAdvance,
            balanceDue
        };

        return await databaseService.updateDocument(
            DATABASE_ID,
            ADVANCE_COLLECTION_ID,
            documentId,
            data
        );
    },

    async deleteEntry(documentId) {
        return await databaseService.deleteDocument(
            DATABASE_ID,
            ADVANCE_COLLECTION_ID,
            documentId
        );
    }
};

export default advanceEntryService;

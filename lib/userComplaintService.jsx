import { ID, Query } from 'appwrite';
import databaseService from './databaseService';

// Environment variables
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID;
const USER_COMPLAINT_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COL_USER_COMPLAINT;

// Simple validation utility
const isValidEmail = (email) =>
    typeof email === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isNonEmptyString = (value) =>
    typeof value === 'string' && value.trim().length > 0;

const isValidISODate = (date) =>
    typeof date === 'string' && !isNaN(Date.parse(date));

const validateComplaintData = (data) => {
    if (!isValidEmail(data.userEmail)) return 'Invalid or missing userEmail';
    if (!isNonEmptyString(data.displayName)) return 'Invalid or missing displayName';
    if (!isValidISODate(data.date)) return 'Invalid or missing date';
    if (!isNonEmptyString(data.reason)) return 'Invalid or missing reason';
    return null;
};

const userComplaintService = {
    // 🔹 List user complaints (paginated, 25 per page)
    async listUserComplaints(page = 1, additionalQueries = []) {
        const limit = 25;
        const offset = (page - 1) * limit;
        const queries = [
            Query.limit(limit),
            Query.offset(offset),
            ...additionalQueries
        ];

        try {
            const res = await databaseService.listAllDocuments(
                DATABASE_ID,
                USER_COMPLAINT_COLLECTION_ID,
                queries
            );
            return { success: true, data: res };
        } catch (error) {
            return { success: false, error: error.message || 'Failed to fetch user complaints' };
        }
    },

    // 🔹 Get a single complaint
    async getUserComplaint(documentId) {
        try {
            const res = await databaseService.getDocument(
                DATABASE_ID,
                USER_COMPLAINT_COLLECTION_ID,
                documentId
            );
            return { success: true, data: res };
        } catch (error) {
            return { success: false, error: error.message || 'Failed to fetch complaint' };
        }
    },
    // 🔹 Get complaints by user email
    async getComplaintsByEmail(userEmail) {
        if (!userEmail || typeof userEmail !== 'string') {
            return { success: false, error: 'Invalid user email' };
        }

        try {
            const res = await databaseService.listAllDocuments(
                DATABASE_ID,
                USER_COMPLAINT_COLLECTION_ID,
                [Query.equal("userEmail", [userEmail])]
            );
            return { success: true, data: res };
        } catch (error) {
            return { success: false, error: error.message || 'Failed to fetch complaints by email' };
        }
    },

    // 🔹 Create a new complaint
    async createUserComplaint(data) {
        const validationError = validateComplaintData(data);
        if (validationError) {
            return { success: false, error: validationError };
        }

        try {
            const res = await databaseService.createDocument(
                DATABASE_ID,
                USER_COMPLAINT_COLLECTION_ID,
                ID.unique(),
                data
            );
            return { success: true, data: res };
        } catch (error) {
            return { success: false, error: error.message || 'Failed to create complaint' };
        }
    },

    // 🔹 Update an existing complaint
    async updateUserComplaint(documentId, data) {
        const validationError = validateComplaintData(data);
        if (validationError) {
            return { success: false, error: validationError };
        }

        try {
            const res = await databaseService.updateDocument(
                DATABASE_ID,
                USER_COMPLAINT_COLLECTION_ID,
                documentId,
                data
            );
            return { success: true, data: res };
        } catch (error) {
            return { success: false, error: error.message || 'Failed to update complaint' };
        }
    },

    // 🔹 Delete a complaint
    async deleteUserComplaint(documentId) {
        try {
            const res = await databaseService.deleteDocument(
                DATABASE_ID,
                USER_COMPLAINT_COLLECTION_ID,
                documentId
            );
            return { success: true, data: res };
        } catch (error) {
            return { success: false, error: error.message || 'Failed to delete complaint' };
        }
    }
};

export default userComplaintService;

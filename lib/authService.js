// services/authService.js

import databaseService from './databaseService';
import { ID, Query } from 'appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID;
const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COL_USERS;
const VALID_LABELS = ['admin', 'employee', 'supervisor'];

const SESSION_KEY = 'currentUser';
const PASSWORD_RESET_DEFAULT = "123456789";

// LocalStorage helpers (safe for Next.js)
const storage = {
    setItem: (key, value) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(value));
        }
    },
    getItem: (key) => {
        if (typeof window !== 'undefined') {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        }
        return null;
    },
    removeItem: (key) => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(key);
        }
    }
};

const authService = {
    async register(username, email, password, labels = [], displayName = '') {
        if (!Array.isArray(labels)) {
            return { error: 'Labels must be an array.' };
        }

        try {
            const userDoc = await databaseService.createDocument(
                DATABASE_ID,
                USERS_COLLECTION_ID,
                ID.unique(),
                {
                    username,
                    email,
                    password,
                    labels: labels.length ? labels : ['employee'],
                    displayName: displayName || username,
                }
            );

            return { success: true, data: userDoc };
        } catch (error) {
            return { error: error.message || 'Registration failed.' };
        }
    },

    async login(username, password) {
        try {
            const result = await databaseService.listDocuments(
                DATABASE_ID,
                USERS_COLLECTION_ID,
                [Query.equal('username', username)]
            );

            if (!result?.documents?.length) {
                return { error: 'Username not found.' };
            }

            const userDoc = result.documents[0];

            if (!userDoc.password || userDoc.password !== password) {
                return { error: 'Invalid password.' };
            }

            // Save to localStorage
            storage.setItem(SESSION_KEY, userDoc);

            return {
                success: true,
                data: userDoc,
                labels: Array.isArray(userDoc.labels) ? userDoc.labels : [],
                username: userDoc.username,
                displayName: userDoc.displayName,
            };
        } catch (error) {
            return { error: error.message || 'Login failed. Please check your credentials.' };
        }
    },

    async getCurrentUser() {
        try {
            const user = storage.getItem(SESSION_KEY);
            return user || null;
        } catch (error) {
            return { error: 'Failed to retrieve session.'+ error.message};
        }
    },

    async logout() {
        try {
            storage.removeItem(SESSION_KEY);
            return { success: true };
        } catch (error) {
            return { error: 'Logout failed.' + error.message };
        }
    },

    async changePassword(documentId, newPassword) {
        try {
            if (!newPassword?.trim() || newPassword.trim().length < 6) {
                return { error: 'Password must be at least 6 characters.' };
            }

            const updated = await databaseService.updateDocument(
                DATABASE_ID,
                USERS_COLLECTION_ID,
                documentId,
                { password: newPassword.trim() }
            );

            return { success: true, data: updated };
        } catch (error) {
            return { error: error.message || 'Failed to update password.' };
        }
    },

    async resetAllUserPasswords(newPassword = PASSWORD_RESET_DEFAULT) {
        try {
            const result = await databaseService.listAllDocuments(DATABASE_ID, USERS_COLLECTION_ID);

            if (result?.error) {
                return { success: false, error: result.error };
            }

            const updates = result.data.map((user) =>
                databaseService.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, user.$id, {
                    password: newPassword,
                })
            );

            await Promise.all(updates);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to reset passwords.',
            };
        }
    },

    async updateUserById(documentId, updates = {}) {
        try {
            const { username, displayName, email, labels, newPassword } = updates;

            const updateFields = {};

            // Check for duplicates
            if (username) {
                const existing = await databaseService.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
                    Query.equal('username', username),
                ]);
                if (existing.documents.length && existing.documents[0].$id !== documentId) {
                    return { success: false, error: 'Username already exists.' };
                }
                updateFields.username = username;
            }

            if (email) {
                const existing = await databaseService.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
                    Query.equal('email', email),
                ]);
                if (existing.documents.length && existing.documents[0].$id !== documentId) {
                    return { success: false, error: 'Email already exists.' };
                }
                updateFields.email = email;
            }

            if (displayName) updateFields.displayName = displayName;
            if (labels && VALID_LABELS.includes(labels)) updateFields.labels = [labels];
            if (newPassword?.trim()) updateFields.password = newPassword.trim();

            if (Object.keys(updateFields).length === 0) {
                return { success: false, error: 'No updates provided.' };
            }

            const updatedDoc = await databaseService.updateDocument(
                DATABASE_ID,
                USERS_COLLECTION_ID,
                documentId,
                updateFields
            );

            return { success: true, data: updatedDoc };
        } catch (error) {
            return { success: false, error: error?.message || 'Failed to update user.' };
        }
    },

    async deleteUserById(documentId) {
        try {
            await databaseService.deleteDocument(DATABASE_ID, USERS_COLLECTION_ID, documentId);
            return { success: true };
        } catch (error) {
            return { error: error.message || 'Failed to delete user.' };
        }
    },

    async fetchAllUsers() {
        try {
            const result = await databaseService.listAllDocuments(DATABASE_ID, USERS_COLLECTION_ID);
            if (result?.error) {
                return { error: result.error };
            }
            return { success: true, data: result.data };
        } catch (error) {
            return { error: error.message || 'Failed to fetch users.' };
        }
    },
    async fetchNonEmployeeUsers() {
        try {
            const res = await this.fetchAllUsers();
            if (!res.success) return { success: false, error: res.error };

            // Filter users where labels does NOT include "employee"
            const filtered = res.data.filter(
                (user) => !user.labels?.includes("employee")
            );

            // Map to username & email only
            const users = filtered.map((user) => ({
                username: user.username,
                email: user.email,
            }));

            return { success: true, data: users };
        } catch (error) {
            return { success: false, error: error.message || "Failed to fetch non-employee users" };
        }
    },

    async fetchUsersPaginated(offset = 0, limit = 20, queries = []) {
        try {
            const res = await databaseService.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
                ...queries,
                ...(queries.find(q => q?.method === 'limit') ? [] : [Query.limit(limit)]),
                ...(queries.find(q => q?.method === 'offset') ? [] : [Query.offset(offset)])
            ]);
            return { success: true, data: res.documents };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async getUserByEmail(email) {
        const response = await databaseService.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
            Query.equal('email', email),
        ]);
        if (response.error || response.documents.length === 0) return null;
        return response.documents[0];
    },

    async getUsersByEmails(emails = []) {
        if (!emails.length) return {};
        const response = await databaseService.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
            Query.equal('email', emails),
        ]);
        if (response.error) return {};
        return Object.fromEntries(response.documents.map(user => [user.email, user]));
    },
};

export default authService;

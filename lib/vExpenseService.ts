import databases from './databaseService';
import { ID, Query } from "appwrite";

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID;
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EXPENSE_COLLECTION_ID;

const vExpenseService = {
    async list() {
        try {
            const res = await databases.listDocuments(DB_ID, COLLECTION_ID, [
                Query.orderDesc("$createdAt"),
            ]);
            return { success: true, data: res };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    async create(payload: any) {
        try {
            const res = await databases.createDocument(
                DB_ID,
                COLLECTION_ID,
                payload,
                ID.unique(),
            );
            return { success: true, data: res };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    async update(id: string, payload: any) {
        try {
            const res = await databases.updateDocument(DB_ID, COLLECTION_ID, id, payload);
            return { success: true, data: res };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    async delete(id: string) {
        try {
            await databases.deleteDocument(DB_ID, COLLECTION_ID, id);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
};

export default vExpenseService;

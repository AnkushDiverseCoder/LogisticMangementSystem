import { ID, Query } from "appwrite";
import databaseService from "./databaseService";

// ==============================
// Env Config
// ==============================
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID as string;
const VDOCUMENTSTATUS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COL_VDOCUMENTSTATUS as string;

// ==============================
// Validation
// ==============================
const isNonEmptyString = (value?: string) =>
    typeof value === "string" && value.trim().length > 0;

const validateVDocumentStatus = (data: any) => {
    if (!isNonEmptyString(data.vehicleNumber)) return "Invalid or missing vehicleNumber";
    if (!isNonEmptyString(data.vehicleType)) return "Invalid or missing vehicleType";
    return null; // required fields passed
};

// ==============================
// Service
// ==============================
const vDocumentStatusService = {
    async list(page = 1, additionalQueries: any[] = []) {
        const limit = 25;
        const offset = (page - 1) * limit;
        const queries = [Query.limit(limit), Query.offset(offset), ...additionalQueries];

        try {
            const res = await databaseService.listAllDocuments(
                DATABASE_ID,
                VDOCUMENTSTATUS_COLLECTION_ID,
                queries
            );
            return { success: true, data: res };
        } catch (error: any) {
            return { success: false, error: error.message || "Failed to fetch documents" };
        }
    },

    async get(documentId: string) {
        try {
            const res = await databaseService.getDocument(
                DATABASE_ID,
                VDOCUMENTSTATUS_COLLECTION_ID,
                documentId
            );
            return { success: true, data: res };
        } catch (error: any) {
            return { success: false, error: error.message || "Failed to fetch document" };
        }
    },

    async create(data: any) {
        const validationError = validateVDocumentStatus(data);
        if (validationError) return { success: false, error: validationError };

        try {
            const res = await databaseService.createDocument(
                DATABASE_ID,
                VDOCUMENTSTATUS_COLLECTION_ID,
                data,
                ID.unique()
            );
            return { success: true, data: res };
        } catch (error: any) {
            return { success: false, error: error.message || "Failed to create document" };
        }
    },

    async update(documentId: string, data: any) {
        const validationError = validateVDocumentStatus(data);
        if (validationError) return { success: false, error: validationError };

        try {
            const res = await databaseService.updateDocument(
                DATABASE_ID,
                VDOCUMENTSTATUS_COLLECTION_ID,
                documentId,
                data
            );
            return { success: true, data: res };
        } catch (error: any) {
            return { success: false, error: error.message || "Failed to update document" };
        }
    },

    async delete(documentId: string) {
        try {
            const res = await databaseService.deleteDocument(
                DATABASE_ID,
                VDOCUMENTSTATUS_COLLECTION_ID,
                documentId
            );
            return { success: true, data: res };
        } catch (error: any) {
            return { success: false, error: error.message || "Failed to delete document" };
        }
    },
};

export default vDocumentStatusService;

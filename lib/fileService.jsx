import { storage, config } from "@/lib/appwrite";
import { ID, Permission, Query, Role } from "appwrite";
import databaseService from "./databaseService";

const BUCKET_ID = config.bucket.userFiles;
const META_COLLECTION_ID = config.col.userfilesmeta;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

const fileService = {
    // Upload a file with public read/write permissions
    async uploadFile(file, user) {
        try {
            if (!file) return { success: false, error: "No file selected" };
            if (file.size > MAX_FILE_SIZE) return { success: false, error: `${file.name} exceeds 1MB` };

            // Upload to Appwrite Storage
            const uploaded = await storage.createFile(
                BUCKET_ID,
                ID.unique(),
                file,
                [Permission.read(Role.any()), Permission.write(Role.any())]
            );

            // Save metadata
            const metaDoc = await databaseService.createDocument(
                config.db,
                META_COLLECTION_ID,
                {
                    fileId: uploaded.$id,
                    userId: user.$id,
                    username: user.username,
                    email: user.email,
                    originalName: file.name,
                    size: file.size,
                }
            );

            if (metaDoc.error) return { success: false, error: metaDoc.error };

            return { success: true, data: { ...uploaded, meta: metaDoc } };
        } catch (error) {
            return { success: false, error: error?.message || "File upload failed" };
        }
    },

    // List all files with optional filters
    async listFiles(filters = {}) {
        try {
            const res = await databaseService.listAllDocuments(config.db, META_COLLECTION_ID);
            if (res.error) return { success: false, error: res.error };

            let docs = res.data || [];

            // Apply filters
            if (filters.userId) docs = docs.filter(d => d.userId === filters.userId);
            if (filters.username) docs = docs.filter(d => d.username?.toLowerCase().includes(filters.username.toLowerCase()));
            if (filters.email) docs = docs.filter(d => d.email?.toLowerCase().includes(filters.email.toLowerCase()));
            if (filters.filename) docs = docs.filter(d => d.originalName?.toLowerCase().includes(filters.filename.toLowerCase()));
            if (filters.startDate) docs = docs.filter(d => new Date(d.$createdAt).getTime() >= new Date(filters.startDate).getTime());
            if (filters.endDate) docs = docs.filter(d => new Date(d.$createdAt).getTime() <= new Date(filters.endDate).getTime());

            return {
                success: true,
                data: docs.map(d => ({
                    ...d,
                    fileId: d.fileId,
                    downloadUrl: `${storage.client.config.endpoint}/storage/buckets/${BUCKET_ID}/files/${d.fileId}/download?project=${storage.client.config.project}`,
                    createdAt: new Date(d.$createdAt).toLocaleString(),
                })),
            };
        } catch (error) {
            return { success: false, error: error?.message || "Failed to list files" };
        }
    },

    // Delete file and metadata safely
    async deleteFile(fileId) {
        try {
            console.log("Deleting fileId:", fileId);

            // Delete from storage (ignore 404)
            try {
                await storage.deleteFile(BUCKET_ID, fileId);
            } catch (err) {
                if (err.code === 404) {
                    console.warn(`File ${fileId} not found in bucket, deleting metadata only.`);
                } else {
                    throw err;
                }
            }

            // Delete metadata using proper Appwrite Query
            const res = await databaseService.listDocuments(config.db, META_COLLECTION_ID, [
                Query.equal("fileId", fileId)
            ]);

            if (res.documents?.length) {
                await databaseService.deleteDocument(config.db, META_COLLECTION_ID, res.documents[0].$id);
                console.log("Metadata deleted for fileId:", fileId);
            } else {
                console.warn("No metadata found for fileId:", fileId);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error?.message || "Failed to delete file" };
        }
    },
};

export default fileService;

// services/fileService.jsx
import { storage, config } from "@/lib/appwrite";
import { ID, Permission, Role } from "appwrite";
import databaseService from "./databaseService";

const BUCKET_ID = config.bucket.userFiles;
const META_COLLECTION_ID = config.col.userfilesmeta;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

const fileService = {
    async uploadFile(file, user) {
        try {
            if (!file) return { success: false, error: "No file selected" };
            if (file.size > MAX_FILE_SIZE) {
                return { success: false, error: `${file.name} exceeds 1MB limit` };
            }

            // Upload file
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

    async listFiles(filters = {}) {
        try {
            const res = await databaseService.listAllDocuments(config.db, META_COLLECTION_ID);
            if (res.error) return { success: false, error: res.error };

            let docs = res.data || [];

            // Client-side filtering
            if (filters.userId) docs = docs.filter(d => d.userId === filters.userId);
            if (filters.username) docs = docs.filter(d => d.username?.toLowerCase().includes(filters.username.toLowerCase()));
            if (filters.email) docs = docs.filter(d => d.email?.toLowerCase().includes(filters.email.toLowerCase()));
            if (filters.filename) docs = docs.filter(d => d.originalName?.toLowerCase().includes(filters.filename.toLowerCase()));

            if (filters.startDate) {
                const start = new Date(filters.startDate).getTime();
                docs = docs.filter(d => new Date(d.$createdAt).getTime() >= start);
            }
            if (filters.endDate) {
                const end = new Date(filters.endDate).getTime();
                docs = docs.filter(d => new Date(d.$createdAt).getTime() <= end);
            }

            return {
                success: true,
                data: docs.map(d => ({
                    ...d,
                    downloadUrl: storage.getFileDownload(BUCKET_ID, d.fileId), // <-- correct Appwrite SDK download
                    createdAt: new Date(d.$createdAt).toLocaleString(),
                })),
            };
        } catch (error) {
            return { success: false, error: error?.message || "Failed to list files" };
        }
    },

    async deleteFile(fileId) {
        try {
            await storage.deleteFile(BUCKET_ID, fileId);

            const res = await databaseService.listDocuments(config.db, META_COLLECTION_ID, [
                { method: "equal", key: "fileId", value: fileId },
            ]);

            if (res.documents?.length) {
                await databaseService.deleteDocument(config.db, META_COLLECTION_ID, res.documents[0].$id);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error?.message || "Failed to delete file" };
        }
    },
};

export default fileService;

import { ID, Query } from "appwrite";
import { storage } from "@/lib/appwrite";
import databaseService from "./databaseService";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID;
const DRIVER_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COL_DRIVER_DETAILS;
const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_DRIVER_DOCS;

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

async function uploadSingleFile(file) {
    if (!file) return null;
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`${file.name} exceeds 1MB`);
    }
    const uploaded = await storage.createFile(BUCKET_ID, ID.unique(), file);
    return `${storage.client.config.endpoint}/storage/buckets/${BUCKET_ID}/files/${uploaded.$id}/download?project=${storage.client.config.project}`;
}

const driverService = {
    async listDrivers(page = 1) {
        try {
            const limit = 25;
            const offset = (page - 1) * limit;
            const res = await databaseService.listAllDocuments(
                DATABASE_ID,
                DRIVER_COLLECTION_ID,
                [Query.limit(limit), Query.offset(offset)]
            );
            return { success: true, data: res.data || [] };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async createDriver(data, licenseFile, aadhaarFile, photoFile) {
        try {
            const [licenseUrl, aadhaarUrl, photoUrl] = await Promise.all([
                uploadSingleFile(licenseFile),
                uploadSingleFile(aadhaarFile),
                uploadSingleFile(photoFile),
            ]);

            const driverData = {
                ...data,
                contactNo: data.contactNo ? parseInt(data.contactNo) : null,
                emergencyContactNo: data.emergencyContactNo
                    ? parseInt(data.emergencyContactNo)
                    : null,
                licenseFile: licenseUrl || "",
                aadhaarFile: aadhaarUrl || "",
                photoFile: photoUrl || "",
            };

            const res = await databaseService.createDocument(
                DATABASE_ID,
                DRIVER_COLLECTION_ID,
                driverData,
                ID.unique()
            );

            return { success: true, data: res };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async updateDriver(documentId, data, licenseFile, aadhaarFile, photoFile) {
        try {
            const [licenseUrl, aadhaarUrl, photoUrl] = await Promise.all([
                licenseFile ? uploadSingleFile(licenseFile) : null,
                aadhaarFile ? uploadSingleFile(aadhaarFile) : null,
                photoFile ? uploadSingleFile(photoFile) : null,
            ]);

            const updateData = {
                ...data,
                contactNo: data.contactNo ? parseInt(data.contactNo) : null,
                emergencyContactNo: data.emergencyContactNo
                    ? parseInt(data.emergencyContactNo)
                    : null,
                ...(licenseUrl && { licenseFile: licenseUrl }),
                ...(aadhaarUrl && { aadhaarFile: aadhaarUrl }),
                ...(photoUrl && { photoFile: photoUrl }),
            };

            const res = await databaseService.updateDocument(
                DATABASE_ID,
                DRIVER_COLLECTION_ID,
                documentId,
                updateData
            );

            return { success: true, data: res };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async deleteDriver(documentId) {
        try {
            const res = await databaseService.deleteDocument(
                DATABASE_ID,
                DRIVER_COLLECTION_ID,
                documentId
            );
            return { success: true, data: res };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async downloadFile(url) {
        try {
            window.open(url, "_blank");
        } catch (error) {
            console.error("Download error", error);
        }
    },

    async downloadAllFiles(driver) {
        try {
            const files = [
                { url: driver.licenseFile, name: "license.pdf" },
                { url: driver.aadhaarFile, name: "aadhaar.pdf" },
                { url: driver.photoFile, name: "photo.jpg" },
            ].filter(f => f.url);

            if (files.length === 0) {
                throw new Error("No files available for this driver");
            }

            const zip = new JSZip();

            // fetch all files and add to zip
            await Promise.all(
                files.map(async f => {
                    const res = await fetch(f.url);
                    if (!res.ok) throw new Error(`Failed to fetch ${f.name}`);
                    const blob = await res.blob();
                    zip.file(f.name, blob);
                })
            );

            // generate the zip and trigger download
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${driver.name || "driver"}_documents.zip`);
        } catch (error) {
            console.error("Batch download error", error);
        }
    }
};

export default driverService;

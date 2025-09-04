// services/vehicleService.ts

import { ID } from 'appwrite';
import databaseService from './databaseService';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID as string;
const VEHICLE_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COL_VEHICLE_ENTRY as string;

export type Vehicle = {
    $id: string;
    vehicleNumber: string;
    vehicleType: string;
    driverName?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any;
};

const vehicleService = {
    /**
     * Get all vehicles
     * @param queries Optional Appwrite queries
     */
    async listVehicles(queries: any[] = []) {
        try {
            const res = await databaseService.listAllDocuments(DATABASE_ID, VEHICLE_COLLECTION_ID, queries);
            return { success: true, data: res };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to fetch vehicles' };
        }
    },

    /**
     * Get a single vehicle by document ID
     */
    async getVehicle(documentId: string) {
        try {
            const res = await databaseService.getDocument(DATABASE_ID, VEHICLE_COLLECTION_ID, documentId);
            return { success: true, data: res };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to fetch vehicle' };
        }
    },

    /**
     * Create a new vehicle
     */
    async createVehicle(data: Partial<Vehicle>) {
        try {
            const res = await databaseService.createDocument(DATABASE_ID, VEHICLE_COLLECTION_ID, ID.unique(), data);
            return { success: true, data: res };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to create vehicle' };
        }
    },

    /**
     * Update a vehicle by document ID
     */
    async updateVehicle(documentId: string, data: Partial<Vehicle>) {
        try {
            const res = await databaseService.updateDocument(DATABASE_ID, VEHICLE_COLLECTION_ID, documentId, data);
            return { success: true, data: res };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to update vehicle' };
        }
    },

    /**
     * Delete a vehicle by document ID
     */
    async deleteVehicle(documentId: string) {
        try {
            const res = await databaseService.deleteDocument(DATABASE_ID, VEHICLE_COLLECTION_ID, documentId);
            return { success: true, data: res };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to delete vehicle' };
        }
    },
};

export default vehicleService;
